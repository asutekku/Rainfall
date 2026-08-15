import {Actor} from "../actors/Actor";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {GetItem} from "./getItem";
import {Messages} from "./messages";
import {DeathMessage, DodgeMessage, IDefaultMessage, MessageStr} from "./messageSchema";
import {Skill} from "../items/Skill";
import {rangeDV} from "./rangeTable";
import {Check} from "./check";
import {Battlefield} from "./battlefield";
import {TacticalAI, Plan} from "./tacticalAI";
import {Economy} from "./economy";

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
        // Reset per-round Combat Awareness trackers (first hit, deflection).
        actor.firstHitDone = false; actor.deflectionUsed = false;
        target.firstHitDone = false; target.deflectionUsed = false;
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

    /** Lightweight telemetry for balancing (read + reset by the headless sim). */
    public static stats = {shots: 0, hits: 0, aimed: 0, dmg: 0};

    public static attack(actor: Actor, target: Actor, aimed: boolean = false): any {
        const weapon = actor.weapon;
        const distance: number = Utils.distance(actor.position, target.position);
        if (weapon.autofire && weapon.weaponClass !== "melee") {
            this.autofireAttack(actor, target, distance);   // RED: autofire can't make an Aimed Shot
            return;
        }
        this.stats.shots += 1; if (aimed) { this.stats.aimed += 1; }
        const targetOldHP: number = target.health;
        if (!this.didAttackHit(actor, target, distance, aimed)) {
            this.messages.push(new MessageStr(aimed ? 'MISS! (aimed)' : 'MISS!'));
            return;
        }
        this.stats.hits += 1;
        let damage: number = weapon.getDamage();
        if (damage > 0) {
            damage += this.spotWeakness(actor);   // Solo "Spot Weakness" (first hit only)
            damage += actor.backupDamage();        // Cop "Backup" support fire
        }
        const dealt: number = target.receiveDamage(damage, weapon.ap, aimed);
        this.stats.dmg += dealt;
        this.messages.push(Messages.getCombatMessage(actor, target, targetOldHP, dealt));
        if (aimed && dealt > 0) { this.messages.push(new MessageStr(`${actor.name} lands a head shot!`)); }
        this.registerIfDefeated(actor, target);
    }

    /** RED Combat Awareness "Spot Weakness": bonus damage on the round's first hit. */
    private static spotWeakness(actor: Actor): number {
        if (actor.firstHitDone) {
            return 0;
        }
        actor.firstHitDone = true;
        return actor.spotWeaknessBonus();
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
        const cover: number = Battlefield.coverPenaltyAt(target.position, actor.position);
        this.stats.shots += 1;
        const check = Check.resolve(actor, actor.attackBonus(actor.weapon), dv + cover);
        if (!check.success) {
            this.messages.push(new MessageStr('MISS!'));
            return;
        }
        this.stats.hits += 1;
        const maxMultiplier: number = actor.weapon.weaponClass === "rifle" ? 4 : 3;
        const multiplier: number = Math.max(1, Math.min(check.margin, maxMultiplier));
        const d1: number = Math.floor(Math.random() * 6) + 1;
        const d2: number = Math.floor(Math.random() * 6) + 1;
        let damage: number = (d1 + d2) * multiplier + this.spotWeakness(actor);
        if (d1 === 6 && d2 === 6) {
            damage += 5; // Critical Injury
        }
        const targetOldHP: number = target.health;
        const dealt: number = target.receiveDamage(damage, actor.weapon.ap);
        this.stats.dmg += dealt;
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
        // Push straight to the combat feed. The legacy Messages.logMessage path
        // reads global State.player/currentEnemy singletons that the React app
        // never sets, so calling it mid-round would throw.
        this.messages.push(new MessageStr(`${actor.name} reaches level ${actor.level}.`));
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
            const eddies: number = Economy.loot(actor, target);   // eddies fund the gear economy
            if (actor.experience >= actor.maxExperience) {
                Combat.gainLevel(actor, target);
            }
            this.messages.push(new DeathMessage(target, actor));
            if (eddies > 0) { this.messages.push(new MessageStr(`${actor.name} loots ${eddies}¥.`)); }
            Economy.scavenge(actor, target).forEach((m) => this.messages.push(new MessageStr(m)));
        }
    }

    private static resolveDeathSave(actor: Actor): void {
        if (actor.deathSave()) {
            this.messages.push(new MessageStr(`${actor.name} clings to life.`));
        } else {
            this.messages.push(new MessageStr(`${actor.name} flatlines.`));
        }
    }

    /**
     * Cyberpunk RED attack resolution. Melee is an opposed check against the
     * target's evasion; ranged compares the attack roll to the weapon's DV for
     * its class at the current distance (out of range = automatic miss).
     */
    private static didAttackHit(actor: Actor, target: Actor, distance: number, aimed: boolean = false): boolean {
        const weapon = actor.weapon;
        const atkMod: number = actor.attackBonus(weapon) + (aimed ? -8 : 0);   // RED Aimed Shot: -8 to hit
        if (weapon.weaponClass === "melee") {
            return Check.opposed(actor, atkMod, target.evasion()).success;
        }
        const dv: number | null = rangeDV(weapon.weaponClass, distance);
        if (dv === null) {
            return false; // target beyond the weapon's effective range
        }
        const cover: number = Battlefield.coverPenaltyAt(target.position, actor.position);
        return Check.resolve(actor, atkMod, dv + cover).success;
    }

    // =====================================================================
    // Turn engine: movement + AI. A round advances every combatant in
    // initiative order; each moves (via TacticalAI) then acts.
    // =====================================================================

    /** One full round with both sides played by the tactical AI. */
    public static autoRound(party: Actor[], enemies: Actor[]): any {
        return this.round(party, enemies);
    }

    /**
     * One full round. If `controlled`/`action` are given, that unit performs the
     * supplied action on its turn (manual play); every other combatant — allies
     * and enemies alike — is driven by the tactical AI.
     */
    public static round(party: Actor[], enemies: Actor[], controlled?: Actor, action?: any): any {
        this.messages = [];
        const all: Actor[] = [...party, ...enemies].filter((a) => a.canFight() || a.mortallyWounded);
        all.forEach((a) => { a.firstHitDone = false; a.deflectionUsed = false; });

        const order: Actor[] = all
            .map((a) => ({a, init: a.rollInitiative()}))
            .sort((x, y) => y.init - x.init)
            .map((o) => o.a);

        for (const c of order) {
            if (!c.alive) { continue; }
            if (c.mortallyWounded) { this.resolveDeathSave(c); continue; }
            if (!c.canFight()) { continue; }
            const foes: Actor[] = party.indexOf(c) >= 0 ? enemies : party;
            const allies: Actor[] = party.indexOf(c) >= 0 ? party : enemies;
            const others: Actor[] = [...party, ...enemies].filter((a) => a !== c);
            if (c === controlled && action) {
                // Manual turn: apply the player's move + attack the same way an AI plan is applied.
                this.applyPlan(c, {moveTo: action.moveTo, target: action.target, aimed: action.aimed, label: "manual"}, foes, others);
                continue;
            }
            this.applyPlan(c, TacticalAI.plan(c, allies, foes), foes, others);
        }
        return this.messages.flat().reverse();
    }

    /** Apply a tactical plan: move (if any), then attack the chosen target. */
    private static applyPlan(self: Actor, plan: Plan, foes: Actor[], others: Actor[]): void {
        if (plan.moveTo) {
            const before: number = this.nearestFoeGap(self, foes);
            const moved: number = Battlefield.stepToward(self, plan.moveTo, self.runMeters(), others);
            if (moved >= 1) {
                const after: number = this.nearestFoeGap(self, foes);
                const verb: string = Battlefield.nearCover(self.position) ? "takes cover"
                    : after < before - 0.5 ? "advances" : after > before + 0.5 ? "falls back" : "repositions";
                this.messages.push(new MessageStr(`${self.name} ${verb} (${Math.round(after)}m).`));
            }
        }
        if (plan.target && plan.target.canFight()) {
            this.attack(self, plan.target, plan.aimed);
        }
    }

    private static nearestFoeGap(self: Actor, foes: Actor[]): number {
        return foes.filter((f) => f.canFight())
            .reduce((m, f) => Math.min(m, Battlefield.distance(self, f)), Infinity);
    }
}
