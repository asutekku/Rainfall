import {Actor} from "../actors/Actor";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {GetItem} from "./getItem";
import {Messages} from "./messages";
import {DeathMessage, DodgeMessage, IDefaultMessage, LvlUpMessage, MessageStr} from "./messageSchema";
import {Skill} from "../items/Skill";
import {GameObject} from "../items/GameObject";

const Log = en_US.Log;

export class Combat {
    private static messages: any = [];

    public static basicAction(actor: Actor, target: GameObject, skill: Skill): any {
        this.messages = [];

        if (actor.health > 0) {
            // Actor attacks the target
            this.attack(actor, target);
            //Checks if the target is alive to initiate target's turn
            if (target.health > 0 && target instanceof Actor && target.hostile) {
                //Target attacks the actor
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

    public static attack(actor: Actor, target: GameObject): any {
        const distance: number = Utils.distance(actor.position, target.position);
        const dices: number = actor.stats.ref + Utils.dice(3, 10);
        const hitSuccess: boolean = this.didAttackHit(distance, dices, actor);
        const targetOldHP: number = target.health;
        const weaponDamage: number = actor.weapon.getDamage();

        if (hitSuccess) {
            if (target instanceof Actor) {
                const damageCaused: number = target.receiveDamage(weaponDamage);
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
                const damageCaused: number = target.receiveDamage(weaponDamage);
                const combatMessage = Messages.getCombatMessage(actor, target, targetOldHP, damageCaused);
                this.messages.push(combatMessage);
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

    // Increases accuracy
    public static aimAttack(actor: Actor) {
        if (actor.weapon.accuracy < 100) {
            actor.weapon.accuracy += 10;
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

    public static gainLevel(actor: Actor, target: Actor) {
        actor.gainLevel();
        const lvlUPMessage = new LvlUpMessage(target, actor);
        this.messages.push(lvlUPMessage);
    }

    public static lootEnemy(actor: Actor, target: Actor) {
        Messages.logMessage(Log.loot.search1, actor);
        Messages.logMessage(Log.loot.find, actor);
        GetItem.addItemToInventory(target.item, actor);
        GetItem.updateCurrency(target.currency, actor);
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
