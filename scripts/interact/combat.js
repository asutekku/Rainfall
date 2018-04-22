define(['enemy','utils', 'list_weapons', 'list_items', 'list_armor', 'messages', 'actors', 'getItem', 'nameGen', 'UI', 'stats'], function (enemy,utils, weapons, itemList, armor, message, actors, getItem, nameGen, UI, stats) {

    var currentEnemy = enemy.enemy;

    //Formula: rateOfFire*diceThrows(1-6)+damage
    //It's possible for every shot to miss
    function weaponDamage(actor, target) {
        var damage = 0;

        function defence() {
            var armor = isNaN(target.armor) ? 0 : target.armor;
            return 1 - (armor / 100);
        }
        for (i = 0; i <= actor.weapon.rateOfFire; i++) {
            if (utils.chance(actor.weapon.accuracy)) {
                damage += (utils.dice(actor.weapon.diceThrows) + actor.weapon.damage)
            }
        }
        return Math.floor(damage * defence());
    }

    return {
        basicAction: function (actor, target) {
            this.hitActor(actor, target);
            if (target.health <= 0) {
                this.killEnemy(actor, target);
            } else if (target.health > 0) {
                console.log()
                this.hitActor(target, actor);
                if (actor.health <= 0) {
                    actor.health = 0;
                    message.combat('death', actor, target);
                    UI.updateUI(actor);
                }
            }
            UI.updateUI(actor);
        },

        hitActor: function (actor, target) {
            beforeHealth = target.health;
            if (utils.chance(actor.weapon.crit)) {
                //CRITICAL HIT
                this.attack(actor, target, 2)
                if (beforeHealth == target.health) {
                    this.dodgeAttack(actor, target);
                } else {
                    message.combat('hitCritical', actor, target);
                }
            } else {
                //NORMAL HIT
                this.attack(actor, target, 1);
                if (beforeHealth == target.health) {
                    this.dodgeAttack(actor, target);
                } else {
                    message.combat('hitNormal', actor, target);
                }
            }
        },

        attack: function (actor, target, multiplier) {
            actor.damage = weaponDamage(actor, target);
            target.health -= actor.damage * multiplier;
        },

        dodgeAttack: function (actor, target) {
            message.combat('hitMiss', actor, target);
        },

        //Melee only!
        parryAttack: function (actor, target) {

        },

        //Melee only!
        escapeFight: function (actor, target) {

        },

        //Increases accuracy
        aimAttack: function (actor) {
            if (actor.weapon.accuracy < 100) {
                actor.weapon.accuracy += 10
                UI.updateUI(actor);
            }
        },

        mountVehicle: function (actor, target) {

        },

        reloadWeapon: function (actor, target) {

        },

        aidActor: function (actor, amount) {
            actor.health += amount;
            if (actor.health > actor.maxHealth) {
                actor.health = actor.maxHealth;
            }
        },

        killEnemy: function (actor, target) {
            stats.player.kills += 1;
            actor.experience += target.experience;
            message.combat('kill', actor, target);
            this.lootEnemy(actor, target);
            this.gainLevel(actor, target);
            this.replaceEnemy(actor, target);
            UI.updateUI(actor);
        },

        gainLevel: function (actor, target) {
            if (actor.experience >= actor.maxExperience) {
                actor.level += 1;
                actor.experience = 0;
                actor.maxExperience = Math.floor(actor.maxExperience * 1.5 + 6);
                actor.maxHealth = Math.floor((actor.level * 0.6) * 80);
                actor.health = actor.maxHealth;
                actor.skillPt += 2;
                message.combat('levelUp', actor, target);
                //saveStats();
                UI.updateUI(actor);
            }
        },

        isAlive: function (actor) {
            if (actor.health > 0) {
                return true;
            } else if (actor.health <= 0) {
                actor.health = 0;
                return false;
            }
        },

        replaceEnemy: function (actor, target) {
            enemy.updateEnemy();
            if (actor.role == target.role) {
                message.combat('encounterSame', actor, currentEnemy);
                enemy.updateEnemy();
                this.replaceEnemy(actor, target);
            } else {
                message.combat('encounter', actor, currentEnemy);
                currentEnemy.health = Math.floor((50 * actor.level) / 1.5);
            }
        },

        lootEnemy: function (actor, target) {
            //actor.items.push(target.items);
            message.combat('loot', actor, target);
            switch (target.items.type) {
                case "upper":
                    if (actor.upperArmor.level == 0 || actor.upperArmor.level == null) {
                        message.combat('lootFind', actor, target, upperArmor);
                        actor.upperArmor = target.items;
                        utils.l('equippedUpperArmor').textContent = actor.upperArmor.name;
                        utils.l('equippedUpperArmorDesc').textContent = actor.upperArmor.description;
                    } else if (actor.upperArmor.level == target.items.level && actor.upperArmor.level != null) {
                        message.combat('lootFindSame', actor, target);
                    } else if (actor.upperArmor.level < target.items.level && actor.upperArmor.level != null) {
                        message.combat('lootFindNew', actor, target);
                        actor.upperArmor = target.items;
                        utils.l('equippedUpperArmor').textContent = actor.upperArmor.name;
                        utils.l('equippedUpperArmorDesc').textContent = actor.upperArmor.description;
                    } else {
                        message.combat('lootFindOld', actor, target);
                    }
                    break;

                case "lower":
                    if (actor.lowerArmor.level == 0 || actor.lowerArmor.level == null) {
                        message.combat('lootFind', actor, target);
                        actor.lowerArmor = target.items;
                        utils.l('equippedLowerArmor').textContent = actor.lowerArmor.name;
                        utils.l('equippedLowerArmorDesc').textContent = actor.lowerArmor.description;
                    } else if (actor.lowerArmor.level == target.items.level && actor.lowerArmor.level != null) {
                        message.combat('lootFindSame', actor, target);
                    } else if (actor.lowerArmor.level < target.items.level && actor.lowerArmor.level != null) {
                        message.combat('lootFindNew', actor, target);
                        actor.lowerArmor = target.items;
                        utils.l('equippedLowerArmor').textContent = actor.lowerArmor.name;
                        utils.l('equippedLowerArmorDesc').textContent = actor.lowerArmor.description;
                    } else {
                        message.combat('lootFindOld', actor, target);
                    }
                    break;
                case "helmet":
                    if (actor.helmet.level == 0 || actor.helmet.level == null) {
                        message.combat('lootFind', actor, target);
                        actor.helmet = target.items;
                        utils.l('equippedHeadArmor').textContent = actor.helmet.name;
                        utils.l('equippedHeadArmorDesc').textContent = actor.helmet.description;
                    } else if (actor.helmet.level == target.items.level && actor.helmet.level != null) {
                        message.combat('lootFindSame', actor, target);
                    } else if (actor.helmet.level < target.items.level && actor.helmet.level != null) {
                        message.combat('lootFindNew', actor, target);
                        actor.helmet = target.items;
                        utils.l('equippedHeadArmor').textContent = actor.helmet.name;
                        utils.l('equippedHeadArmorDesc').textContent = actor.helmet.description;
                    } else {
                        message.combat('lootFindOld', actor, target);
                    }
                    break;
                case "weapon":
                    function averageDamage(actr) {
                        var low = actr.weapon.diceThrows * actr.weapon.rateOfFire + actr.weapon.damage;
                        var high = (actr.weapon.diceThrows * 6) * actr.weapon.rateOfFire + actr.weapon.damage;
                        return (low + high) / 2;
                    }
                    if (averageDamage(target) > averageDamage(actor)) {
                        message.combat('lootWeaponBetter', actor, target);
                        actor.weapon = target.weapon;
                        UI.updateUI(actor);
                    } else {
                        message.combat('lootWeaponWorse', actor, target);
                    }
                    break;
                case "medical":
                case "tool":
                    message.combat('lootFind', actor, target);
                    getItem.addItemToInventory(target.items, actor);
                    actor.items.push(target.items);
                    UI.updateUI(actor);
                    break;
                default:
                    message.combat('lootFind', actor, target);
                    break;
            }
            getItem.updateCurrency(target.currency, actor, target);
            actor.armor = (isNaN(actor.helmet.stoppingPower) ? 0 : actor.helmet.stoppingPower) + (isNaN(actor.upperArmor.stoppingPower) ? 0 : actor.upperArmor.stoppingPower) + (isNaN(actor.lowerArmor.stoppingPower) ? 0 : actor.lowerArmor.stoppingPower);
            UI.updateUI(actor);
        }
    };
});