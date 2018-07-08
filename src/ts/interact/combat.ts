import {Utils} from "../utils/utils";
import {UI} from "../utils/UI";
import {Messages} from "./messages";
import {Movement} from "./Movement";
import {Actor} from "../actors/Actor";
import {getItem} from "./getItem";
import {State} from "../utils/State";
import {Draw} from "../utils/Draw";
import get = Reflect.get;

export class Combat {
    static basicAction(actor: Actor, target: Actor) {
        this.shoot(actor, target);
        if (!target.isAlive()) {
            Combat.killEnemy(actor, target);
        } else {
            this.shoot(target, actor);
            if (!actor.isAlive()) {
                actor.health = 0;
                Messages.combat("death", actor, target);
                UI.updateUI();
            }
        }
        UI.updateUI();
    }

    static shoot(actor: Actor, target: Actor): void {
        let distance: number = Utils.distance(actor.position, target.position);
        let shotTarget: boolean = false;
        let dices: number = actor.stats.ref + Utils.dice(3, 10);
        if (distance < 2000) shotTarget = dices >= 1;
        else if (distance <= actor.weapon.range / 4) shotTarget = dices >= 15;
        else if (distance <= actor.weapon.range / 2) shotTarget = dices >= 20;
        else if (distance <= actor.weapon.range) shotTarget = dices >= 25;
        else if (distance <= actor.weapon.range * 2) shotTarget = dices >= 30;
        if (shotTarget) {
            target.health -= actor.weapon.weaponDamage();
            Messages.combat("hitNormal", actor, target);
        } else {
            this.dodgeAttack(actor, target);
        }
    }

    static hitActor(actor: Actor, target: Actor): void {
        let beforeHealth: number = target.health;
        const multi: number = Utils.chance(actor.weapon.crit) ? 2 : 1;
        Combat.attack(actor, target, multi);
        if (beforeHealth === target.health) {
            Combat.dodgeAttack(actor, target);
        } else if (multi == 2) {
            Messages.combat("hitCritical", actor, target);
        } else {
            Messages.combat("hitNormal", actor, target);
        }
    }

    static attack(actor: Actor, target: Actor, multiplier: number): void {
        const def = target.armor != 0 ? 1 - target.armor / 100 : 1;
        target.health -= actor.weapon.weaponDamage() * def * multiplier;
    }

    static dodgeAttack(actor: Actor, target: Actor): void {
        Messages.combat("hitMiss", actor, target);
        Movement.moveTo(actor, target.position, actor.stats.ma.ma);
    }

    //Melee only!
    static parryAttack(actor: Actor, target: Actor) {
    }

    static escapeFight(actor: Actor, target: Actor) {
    }

    //Increases accuracy
    static aimAttack(actor: Actor) {
        if (actor.weapon.accuracy < 100) {
            actor.weapon.accuracy += 10;
            UI.updateUI();
        }
    }

    static mountVehicle(actor: Actor, target: Actor) {
    }

    static reloadWeapon(actor: Actor, target: Actor) {
    }

    static aidActor(actor: Actor, amount: number) {
        actor.health = actor.health > actor.maxHealth ? actor.maxHealth : (actor.health += amount);
    }

    static killEnemy(actor: Actor, target: Actor) {
        actor.kills += 1;
        actor.experience += target.experience;
        Messages.combat("kill", actor, target);
        Combat.lootEnemy(actor, target);
        Combat.gainLevel(actor, target);
        Combat.replaceEnemy(actor, target);
        Movement.moveRandomly(State.playArea, actor, 3);
        UI.updateUI();
        //actor.draw(State.playArea.context);
        //State.playArea.context.fillRect(actor.position[0],actor.position[1],3,3);
    }

    static gainLevel(actor: Actor, target: Actor) {
        if (actor.experience >= actor.maxExperience) {
            actor.gainLevel();
            Messages.combat("levelUp", actor, target);
            UI.updateUI();
        }
    }

    static replaceEnemy(actor: Actor, target: Actor) {
        target.update();
        Movement.moveRandomly(State.playArea, target, State.playArea.width / 3);
        if (actor.role.name === target.role.name) {
            Messages.combat("encounterSame", actor, target);
            Combat.replaceEnemy(actor, target);
        } else {
            Messages.encounter("distance", actor, target);
        }
    }

    static lootEnemy(actor: Actor, target: Actor) {
        Messages.combat("loot", actor, target);
        Messages.combat("lootFind", actor, target);
        getItem.addItemToInventory(target.item, actor);
        getItem.updateCurrency(target.currency, actor, target);
        actor.armor = UI.getStoppingPower();
    }
}
