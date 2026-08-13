import {Actor} from "../actors/Actor";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {GetItem} from "./getItem";
import {Messages} from "./messages";
import {DeathMessage, DodgeMessage, IDefaultMessage, MessageStr} from "./messageSchema";
import {Skill} from "../items/Skill";
import {rangeDV} from "./rangeTable";

const Log = en_US.Log;

export class Combat {
    private static messages: any = [];

    public static basicAction(actor: Actor, target: Actor, skill: Skill): any {
        this.messages = [];
        if (actor.isAlive()) {
            // Actor attacks the target
            this.attack(actor, target);
            //Checks if the target is alive to initiate target's turn
            if (target.isAlive()) {
                //Target attacks the attacker
                this.attack(target, actor);
            }
        } else {
            // Inform the player that the character is dead
            // Player can't do anything with a dead character
            this.messages.unshift(new MessageStr('That character is dead.'));
        }
        // Returns messages to the react component
        return this.messages.flat().reverse();
    }

    public static attack(actor: Actor, target: Actor): any {
        const distance: number = Utils.distance(actor.position, target.position);
        const hitSuccess: boolean = this.didAttackHit(actor, target, distance);
        const targetOldHP: number = target.health;
        const weaponDamage: number = actor.weapon.getDamage();

        if (hitSuccess) {
            const damageCaused: number = target.receiveDamage(weaponDamage, actor.weapon.ap);
            const combatMessage = Messages.getCombatMessage(actor, target, targetOldHP, damageCaused);
            this.messages.push(combatMessage);
            if (!target.isAlive()) {
                actor.kills += 1;
                actor.experience += target.experience;
                if (actor.experience >= actor.maxExperience) {
                    Combat.gainLevel(actor, target);
                }
                const deathMessage = new DeathMessage(target, actor);
                this.messages.push(deathMessage);
            }
        } else {
            const messageMiss = new MessageStr('MISS!');
            this.messages.push(messageMiss);
        }
    }

    public static dodgeAttack(actor: Actor, target: Actor): IDefaultMessage {
        return new DodgeMessage(actor, target);
        //Movement.moveTo(actor, target.position, actor.stats.ma.ma);
    }

    // static attack(actor: Actor, target: Actor, multiplier: number): void {
    //     const def = target.armor != 0 ? 1 - target.armor / 100 : 1;
    //     target.health -= actor.weapon.getDamage() * def * multiplier;
    // }

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

    /**
     * Cyberpunk RED d10: on a natural 10 roll again and add; on a natural 1
     * roll again and subtract.
     */
    private static critRoll(): number {
        const first: number = Math.floor(Math.random() * 10) + 1;
        if (first === 10) {
            return 10 + (Math.floor(Math.random() * 10) + 1);
        }
        if (first === 1) {
            return 1 - (Math.floor(Math.random() * 10) + 1);
        }
        return first;
    }

    /**
     * Cyberpunk RED attack resolution. Melee is an opposed check against the
     * target's evasion; ranged compares the attack roll to the weapon's DV for
     * its class at the current distance (out of range = automatic miss).
     */
    private static didAttackHit(actor: Actor, target: Actor, distance: number): boolean {
        const weapon = actor.weapon;
        const attack: number = this.critRoll() + actor.attackBonus(weapon);
        if (weapon.weaponClass === "melee") {
            return attack >= this.critRoll() + target.evasion();
        }
        const dv: number | null = rangeDV(weapon.weaponClass, distance);
        if (dv === null) {
            return false; // target beyond the weapon's effective range
        }
        return attack >= dv;
    }
}
