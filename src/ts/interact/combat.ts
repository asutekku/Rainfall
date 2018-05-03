import {Utils} from "../utils/utils";
import {updateUI} from "../utils/UI";
import {Messages} from "./messages";
import {Movement} from "./Movement";
import {Actor} from "../actors/Actor";
import {getItem} from "./getItem";
import {State} from "../utils/State";

export class Combat {

    static basicAction(actor: Actor, target: Actor) {
        Combat.hitActor(actor, target);
        if (!target.isAlive()) {
            Combat.killEnemy(actor, target);
        } else {
            this.hitActor(target, actor);
            if (!actor.isAlive()) {
                actor.health = 0;
                Messages.combat('death', actor, target);
                updateUI(actor);
            }
        }
        updateUI(actor);
    }

    static shoot(actor: Actor, target: Actor): void {
        let distance = Utils.distance(actor.position, target.position);
    }

    static hitActor(actor: Actor, target: Actor): void {
        let beforeHealth = target.health;
        if (Utils.chance(actor.weapon.crit)) {
            //CRITICAL HIT
            Combat.attack(actor, target, 2);
            if (beforeHealth === target.health) {
                Combat.dodgeAttack(actor, target);
            } else Messages.combat('hitCritical', actor, target);
        } else {
            //NORMAL HIT
            Combat.attack(actor, target, 1);
            if (beforeHealth === target.health) {
                Combat.dodgeAttack(actor, target);
            } else {
                Messages.combat('hitNormal', actor, target);
            }
        }
    }

    static attack(actor, target, multiplier): void {
        if (target.armor != 0) {
            let def = 1 - target.armor / 100;
            target.health -= actor.weapon.weaponDamage() * def * multiplier;
        } else {
            target.health -= actor.weapon.weaponDamage() * multiplier;
        }

    }

    static dodgeAttack(actor: Actor, target: Actor): void {
        Messages.combat('hitMiss', actor, target);
    }

    //Melee only!
    static parryAttack(actor: Actor, target: Actor) {

    }

    //Melee only!
    static escapeFight(actor: Actor, target: Actor) {

    }

    //Increases accuracy
    static aimAttack(actor) {
        if (actor.weapon.accuracy < 100) {
            actor.weapon.accuracy += 10;
            updateUI(actor);
        }
    }

    static mountVehicle(actor: Actor, target: Actor) {

    }

    static reloadWeapon(actor: Actor, target: Actor) {
        //
    }

    static aidActor(actor, amount) {
        actor.health += amount;
        if (actor.health > actor.maxHealth) {
            actor.health = actor.maxHealth;
        }
    }

    static killEnemy(actor: Actor, target: Actor) {
        actor.kills += 1;
        actor.experience += target.experience;
        Messages.combat('kill', actor, target);
        Combat.lootEnemy(actor, target);
        Combat.gainLevel(actor, target);
        Combat.replaceEnemy(actor, target);
        Movement.moveRandomly(State.playArea, actor, 3);
        updateUI(actor);
        State.playArea.context.fillRect(actor.position[0],actor.position[1],3,3);
    }

    static gainLevel(actor: Actor, target: Actor) {
        if (actor.experience >= actor.maxExperience) {
            actor.gainLevel();
            Messages.combat('levelUp', actor, target);
            updateUI(actor);
        }
    }

    static replaceEnemy(actor: Actor, target: Actor) {
        target.update();
        Movement.moveRandomly(State.playArea, target, 50);
        if (actor.role.name === target.role.name) {
            Messages.combat('encounterSame', actor, target);
            Combat.replaceEnemy(actor, target);
        } else {
            Messages.encounter('distance', actor, target);
        }
    }

    static lootEnemy(actor: Actor, target: Actor) {
        Messages.combat('loot', actor, target);
        let item = target.item;
        switch (item.type) {
            case "upper":
                if (actor.lifepath.style.clothes.upper == null || actor.lifepath.style.clothes.upper.level < item.level) {
                    Messages.combat('lootFind', actor, target);
                    actor.lifepath.style.clothes.upper = item;
                    Utils.l('equippedUpperArmor').textContent = actor.lifepath.style.clothes.upper.name;
                    Utils.l('equippedUpperArmorDesc').textContent = actor.lifepath.style.clothes.upper.description;
                } else if (actor.lifepath.style.clothes.upper.level === item.level && actor.lifepath.style.clothes.upper.level != null) {
                    Messages.combat('lootFindSame', actor, target);
                } else {
                    Messages.combat('lootFindOld', actor, target);
                }
                break;

            case "lower":
                if (actor.lifepath.style.clothes.bottom == null || actor.lifepath.style.clothes.bottom.level < item.level) {
                    Messages.combat('lootFind', actor, target);
                    actor.lifepath.style.clothes.bottom = item;
                    Utils.l('equippedLowerArmor').textContent = actor.lifepath.style.clothes.bottom.name;
                    Utils.l('equippedLowerArmorDesc').textContent = actor.lifepath.style.clothes.bottom.description + " " + actor.lifepath.style.clothes.bottom.stoppingPower;
                } else if (actor.lifepath.style.clothes.bottom.level === item.level && actor.lifepath.style.clothes.bottom.level != null) {
                    Messages.combat('lootFindSame', actor, target);
                } else {
                    Messages.combat('lootFindOld', actor, target);
                }
                break;
            case "helmet":
                if (actor.lifepath.style.clothes.headgear === null || actor.lifepath.style.clothes.headgear.level < item.level) {
                    Messages.combat('lootFind', actor, target);
                    actor.lifepath.style.clothes.headgear = item;
                    Utils.l('equippedHeadArmor').textContent = actor.lifepath.style.clothes.headgear.name;
                    Utils.l('equippedHeadArmorDesc').textContent = actor.lifepath.style.clothes.headgear.description + actor.lifepath.style.clothes.headgear.stoppingPower;
                } else if (actor.lifepath.style.clothes.headgear.level === item.level && actor.lifepath.style.clothes.headgear != null) {
                    Messages.combat('lootFindSame', actor, target);
                } else {
                    Messages.combat('lootFindOld', actor, target);
                }
                break;
            case "weapon":
                if (target.weapon.averageDamage() > actor.weapon.averageDamage()) {
                    Messages.combat('lootWeaponBetter', actor, target);
                    actor.weapon = target.weapon;
                    updateUI(actor);
                } else {
                    Messages.combat('lootWeaponWorse', actor, target);
                }
                break;
            case "medical":
                break;
            case "tool":
                Messages.combat('lootFind', actor, target);
                getItem.addItemToInventory(item, actor);
                actor.items.push(item);
                updateUI(actor);
                break;
            default:
                Messages.combat('lootFind', actor, target);
                break;
        }
        getItem.updateCurrency(target.currency, actor, target);
        actor.armor = (actor.lifepath.style.clothes.headgear == null ? 0 : actor.lifepath.style.clothes.headgear.stoppingPower) + (actor.lifepath.style.clothes.upper == null ? 0 : actor.lifepath.style.clothes.upper.stoppingPower) + (actor.lifepath.style.clothes.bottom == null ? 0 : actor.lifepath.style.clothes.bottom.stoppingPower);
        Utils.l('armorStoppingPower').textContent = actor.armor + '%';
    }

}