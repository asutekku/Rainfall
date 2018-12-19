import {Actor} from "../actors/Actor";
import {State} from "../utils/State";
import {UI} from "../utils/UI";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {GetItem} from "./getItem";
import {Messages} from "./messages";
import {DeathMessage, DodgeMessage, IDefaultMessage, MessageStr} from "./messageSchema";
import {Movement} from "./Movement";

const Log = en_US.Log;

export class Combat {

    public static basicAction(actor: Actor, target: Actor): void {
        let message = new MessageStr('yo');
        return this.attack(actor, target);
        if (!target.isAlive()) {
            // Combat.killEnemy(actor, target);
        } else {
            return this.attack(target, actor);
            // this.isAlive(target);
        }
        //UI.updateUI();
    }

    public static isAlive(actor: Actor): void {
        if (!actor.isAlive()) {
            actor.health = 0;
            Messages.logMessage(Log.death, actor);
        }
    }

    public static attack(actor: Actor, target: Actor): any {
        const distance: number = Utils.distance(actor.position, target.position);
        const dices: number = actor.stats.ref + Utils.dice(3, 10);
        const hitSuccess: boolean = this.didAttackHit(distance, dices, actor);
        const messages = [];
        const targetOldHP: number = target.health;
        const damageCaused: number = this.getDamage(actor, target);
        if (hitSuccess) {
            if (targetOldHP > damageCaused) {
                target.health -= damageCaused;
                messages.unshift(Messages.getCombatMessage(actor, target, targetOldHP));
            } else {
                target.health = 0;
                messages.unshift(Messages.getCombatMessage(actor, target, targetOldHP));
                messages.unshift(new DeathMessage(target, actor));
            }
        } else {
            messages.unshift(this.dodgeAttack(actor, target));
        }
        return messages;
    }

    public static dodgeAttack(actor: Actor, target: Actor): IDefaultMessage {
        return new DodgeMessage(actor, target);
        //Movement.moveTo(actor, target.position, actor.stats.ma.ma);
    }

    // static attack(actor: Actor, target: Actor, multiplier: number): void {
    //     const def = target.armor != 0 ? 1 - target.armor / 100 : 1;
    //     target.health -= actor.weapon.getDamage() * def * multiplier;
    // }

    private static getDamage(actor: Actor, target: Actor): number {
        let damage: number = actor.weapon.getDamage();
        const eq = target.equipment;
        const headSP: number = eq.headgear ? eq.headgear.stoppingPower : 0;
        const armsSP: number = eq.arms ? eq.arms.stoppingPower : 0;
        const feetSP: number = eq.feet ? eq.feet.stoppingPower : 0;
        const lowerSP: number = eq.lower ? eq.lower.stoppingPower : 0;
        const upperSP: number = eq.upper ? eq.upper.stoppingPower : 0;
        const SP: number[] = [headSP, armsSP, feetSP, lowerSP, upperSP];
        damage -= SP.reduce((acc: number, c: number) => acc + c);
        return damage;
    }

    // Melee only!
    public static parryAttack(actor: Actor, target: Actor) {
    }

    public static escapeFight(actor: Actor, target: Actor) {
    }

    // Increases accuracy
    public static aimAttack(actor: Actor) {
        if (actor.weapon.accuracy < 100) {
            actor.weapon.accuracy += 10;
            UI.updateUI();
        }
    }

    public static mountVehicle(actor: Actor, target: Actor) {
    }

    public static reloadWeapon(actor: Actor, target: Actor) {
    }

    public static aidActor(actor: Actor, amount: number) {
        if (actor.health > actor.maxHealth) {
            actor.health = actor.maxHealth;
        } else {
            actor.health += amount;
        }
    }

    public static killEnemy(actor: Actor, target: Actor) {
        actor.kills += 1;
        actor.experience += target.experience;
        Messages.logMessage(Log.hit.kill, actor);
        Combat.lootEnemy(actor, target);
        if (actor.experience >= actor.maxExperience) {
            Combat.gainLevel(actor, target);
        }
        Combat.replaceEnemy(actor, target);
        Movement.moveRandomly(State.playArea, actor, 3);
        // currentActor.draw(State.playArea.context);
        // State.playArea.context.fillRect(currentActor.position[0],currentActor.position[1],3,3);
    }

    public static gainLevel(actor: Actor, target: Actor) {
        actor.gainLevel();
        Messages.logMessage(Log.levelUp, actor);
    }

    public static replaceEnemy(actor: Actor, target: Actor) {
        target.update();
        Movement.moveRandomly(State.playArea, target, State.playArea.width / 3);
        if (actor.role.name === target.role.name) {
            Messages.logMessage(Log.encounterSame, actor);
            Combat.replaceEnemy(actor, target);
        } else {
            Messages.encounter("distance", actor, target);
        }
    }

    public static lootEnemy(actor: Actor, target: Actor) {
        Messages.logMessage(Log.loot.search1, actor);
        Messages.logMessage(Log.loot.find, actor);
        GetItem.addItemToInventory(target.item, actor);
        GetItem.updateCurrency(target.currency, actor);
        actor.armor = UI.getStoppingPower();
    }

    private static didAttackHit(distance: number, dices: number, actor: Actor): boolean {
        let shotTarget: boolean = false;
        if (distance < 2000) {
            shotTarget = dices >= 1;
        } else if (distance <= actor.weapon.range / 4) {
            shotTarget = dices >= 15;
        } else if (distance <= actor.weapon.range / 2) {
            shotTarget = dices >= 20;
        } else if (distance <= actor.weapon.range) {
            shotTarget = dices >= 25;
        } else if (distance <= actor.weapon.range * 2) {
            shotTarget = dices >= 30;
        }
        return shotTarget;
    }
}
