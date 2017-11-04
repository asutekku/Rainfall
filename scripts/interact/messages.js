define(['list_weapons', 'utils', 'color', 'stats'], function (weapons, utils, color, stats) {
    return {
        combat: function (Case, actor, enemy) {

            var str_enemyName = utils.span("&#91;" + enemy.name + "&#93;", enemy.color);
            var str_actorName = utils.span("&#91;" + actor.name + "&#93;", actor.color);

            var str_actorDamage = utils.span(actor.damage, color.hitRed);
            var str_actorDamageCrit = utils.span(actor.damage * 2, color.hitRed);

            var str_enemyHealth = enemy.health;
            var str_enemyPronPossesive = (enemy.gender == "Female" ? 'her' : 'his');
            var str_enemyPronSubject = (enemy.gender == "Female" ? 'she' : 'he');
            var str_enemyPronObject = (enemy.gender == "Female" ? 'her' : 'him');

            var str_damageIndicator = utils.span('(' + (enemy.health + actor.damage) + "=>" + enemy.health + ')', color.damageGreen);
            var str_damageIndicatorCrit = utils.span('(' + (enemy.health + actor.damage * 2) + "=>" + enemy.health + ')', color.damageGreen);
            var str_damageIndicatorCrit0 = utils.span('(' + (enemy.health + actor.damage * 2) + "=>0)", color.damageGreen);
            var str_damageIndicator0 = utils.span('(' + (enemy.health + actor.damage) + "=>0)", color.damageGreen);

            var str_enemyDamageIndicator = utils.span('(' + (actor.health + enemy.damage) + "=>" + actor.health + ')', color.damageGreen);

            var str_Critical = utils.span("CRITICAL! ", color.hitRed);
            var str_Miss = utils.span("MISS! ", color.hitRed);
            
            var yens = utils.span("&#91;" + enemy.currency + "&#93;", color.itemYellow);

            function str_weaponName(ownerActor) {
                return utils.span("&#91;" + ownerActor.weapon.name + "&#93;", color.weaponBlue);
            }

            function str_actorRole(ownerActor) {
                return utils.span("&#91;" + ownerActor.role + "&#93;", ownerActor.color);
            }

            function str_actorItem(ownerActor) {
                return utils.span("&#91;" + ownerActor.items.name + "&#93;", color.itemYellow);
            }
            var damageType = actor.weapon.weaponType == "Melee" ? "hit" : "shot";

            switch (Case) {
                ///ACTOR MESSAGES///
                case 'hitNormal':
                    utils.printLine(str_actorName + " " + damageType + " " + str_enemyName + " with " + str_weaponName(actor) + " and caused " + str_actorDamage + " damage. " + (enemy.health <= 0 ? str_damageIndicator0 : str_damageIndicator));
                    break;
                case 'hitCritical':
                    utils.printLine(str_Critical + str_actorName + " " + damageType + " " + str_enemyName + " with " + str_weaponName(actor) + " and caused " + str_actorDamage + " damage. " + (enemy.health <= 0 ? str_damageIndicatorCrit0 : str_damageIndicatorCrit));
                    break;
                case 'hitCriticalKill':
                    utils.printLine(str_Critical + str_actorName + " " + damageType + " " + str_enemyName + " with " + str_weaponName(actor) + " and caused " + str_actorDamageCrit + " damage. " + str_damageIndicatorCrit0);
                    break;
                case 'kill':
                    utils.printLine(str_actorName + " killed " + str_enemyName + " !");
                    break;
                case 'hitMiss':
                    var random = Math.floor(Math.random() * 3);
                    switch (random) {
                        case 0:
                            utils.printLine(str_Miss + str_actorName + " tried to attack " + str_enemyName + " but " + str_enemyPronSubject + " was able to dodge the " + damageType + "!");
                            break;
                        case 1:
                            utils.printLine(str_Miss + str_actorName + " tried to attack " + str_enemyName + " but missed!");
                            break;
                        case 2:
                            utils.printLine(str_Miss + str_enemyName + " was able to jump away from " + str_actorName + "'s " + damageType + "!");
                            break;
                    }
                    break;
                case 'encounter':
                    utils.printLine("You encountered " + str_enemyName + ". Just by looking at " + str_enemyPronPossesive + " attire you can see " + str_enemyPronSubject + " is a " + str_actorRole(enemy) + ".");
                    break;
                case 'encounterSame':
                    utils.printLine("You encountered " + str_enemyName + ". You see " + str_enemyPronSubject + " is also " + str_actorRole(enemy) + " so you just greet " + str_enemyPronObject + " and keep going.");
                    break;
                    ///Level up message
                case 'levelUp':
                    utils.printLine("You leveled up from " + utils.span((actor.level - 1), color.damageGreen) + " to " + utils.span(actor.level, color.damageGreen) + " !");
                    break;
                    ///Death message
                case 'death':
                    utils.printLine("You have been killed by " + str_enemyName);
                    break;
                case 'youredead':
                    utils.printLine("You are dead, try respawning!");
                    break;
                    ///Respawn message
                case 'respawn':
                    utils.printLine(utils.span("[Nanobots]", color.weaponBlue) + " from TraumaTeam revitalize you. You have been charged " + utils.span("[" + Math.floor(stats.player.money*.45) + "]", color.itemYellow) + " yens.");
                    break;
                    ///Looking for loot message
                case 'loot':
                    var random = Math.floor(Math.random() * 3);
                    switch (random) {
                        case 0:
                            utils.printLine("As the blood still flows from " + str_enemyName + "'s liquidated carcass, you search through " + str_enemyPronPossesive + " belongings.");
                            break;
                        case 1:
                            utils.printLine("You search through " + str_enemyName + "'s belongings.");
                            break;
                        case 2:
                            utils.printLine("As you advance towards " + str_enemyName + "'s dead body you look around if " + str_enemyPronSubject + " has anything valuable with " + str_enemyPronObject + ".");
                            break;
                    }
                    break;
                case 'lootFind':
                    utils.printLine("You found " + str_actorItem(enemy) + ".");
                    break;
                case 'lootFindSame':
                    utils.printLine("You found " + str_actorItem(enemy) + " but as you already have it, you let it be.");
                    break;
                case 'lootFindNew':
                    utils.printLine("You found " + str_actorItem(enemy) + ". It looks much better than your current equipment so you swap them.");
                    break;
                case 'lootFindOld':
                    utils.printLine("You found " + str_actorItem(enemy) + " but it looks worse than your current equipment so you let it be.");
                    break;
                case 'lootWeaponBetter':
                    utils.printLine("The hostile dropped " + utils.span("&#91;" + enemy.weapon.name + "&#93;", color.itemYellow) + ". It appears to be much more powerful than your " + str_weaponName(actor) + " so you take it.");
                    break;
                case 'lootWeaponWorse':
                    utils.printLine("The hostile dropped " + str_enemyPronPossesive + " " + utils.span("&#91;" + enemy.weapon.name + "&#93;", color.itemYellow) + ". It's worse than your current weapon so you let it be.");
                    break;
                case 'noMoney':
                    utils.printLine("Your funds are insufficient.");
                    break;
                case 'getMoney':
                    utils.printLine("You found " + yens + " yens.");
                    break;
                case 'lostMoney':
                    utils.printLine("You lost " + yens + " yens.");
                    break;
            }
        }

    };
});
