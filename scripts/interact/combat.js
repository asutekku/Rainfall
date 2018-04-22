define(['enemy', 'utils', 'list_weapons', 'list_items', 'list_armor', 'messages', 'actors', 'getItem', 'nameGen', 'UI', 'stats'], function (enemy, utils, weapons, itemList, armor, message, actors, getItem, nameGen, UI, stats) {

    let currentEnemy = enemy.enemy;

    //Formula: rateOfFire*diceThrows(1-6)+damage
    //It's possible for every shot to miss
    function weaponDamage(actor, target) {
        let damage = 0;

        function defence() {
            let armor = isNaN(target.armor) ? 0 : target.armor;
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
            let beforeHealth = target.health;
            if (utils.chance(actor.weapon.crit)) {
                //CRITICAL HIT
                this.attack(actor, target, 2);
                if (beforeHealth === target.health) {
                    this.dodgeAttack(actor, target);
                } else {
                    message.combat('hitCritical', actor, target);
                }
            } else {
                //NORMAL HIT
                this.attack(actor, target, 1);
                if (beforeHealth === target.health) {
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
                actor.weapon.accuracy += 10;
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
            actor.kills += 1;
            actor.experience += target.experience;
            message.combat('kill', actor, target);
            this.lootEnemy(actor, target);
            this.gainLevel(actor, target);
            this.replaceEnemy(actor, target);
            actor.reposition();
            UI.updateUI(actor);
        },

        gainLevel: function (actor, target) {
            if (actor.experience >= actor.maxExperience) {
                actor.level += 1;
                stats.player.level += 1;
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
            currentEnemy.reposition();
            if (actor.role === target.role) {
                message.combat('encounterSame', actor, currentEnemy);
                enemy.updateEnemy();
                this.replaceEnemy(actor, target);
            } else {
                message.combat('encounter', actor, currentEnemy);
                message.encounter('distance', actor, currentEnemy);
                currentEnemy.health = Math.floor((50 * actor.level) / 1.5);
            }
        },

        lootEnemy: function (actor, target) {
            let averageDamage = function (actor) {
                let low = actor.weapon.diceThrows * actor.weapon.rateOfFire + actor.weapon.damage;
                let high = (actor.weapon.diceThrows * 6) * actor.weapon.rateOfFire + actor.weapon.damage;
                return (low + high) / 2;
            };
            message.combat('loot', actor, target);
            switch (target.items.type) {
                case "upper":
                    if (actor.lifepath.style.clothes.upper == null || actor.lifepath.style.clothes.upper.level < target.items.level) {
                        message.combat('lootFind', actor, target, upperArmor);
                        actor.lifepath.style.clothes.upper = target.items;
                        utils.l('equippedUpperArmor').textContent = actor.lifepath.style.clothes.upper.name;
                        utils.l('equippedUpperArmorDesc').textContent = actor.lifepath.style.clothes.upper.description;
                    } else if (actor.lifepath.style.clothes.upper.level === target.items.level && actor.lifepath.style.clothes.upper.level != null) {
                        message.combat('lootFindSame', actor, target);
                    } else {
                        message.combat('lootFindOld', actor, target);
                    }
                    break;

                case "lower":
                    if (actor.lifepath.style.clothes.bottom == null || actor.lifepath.style.clothes.bottom.level < target.items.level) {
                        message.combat('lootFind', actor, target);
                        actor.lifepath.style.clothes.bottom = target.items;
                        utils.l('equippedLowerArmor').textContent = actor.lifepath.style.clothes.bottom.name;
                        utils.l('equippedLowerArmorDesc').textContent = actor.lifepath.style.clothes.bottom.description + " " + actor.lifepath.style.clothes.bottom.stoppingPower;
                    } else if (actor.lifepath.style.clothes.bottom.level === target.items.level && actor.lifepath.style.clothes.bottom.level != null) {
                        message.combat('lootFindSame', actor, target);
                    } else {
                        message.combat('lootFindOld', actor, target);
                    }
                    break;
                case "helmet":
                    if (actor.lifepath.style.clothes.headgear === null || actor.lifepath.style.clothes.headgear.level < target.items.level) {
                        message.combat('lootFind', actor, target);
                        actor.lifepath.style.clothes.headgear = target.items;
                        utils.l('equippedHeadArmor').textContent = actor.lifepath.style.clothes.headgear.name;
                        utils.l('equippedHeadArmorDesc').textContent = actor.lifepath.style.clothes.headgear.description + actor.lifepath.style.clothes.headgear.stoppingPower;
                    } else if (actor.lifepath.style.clothes.headgear.level === target.items.level && actor.lifepath.style.clothes.headgear != null) {
                        message.combat('lootFindSame', actor, target);
                    } else {
                        message.combat('lootFindOld', actor, target);
                    }
                    break;
                case "weapon":
                    if (averageDamage(target) > averageDamage(actor)) {
                        message.combat('lootWeaponBetter', actor, target);
                        actor.weapon = target.weapon;
                        UI.updateUI(actor);
                    } else {
                        message.combat('lootWeaponWorse', actor, target);
                    }
                    break;
                case "medical":
                    break;
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
            actor.armor = (actor.lifepath.style.clothes.headgear == null ? 0 : actor.lifepath.style.clothes.headgear.stoppingPower) + (actor.lifepath.style.clothes.upper == null ? 0 : actor.lifepath.style.clothes.upper.stoppingPower) + (actor.lifepath.style.clothes.bottom == null ? 0 : actor.lifepath.style.clothes.bottom.stoppingPower);
            console.log(actor);
            utils.l('armorStoppingPower').textContent = actor.armor + '%';
        }
    };
});