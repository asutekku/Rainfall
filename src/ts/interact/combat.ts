import {Actor} from "../actors/Actor";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {GetItem} from "./getItem";
import {Messages} from "./messages";
import {DeathMessage, DodgeMessage, IDefaultMessage, MessageStr} from "./messageSchema";
import {Skill} from "../items/Skill";
import {rangeDV} from "./rangeTable";
import {Check} from "./check";

const Log = en_US.Log;

export class Combat {
    private static messages: any = [];

    /**
     * One exchange between two combatants, resolved by Cyberpunk RED order:
     * Initiative decides who acts first; a Mortally Wounded combatant makes a
     * Death Save instead of acting; otherwise it attacks its foe.
     */
    public static basicAction(actor: Actor, target: Actor, skill: Skill): any {
        this.messages = [];
        if (!actor.canFight() && !actor.mortallyWounded) {
            this.messages.unshift(new MessageStr('That character is out of the fight.'));
            return this.messages.flat().reverse();
        }
        const order: Actor[] = actor.rollInitiative() >= target.rollInitiative()
            ? [actor, target] : [target, actor];
        for (const combatant of order) {
            const foe: Actor = combatant === actor ? target : actor;
            if (combatant.mortallyWounded) {
                this.resolveDeathSave(combatant);
                continue;
            }
            if (combatant.canFight() && foe.canFight()) {
                this.attack(combatant, foe);
            }
        }
        return this.messages.flat().reverse();
    }

    public static attack(actor: Actor, target: Actor): any {
        const weapon = actor.weapon;
        const distance: number = Utils.distance(actor.position, target.position);
        if (weapon.autofire && weapon.weaponClass !== "melee") {
            this.autofireAttack(actor, target, distance);
            return;
        }
        const targetOldHP: number = target.health;
        if (!this.didAttackHit(actor, target, distance)) {
            this.messages.push(new MessageStr('MISS!'));
            return;
        }
        let damage: number = weapon.getDamage();
        if (damage > 0) {
            damage += actor.damageBonus(); // Solo "Spot Weakness"
            if (weapon.weaponClass === "melee") {
                // Cyberlimb melee weapons (Wolvers etc.) add extra d6.
                for (let i = 0; i < actor.cyberMeleeDice(); i++) {
                    damage += Math.floor(Math.random() * 6) + 1;
                }
            }
        }
        const dealt: number = target.receiveDamage(damage, weapon.ap);
        this.messages.push(Messages.getCombatMessage(actor, target, targetOldHP, dealt));
        this.registerIfDefeated(actor, target);
    }

    /**
     * RED autofire: a single Autofire check; on a hit, damage is 2d6 multiplied
     * by the amount the check beat the DV, capped by the weapon's autofire
     * rating (x3 for SMGs, x4 for assault rifles). Both dice reading 6 is a
     * Critical Injury (+5 damage).
     */
    private static autofireAttack(actor: Actor, target: Actor, distance: number): void {
        const dv: number | null = rangeDV(actor.weapon.weaponClass, distance);
        if (dv === null) {
            this.messages.push(new MessageStr('OUT OF RANGE'));
            return;
        }
        const check = Check.resolve(actor, actor.attackBonus(actor.weapon), dv);
        if (!check.success) {
            this.messages.push(new MessageStr('MISS!'));
            return;
        }
        const maxMultiplier: number = actor.weapon.weaponClass === "rifle" ? 4 : 3;
        const multiplier: number = Math.max(1, Math.min(check.margin, maxMultiplier));
        const d1: number = Math.floor(Math.random() * 6) + 1;
        const d2: number = Math.floor(Math.random() * 6) + 1;
        let damage: number = (d1 + d2) * multiplier + actor.damageBonus();
        if (d1 === 6 && d2 === 6) {
            damage += 5; // Critical Injury
        }
        const targetOldHP: number = target.health;
        const dealt: number = target.receiveDamage(damage, actor.weapon.ap);
        this.messages.push(Messages.getCombatMessage(actor, target, targetOldHP, dealt));
        this.registerIfDefeated(actor, target);
    }

    /**
     * RED Suppressive Fire: spend an action and 10 rounds; every target rolls
     * WILL + Concentration against the shooter's REF + Autofire. Failures are
     * pinned (must take cover). Returns the pinned targets. Provided for the
     * action system; the 1v1 auto-battle doesn't use it (needs positioning).
     */
    public static suppressiveFire(actor: Actor, targets: Actor[]): Actor[] {
        const atkMod: number = actor.stats.ref + actor.skillFor(actor.weapon);
        return targets.filter((t) => Check.opposed(actor, atkMod, t.stats.will).success);
    }

    public static dodgeAttack(actor: Actor, target: Actor): IDefaultMessage {
        return new DodgeMessage(actor, target);
    }

    // Melee only!
    public static parryAttack(actor: Actor, target: Actor) {
    }

    public static escapeFight(actor: Actor, target: Actor) {
    }

    public static mountVehicle(actor: Actor, target: Actor) {
    }

    public static reloadWeapon(actor: Actor, target: Actor) {
    }

    public static aidActor(actor: Actor, amount: number) {
        actor.health = Math.min(actor.maxHealth, actor.health + amount);
    }

    public static gainLevel(actor: Actor, target: Actor) {
        actor.gainLevel();
        Messages.logMessage(Log.levelUp, actor);
    }

    public static lootEnemy(actor: Actor, target: Actor) {
        Messages.logMessage(Log.loot.search1, actor);
        Messages.logMessage(Log.loot.find, actor);
        GetItem.addItemToInventory(target.item, actor);
        GetItem.updateCurrency(target.currency, actor);
    }

    /** Award the kill/XP/loot when an attack takes the target out of the fight. */
    private static registerIfDefeated(actor: Actor, target: Actor): void {
        if (!target.canFight()) {
            actor.kills += 1;
            actor.experience += target.experience;
            if (actor.experience >= actor.maxExperience) {
                Combat.gainLevel(actor, target);
            }
            this.messages.push(new DeathMessage(target, actor));
        }
    }

    private static resolveDeathSave(actor: Actor): void {
        if (actor.deathSave()) {
            this.messages.push(new MessageStr(`${actor.name} clings to life.`));
        } else {
            this.messages.push(new DeathMessage(actor, actor));
        }
    }

    /**
     * Cyberpunk RED attack resolution. Melee is an opposed check against the
     * target's evasion; ranged compares the attack roll to the weapon's DV for
     * its class at the current distance (out of range = automatic miss).
     */
    private static didAttackHit(actor: Actor, target: Actor, distance: number): boolean {
        const weapon = actor.weapon;
        const atkMod: number = actor.attackBonus(weapon);
        if (weapon.weaponClass === "melee") {
            return Check.opposed(actor, atkMod, target.evasion()).success;
        }
        const dv: number | null = rangeDV(weapon.weaponClass, distance);
        if (dv === null) {
            return false; // target beyond the weapon's effective range
        }
        return Check.resolve(actor, atkMod, dv).success;
    }
}
