define(["require", "exports", "../utils/utils", "../utils/UI", "./messages", "./Movement", "../actors/resources/stats", "./getItem"], function (require, exports, utils_1, UI_1, messages_1, Movement_1, stats_1, getItem_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Combat = /** @class */ (function () {
        function Combat() {
        }
        //Formula: rateOfFire*diceThrows(1-6)+damage
        //It's possible for every shot to miss
        Combat.weaponDamage = function (actor, target) {
            var damage = 0;
            function defence() {
                var armor = isNaN(target.armor) ? 0 : target.armor;
                return 1 - (armor / 100);
            }
            for (var i = 0; i <= actor.weapon.rateOfFire; i++) {
                if (utils_1.Utils.chance(actor.weapon.accuracy)) {
                    damage += (utils_1.Utils.dice(actor.weapon.diceThrows, 6) + actor.weapon.damage);
                }
            }
            return Math.floor(damage * defence());
        };
        Combat.basicAction = function (actor, target) {
            Combat.hitActor(actor, target);
            if (target.health <= 0) {
                Combat.killEnemy(actor, target);
            }
            else if (target.health > 0) {
                Combat.hitActor(target, actor);
                if (actor.health <= 0) {
                    actor.health = 0;
                    messages_1.Messages.combat('death', actor, target);
                    UI_1.updateUI(actor);
                }
            }
            UI_1.updateUI(actor);
        };
        Combat.hitActor = function (actor, target) {
            var beforeHealth = target.health;
            if (utils_1.Utils.chance(actor.weapon.crit)) {
                //CRITICAL HIT
                Combat.attack(actor, target, 2);
                if (beforeHealth === target.health) {
                    Combat.dodgeAttack(actor, target);
                }
                else {
                    messages_1.Messages.combat('hitCritical', actor, target);
                }
            }
            else {
                //NORMAL HIT
                Combat.attack(actor, target, 1);
                if (beforeHealth === target.health) {
                    Combat.dodgeAttack(actor, target);
                }
                else {
                    messages_1.Messages.combat('hitNormal', actor, target);
                }
            }
        };
        Combat.attack = function (actor, target, multiplier) {
            actor.damage = Combat.weaponDamage(actor, target);
            target.health -= actor.damage * multiplier;
        };
        Combat.dodgeAttack = function (actor, target) {
            messages_1.Messages.combat('hitMiss', actor, target);
        };
        //Melee only!
        Combat.parryAttack = function (actor, target) {
        };
        //Melee only!
        Combat.escapeFight = function (actor, target) {
        };
        //Increases accuracy
        Combat.aimAttack = function (actor) {
            if (actor.weapon.accuracy < 100) {
                actor.weapon.accuracy += 10;
                UI_1.updateUI(actor);
            }
        };
        Combat.mountVehicle = function (actor, target) {
        };
        Combat.reloadWeapon = function (actor, target) {
            //
        };
        Combat.aidActor = function (actor, amount) {
            actor.health += amount;
            if (actor.health > actor.maxHealth) {
                actor.health = actor.maxHealth;
            }
        };
        Combat.killEnemy = function (actor, target) {
            actor.kills += 1;
            actor.experience += target.experience;
            messages_1.Messages.combat('kill', actor, target);
            Combat.lootEnemy(actor, target);
            Combat.gainLevel(actor, target);
            Combat.replaceEnemy(actor, target);
            Movement_1.Movement.moveRandomly(actor, 50);
            //actor.reposition();
            UI_1.updateUI(actor);
        };
        Combat.gainLevel = function (actor, target) {
            if (actor.experience >= actor.maxExperience) {
                actor.level += 1;
                stats_1.Stats.level += 1;
                actor.experience = 0;
                actor.maxExperience = Math.floor(actor.maxExperience * 1.5 + 6);
                actor.maxHealth = Math.floor((actor.level * 0.6) * 80);
                actor.health = actor.maxHealth;
                messages_1.Messages.combat('levelUp', actor, target);
                //saveStats();
                UI_1.updateUI(actor);
            }
        };
        Combat.isAlive = function (actor) {
            return actor.health > 0;
        };
        Combat.replaceEnemy = function (actor, target) {
            target.update();
            Movement_1.Movement.moveRandomly(target, 50);
            //currentEnemy.reposition();
            if (actor.role.name === target.role.name) {
                messages_1.Messages.combat('encounterSame', actor, target);
                Combat.replaceEnemy(actor, target);
            }
            else {
                messages_1.Messages.combat('encounter', actor, target);
                messages_1.Messages.encounter('distance', actor, target);
                target.health = Math.floor((50 * actor.level) / 1.5);
            }
        };
        Combat.lootEnemy = function (actor, target) {
            var averageDamage = function (actor) {
                var low = actor.weapon.diceThrows * actor.weapon.rateOfFire + actor.weapon.damage;
                var high = (actor.weapon.diceThrows * 6) * actor.weapon.rateOfFire + actor.weapon.damage;
                return (low + high) / 2;
            };
            messages_1.Messages.combat('loot', actor, target);
            var item = target.items[0];
            switch (item.type) {
                case "upper":
                    if (actor.lifepath.style.clothes.upper == null || actor.lifepath.style.clothes.upper.level < item.level) {
                        messages_1.Messages.combat('lootFind', actor, target);
                        actor.lifepath.style.clothes.upper = item;
                        utils_1.Utils.l('equippedUpperArmor').textContent = actor.lifepath.style.clothes.upper.name;
                        utils_1.Utils.l('equippedUpperArmorDesc').textContent = actor.lifepath.style.clothes.upper.description;
                    }
                    else if (actor.lifepath.style.clothes.upper.level === item.level && actor.lifepath.style.clothes.upper.level != null) {
                        messages_1.Messages.combat('lootFindSame', actor, target);
                    }
                    else {
                        messages_1.Messages.combat('lootFindOld', actor, target);
                    }
                    break;
                case "lower":
                    if (actor.lifepath.style.clothes.bottom == null || actor.lifepath.style.clothes.bottom.level < item.level) {
                        messages_1.Messages.combat('lootFind', actor, target);
                        actor.lifepath.style.clothes.bottom = item;
                        utils_1.Utils.l('equippedLowerArmor').textContent = actor.lifepath.style.clothes.bottom.name;
                        utils_1.Utils.l('equippedLowerArmorDesc').textContent = actor.lifepath.style.clothes.bottom.description + " " + actor.lifepath.style.clothes.bottom.stoppingPower;
                    }
                    else if (actor.lifepath.style.clothes.bottom.level === item.level && actor.lifepath.style.clothes.bottom.level != null) {
                        messages_1.Messages.combat('lootFindSame', actor, target);
                    }
                    else {
                        messages_1.Messages.combat('lootFindOld', actor, target);
                    }
                    break;
                case "helmet":
                    if (actor.lifepath.style.clothes.headgear === null || actor.lifepath.style.clothes.headgear.level < item.level) {
                        messages_1.Messages.combat('lootFind', actor, target);
                        actor.lifepath.style.clothes.headgear = item;
                        utils_1.Utils.l('equippedHeadArmor').textContent = actor.lifepath.style.clothes.headgear.name;
                        utils_1.Utils.l('equippedHeadArmorDesc').textContent = actor.lifepath.style.clothes.headgear.description + actor.lifepath.style.clothes.headgear.stoppingPower;
                    }
                    else if (actor.lifepath.style.clothes.headgear.level === item.level && actor.lifepath.style.clothes.headgear != null) {
                        messages_1.Messages.combat('lootFindSame', actor, target);
                    }
                    else {
                        messages_1.Messages.combat('lootFindOld', actor, target);
                    }
                    break;
                case "weapon":
                    if (averageDamage(target) > averageDamage(actor)) {
                        messages_1.Messages.combat('lootWeaponBetter', actor, target);
                        actor.weapon = target.weapon;
                        UI_1.updateUI(actor);
                    }
                    else {
                        messages_1.Messages.combat('lootWeaponWorse', actor, target);
                    }
                    break;
                case "medical":
                    break;
                case "tool":
                    messages_1.Messages.combat('lootFind', actor, target);
                    getItem_1.getItem.addItemToInventory(item, actor);
                    actor.items.push(item);
                    UI_1.updateUI(actor);
                    break;
                default:
                    messages_1.Messages.combat('lootFind', actor, target);
                    break;
            }
            getItem_1.getItem.updateCurrency(target.currency, actor, target);
            actor.armor = (actor.lifepath.style.clothes.headgear == null ? 0 : actor.lifepath.style.clothes.headgear.stoppingPower) + (actor.lifepath.style.clothes.upper == null ? 0 : actor.lifepath.style.clothes.upper.stoppingPower) + (actor.lifepath.style.clothes.bottom == null ? 0 : actor.lifepath.style.clothes.bottom.stoppingPower);
            utils_1.Utils.l('armorStoppingPower').textContent = actor.armor + '%';
        };
        return Combat;
    }());
    exports.Combat = Combat;
});
