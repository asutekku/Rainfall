import {Utils} from "../utils/utils";
import {UI} from "../utils/UI";
import {Messages} from "./messages";
import {Movement} from "./Movement";
import {Actor} from "../actors/Actor";
import {getItem} from "./getItem";
import {State} from "../utils/State";
import {Draw} from "../utils/Draw";


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
                UI.updateUI(actor);
            }
        }
        UI.updateUI(actor);
        Draw.updateCanvas(State.playArea);
    }

    static shoot(actor: Actor, target: Actor): void {
        let distance = Utils.distance(actor.position, target.position);
        console.log(distance);
        if (distance < 1000) {
            // POINT BLANK
            if (actor.stats.ref + Utils.dice(3, 10) >= 1) {
                target.health -= actor.weapon.weaponDamage();
                Messages.combat("hitNormal", actor, target);
            } else {
                this.dodgeAttack(actor, target);
            }
        } else if (distance < actor.weapon.range / 4) {
            if (actor.stats.ref + Utils.dice(3, 10) >= 15) {
                target.health -= actor.weapon.weaponDamage();
                Draw.drawLine(
                    State.playArea.context,
                    actor.position,
                    target.position,
                    actor.color
                );
                Messages.combat("hitNormal", actor, target);
            } else {
                this.dodgeAttack(actor, target);
            }
        } else if (distance < actor.weapon.range / 2) {
            if (actor.stats.ref + Utils.dice(3, 10) >= 20) {
                target.health -= actor.weapon.weaponDamage();
                Draw.drawLine(
                    State.playArea.context,
                    actor.position,
                    target.position,
                    actor.color
                );
                Messages.combat("hitNormal", actor, target);
            } else {
                this.dodgeAttack(actor, target);
            }
        } else if (distance < actor.weapon.range) {
            if (actor.stats.ref + Utils.dice(3, 10) >= 25) {
                target.health -= actor.weapon.weaponDamage();
                Draw.drawLine(
                    State.playArea.context,
                    actor.position,
                    target.position,
                    actor.color
                );
                Messages.combat("hitNormal", actor, target);
            } else {
                this.dodgeAttack(actor, target);
            }
        } else if (distance < actor.weapon.range * 2) {
            if (actor.stats.ref + Utils.dice(3, 10) >= 30) {
                target.health -= actor.weapon.weaponDamage();
                Draw.drawLine(
                    State.playArea.context,
                    actor.position,
                    target.position,
                    actor.color
                );
                Messages.combat("hitNormal", actor, target);
            } else {
                this.dodgeAttack(actor, target);
            }
        } else {
            Movement.moveTo(actor, target.position, actor.stats.ma.ma);
            actor.draw(State.playArea.context);
        }
    }

    static hitActor(actor: Actor, target: Actor): void {
        let beforeHealth = target.health;
        if (Utils.chance(actor.weapon.crit)) {
            //CRITICAL HIT
            Combat.attack(actor, target, 2);
            if (beforeHealth === target.health) {
                Combat.dodgeAttack(actor, target);
            } else Messages.combat("hitCritical", actor, target);
        } else {
            //NORMAL HIT
            Combat.attack(actor, target, 1);
            if (beforeHealth === target.health) {
                Combat.dodgeAttack(actor, target);
            } else {
                Messages.combat("hitNormal", actor, target);
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
        Messages.combat("hitMiss", actor, target);
        Movement.moveTo(actor, target.position, actor.stats.ma.ma);
        actor.draw(State.playArea.context);
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
            UI.updateUI(actor);
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
        Messages.combat("kill", actor, target);
        Combat.lootEnemy(actor, target);
        Combat.gainLevel(actor, target);
        Combat.replaceEnemy(actor, target);
        Movement.moveRandomly(State.playArea, actor, 3);
        UI.updateUI(actor);
        actor.draw(State.playArea.context);
        //State.playArea.context.fillRect(actor.position[0],actor.position[1],3,3);
    }

    static gainLevel(actor: Actor, target: Actor) {
        if (actor.experience >= actor.maxExperience) {
            actor.gainLevel();
            Messages.combat("levelUp", actor, target);
            UI.updateUI(actor);
        }
    }

    static replaceEnemy(actor: Actor, target: Actor) {
        target.update();
        Movement.moveRandomly(State.playArea, target, State.playArea.width / 3);
        target.draw(State.playArea.context);
        if (actor.role.name === target.role.name) {
            Messages.combat("encounterSame", actor, target);
            Combat.replaceEnemy(actor, target);
        } else {
            Messages.encounter("distance", actor, target);
        }
    }

    static lootEnemy(actor: Actor, target: Actor) {
        Messages.combat("loot", actor, target);
        let item = target.item;
        let clothes = actor.lifepath.style.clothes,
            upper = clothes.upper,
            bottom = clothes.bottom,
            headgear = clothes.headgear;
        Messages.combat("lootFind", actor, target);
        getItem.addItemToInventory(item, actor);
        /*switch (item.type) {
            case "upper":
                if (upper == null || upper.level < item.level) {
                    Messages.combat("lootFind", actor, target);
                    upper = item;
                    Utils.l("equippedUpperArmor").textContent = upper.name;
                    Utils.l("equippedUpperArmorDesc").textContent = upper.description;
                } else if (upper.level === item.level && upper.level != null) {
                    Messages.combat("lootFindSame", actor, target);
                } else {
                    Messages.combat("lootFindOld", actor, target);
                }
                break;

            case "lower":
                if (bottom == null || bottom.level < item.level) {
                    Messages.combat("lootFind", actor, target);
                    bottom = item;
                    Utils.l("equippedLowerArmor").textContent =
                        bottom.name;
                    Utils.l("equippedLowerArmorDesc").textContent =
                        `${bottom.description} ${bottom.stoppingPower}`;
                } else if (bottom.level === item.level && bottom.level != null) {
                    Messages.combat("lootFindSame", actor, target);
                } else {
                    Messages.combat("lootFindOld", actor, target);
                }
                break;
            case "helmet":
                if (headgear === null || headgear.level < item.level) {
                    Messages.combat("lootFind", actor, target);
                    headgear = item;
                    Utils.l("equippedHeadArmor").textContent = headgear.name;
                    Utils.l("equippedHeadArmorDesc").textContent = headgear.description + headgear.stoppingPower;
                } else if (headgear.level === item.level && headgear != null) {
                    Messages.combat("lootFindSame", actor, target);
                } else {
                    Messages.combat("lootFindOld", actor, target);
                }
                break;
            case "weapon":
                if (target.weapon.averageDamage() > actor.weapon.averageDamage()) {
                    Messages.combat("lootWeaponBetter", actor, target);
                    actor.weapon = target.weapon;
                    UI.updateUI(actor);
                } else {
                    Messages.combat("lootWeaponWorse", actor, target);
                }
                break;
            case "medical":
                break;
            case "tool":
                Messages.combat("lootFind", actor, target);
                getItem.addItemToInventory(item, actor);
                actor.items.push(item);
                UI.updateUI(actor);
                break;
            default:
                Messages.combat("lootFind", actor, target);
                break;
        }*/
        getItem.updateCurrency(target.currency, actor, target);
        actor.armor =
            (headgear == null ? 0 : headgear.stoppingPower) +
            (upper == null ? 0 : upper.stoppingPower) +
            (bottom == null ? 0 : bottom.stoppingPower);
        Utils.l("armorStoppingPower").textContent = actor.armor + "%";
    }
}
