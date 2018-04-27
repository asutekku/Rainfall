define(["require", "exports", "../Utils/Utils", "../utils/colors"], function (require, exports, Utils_1, colors_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Messages = /** @class */ (function () {
        function Messages() {
        }
        Messages.combat = function (Case, actor, enemy) {
            var enemyName = Utils_1.Utils.span("&#91;" + enemy.name + "&#93;", enemy.role.color);
            var playerName = Utils_1.Utils.span("&#91;" + actor.name + "&#93;", actor.role.color);
            var str_actorDamage = Utils_1.Utils.span(actor.damage, colors_1.default.hitRed);
            var str_actorDamageCrit = Utils_1.Utils.span(actor.damage * 2, colors_1.default.hitRed);
            var deathCharge = actor.currency * 0.45;
            var str_enemyHealth = enemy.health;
            var pronounP = (enemy.gender === "Female" ? 'her' : 'his');
            var pronounS = (enemy.gender === "Female" ? 'she' : 'he');
            var pronounO = (enemy.gender === "Female" ? 'her' : 'him');
            var str_damageIndicator = Utils_1.Utils.span("(" + (enemy.health + actor.damage) + "=>" + enemy.health + ")", colors_1.default.damageGreen);
            var str_damageIndicatorCrit = Utils_1.Utils.span("(" + (enemy.health + actor.damage * 2) + "=>" + enemy.health + ")", colors_1.default.damageGreen);
            var str_damageIndicatorCrit0 = Utils_1.Utils.span("(" + (enemy.health + actor.damage * 2) + "=>0)", colors_1.default.damageGreen);
            var str_damageIndicator0 = Utils_1.Utils.span("(" + (enemy.health + actor.damage) + "=>0)", colors_1.default.damageGreen);
            var str_enemyDamageIndicator = Utils_1.Utils.span("(" + (actor.health + enemy.damage) + "=>" + actor.health + ")", colors_1.default.damageGreen);
            var str_Critical = Utils_1.Utils.span("CRITICAL! ", colors_1.default.hitRed);
            var hitMiss = Utils_1.Utils.span("MISS! ", colors_1.default.hitRed);
            var droppedItem = str_actorItem(enemy);
            var droppedWeapon = Utils_1.Utils.span("&#91;" + enemy.weapon.name + "&#93;", colors_1.default.itemYellow);
            var currencyAmount = Utils_1.Utils.span("&#91;" + enemy.currency + "&#93;", colors_1.default.itemYellow);
            var playerLVL = Utils_1.Utils.span((actor.level), colors_1.default.damageGreen);
            var playerLVLprev = Utils_1.Utils.span((actor.level - 1), colors_1.default.damageGreen);
            function str_weaponName(ownerActor) {
                return Utils_1.Utils.span("&#91;" + ownerActor.weapon.name + "&#93;", colors_1.default.weaponBlue);
            }
            function str_actorRole(ownerActor) {
                return Utils_1.Utils.span("&#91;" + ownerActor.role.name + "&#93;", ownerActor.role.color);
            }
            function str_actorItem(ownerActor) {
                return Utils_1.Utils.span("&#91;" + ownerActor.items.name + "&#93;", colors_1.default.itemYellow);
            }
            var damageType = actor.weapon.weaponType == "Melee" ? "hit" : "shot";
            var playerWeapon = str_weaponName(actor);
            var enemyHealth = enemy.health <= 0 ? str_damageIndicator0 : str_damageIndicator;
            var enemyHealthCrit = enemy.health <= 0 ? str_damageIndicatorCrit0 : str_damageIndicatorCrit;
            function randomcase(amount) {
                return Math.floor(Math.random() * amount);
            }
            switch (Case) {
                ///ACTOR MESSAGES///
                case 'hitNormal':
                    Utils_1.Utils.printLine(playerName + " " + damageType + " " + enemyName + " with " + playerWeapon + " and caused " + str_actorDamage + " damage. " + enemyHealth);
                    break;
                case 'hitCritical':
                    Utils_1.Utils.printLine(str_Critical + " " + playerName + " " + damageType + " " + enemyName + " with " + playerWeapon + " and caused " + str_actorDamage + " damage. " + enemyHealthCrit);
                    break;
                case 'hitCriticalKill':
                    Utils_1.Utils.printLine(str_Critical + " " + playerName + " " + damageType + " " + enemyName + " with " + playerWeapon + " and caused " + str_actorDamageCrit + " damage. " + str_damageIndicatorCrit0);
                    break;
                case 'kill':
                    Utils_1.Utils.printLine(playerName + " killed " + enemyName + " !");
                    break;
                case 'hitMiss':
                    switch (randomcase(3)) {
                        case 0:
                            Utils_1.Utils.printLine(hitMiss + " " + playerName + " tried to attack " + enemyName + " but " + pronounS + " was able to dodge the " + damageType + "!");
                            break;
                        case 1:
                            Utils_1.Utils.printLine(hitMiss + " " + playerName + " tried to attack " + enemyName + " but missed!");
                            break;
                        case 2:
                            Utils_1.Utils.printLine(hitMiss + " " + enemyName + " was able to jump away from " + playerName + "'s " + damageType + "!");
                            break;
                    }
                    break;
                case 'encounter':
                    Utils_1.Utils.printLine("You encountered " + enemyName + ". Just by looking at " + pronounP + " attire you can see " + pronounS + " is a " + str_actorRole(enemy) + ".");
                    break;
                case 'encounterSame':
                    Utils_1.Utils.printLine("You encountered " + enemyName + ". However you see " + pronounP + " is also " + str_actorRole(enemy) + " so you just greet " + pronounO + " and venture forward.");
                    break;
                ///Level up message
                case 'levelUp':
                    Utils_1.Utils.printLine("You leveled up from " + Utils_1.Utils.span((actor.level - 1), colors_1.default.damageGreen) + " to " + playerLVL + "!");
                    break;
                ///Death message
                case 'death':
                    Utils_1.Utils.printLine("You have been killed by " + enemyName);
                    break;
                case 'youredead':
                    Utils_1.Utils.printLine("You are dead, try respawning!");
                    break;
                ///Respawn message
                case 'respawn':
                    Utils_1.Utils.printLine(Utils_1.Utils.span("[Nanobots]", colors_1.default.weaponBlue) + " from TraumaTeam revitalize you. You have been charged " + deathCharge + " yens.");
                    break;
                ///Looking for loot message
                case 'loot':
                    switch (randomcase(3)) {
                        case 0:
                            Utils_1.Utils.printLine("As the blood still flows from " + enemyName + "'s liquidated carcass, you search through " + pronounP + " belongings.");
                            break;
                        case 1:
                            Utils_1.Utils.printLine("You search through " + enemyName + "'s belongings.");
                            break;
                        case 2:
                            Utils_1.Utils.printLine("As you advance towards " + enemyName + "'s dead body you look around if " + pronounS + " has anything valuable with " + pronounO + ".");
                            break;
                    }
                    break;
                case 'lootFind':
                    Utils_1.Utils.printLine("You found " + droppedItem + ".");
                    break;
                case 'lootFindSame':
                    Utils_1.Utils.printLine("You found " + droppedItem + " but as you already have it, you let it be.");
                    break;
                case 'lootFindNew':
                    Utils_1.Utils.printLine("You found " + droppedItem + ". It looks much better than your current equipment so you swap them.");
                    break;
                case 'lootFindOld':
                    Utils_1.Utils.printLine("You found " + droppedItem + " but it looks worse than your current equipment so you let it be.");
                    break;
                case 'lootWeaponBetter':
                    Utils_1.Utils.printLine("The enemy dropped " + droppedWeapon + ". It appears to be much more powerful than your " + playerWeapon + " so you take it.");
                    break;
                case 'lootWeaponWorse':
                    Utils_1.Utils.printLine("The enemy dropped " + pronounO + " " + droppedWeapon + ". It's worse than your current weapon so you let it be.");
                    break;
                case 'noMoney':
                    Utils_1.Utils.printLine("Your funds are insufficient.");
                    break;
                case 'getMoney':
                    Utils_1.Utils.printLine("You found " + currencyAmount + " yens.");
                    break;
                case 'lostMoney':
                    Utils_1.Utils.printLine("You lost " + currencyAmount + " yens.");
                    break;
            }
        };
        ;
        Messages.encounter = function (Case, actor, target) {
            var targetName = Utils_1.Utils.span("&#91;" + target.name + "&#93;", target.color);
            var playerName = Utils_1.Utils.span("&#91;" + actor.name + "&#93;", actor.color);
            switch (Case) {
                case 'distance':
                    Utils_1.Utils.printLine("The distance between you and " + targetName + " is " + Math.floor(Utils_1.Utils.distance(actor.position, target.position)) + "m.");
                    break;
            }
        };
        return Messages;
    }());
    exports.Messages = Messages;
});
