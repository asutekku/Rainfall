define(['list_weapons', 'utils', 'color', 'stats'], function (weapons, utils, color, stats) {
    return {
        combat: function (Case, actor, enemy) {

            let enemyName = utils.span("&#91;" + enemy.name + "&#93;", enemy.color);
            var playerName = utils.span("&#91;" + actor.name + "&#93;", actor.color);

            var str_actorDamage = utils.span(actor.damage, color.hitRed);
            var str_actorDamageCrit = utils.span(actor.damage * 2, color.hitRed);

            var str_enemyHealth = enemy.health;
            var pronounP = (enemy.gender == "Female" ? 'her' : 'his');
            var pronounS = (enemy.gender == "Female" ? 'she' : 'he');
            var pronounO = (enemy.gender == "Female" ? 'her' : 'him');

            var str_damageIndicator = utils.span('(' + (enemy.health + actor.damage) + "=>" + enemy.health + ')', color.damageGreen);
            var str_damageIndicatorCrit = utils.span('(' + (enemy.health + actor.damage * 2) + "=>" + enemy.health + ')', color.damageGreen);
            var str_damageIndicatorCrit0 = utils.span('(' + (enemy.health + actor.damage * 2) + "=>0)", color.damageGreen);
            var str_damageIndicator0 = utils.span('(' + (enemy.health + actor.damage) + "=>0)", color.damageGreen);

            var str_enemyDamageIndicator = utils.span('(' + (actor.health + enemy.damage) + "=>" + actor.health + ')', color.damageGreen);

            var str_Critical = utils.span("CRITICAL! ", color.hitRed);
            var str_Miss = utils.span("MISS! ", color.hitRed);
            var deathCharge = utils.span("[" + Math.floor(stats.player.money*.45) + "]", color.itemYellow);

            var droppedItem = str_actorItem(enemy);
            var droppedWeapon = utils.span("&#91;" + enemy.weapon.name + "&#93;", color.itemYellow);
            
            var currencyAmount = utils.span("&#91;" + enemy.currency + "&#93;", color.itemYellow);

            var playerLVL = utils.span((actor.level), color.damageGreen);
            var playerLVLprev = utils.span((actor.level - 1), color.damageGreen);

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
            var playerWeapon = str_weaponName(actor);
            var enemyHealth = enemy.health <= 0 ? str_damageIndicator0 : str_damageIndicator;
            var enemyHealthCrit = enemy.health <= 0 ? str_damageIndicatorCrit0 : str_damageIndicatorCrit

            switch (Case) {
                ///ACTOR MESSAGES///
                case 'hitNormal':
                    utils.printLine(`${playerName} ${damageType} ${enemyName} with${playerWeapon} and caused ${str_actorDamage} damage. ${enemyHealth}`);
                    break;
                case 'hitCritical':
                    utils.printLine(`${str_Critical} ${playerName} ${damageType} ${enemyName} with ${playerWeapon} and caused ${str_actorDamage} damage. ${enemyHealthCrit}`);
                    break;
                case 'hitCriticalKill':
                    utils.printLine(`${str_Critical} ${playerName} ${damageType} ${enemyName} with ${playerWeapon} and caused ${str_actorDamageCrit} damage. ${str_damageIndicatorCrit0}`);
                    break;
                case 'kill':
                    utils.printLine(`${playerName} killed ${enemyName} !`);
                    break;
                case 'hitMiss':
                    var random = Math.floor(Math.random() * 3);
                    switch (random) {
                        case 0:
                            utils.printLine(`${hitMiss} ${playerName} tried to attack ${enemyName} but ${pronounS} was able to dodge the ${damageType}!`);
                            break;
                        case 1:
                            utils.printLine(`${hitMiss} ${playerName} tried to attack ${enemyName} but missed!`);
                            break;
                        case 2:
                            utils.printLine(`${hitMiss} ${enemyName} + " was able to jump away from ${playerName}'s ${damageType}!`);
                            break;
                    }
                    break;
                case 'encounter':
                    utils.printLine(`You encountered ${enemyName}. Just by looking at ${pronounP} attire you can see ${pronounS} is a ${str_actorRole(enemy)}.`);
                    break;
                case 'encounterSame':
                    utils.printLine(`You encountered ${enemyName}. You see ${pronounP} is also ${str_actorRole(enemy)} so you just greet ${pronounO} and venture forward.`);
                    break;
                    ///Level up message
                case 'levelUp':
                    utils.printLine(`You leveled up from ${utils.span((actor.level - 1), color.damageGreen)} to ${playerLVL}!`);
                    break;
                    ///Death message
                case 'death':
                    utils.printLine(`You have been killed by ${enemyName}`);
                    break;
                case 'youredead':
                    utils.printLine("You are dead, try respawning!");
                    break;
                    ///Respawn message
                case 'respawn':
                    utils.printLine(utils.span("[Nanobots]", color.weaponBlue) + ` from TraumaTeam revitalize you. You have been charged ${deathCharge} yens.`);
                    break;
                    ///Looking for loot message
                case 'loot':
                    var random = Math.floor(Math.random() * 3);
                    switch (random) {
                        case 0:
                            utils.printLine(`As the blood still flows from ${enemyName}'s liquidated carcass, you search through ${pronounP} belongings.`);
                            break;
                        case 1:
                            utils.printLine(`You search through ${enemyName}'s belongings.`);
                            break;
                        case 2:
                            utils.printLine(`As you advance towards ${enemyName}'s dead body you look around if ${pronounS} has anything valuable with ${pronounO}.`);
                            break;
                    }
                    break;
                case 'lootFind':
                    utils.printLine(`You found ${droppedItem}.`);
                    break;
                case 'lootFindSame':
                    utils.printLine(`You found ${droppedItem} but as you already have it, you let it be.`);
                    break;
                case 'lootFindNew':
                    utils.printLine(`You found ${droppedItem}. It looks much better than your current equipment so you swap them.`);
                    break;
                case 'lootFindOld':
                    utils.printLine(`You found ${droppedItem} but it looks worse than your current equipment so you let it be.`);
                    break;
                case 'lootWeaponBetter':
                    utils.printLine(`The enemy dropped ${droppedWeapon}. It appears to be much more powerful than your ${playerWeapon} so you take it.`);
                    break;
                case 'lootWeaponWorse':
                    utils.printLine(`The enemy dropped ${pronounO} ${droppedWeapon}. It's worse than your current weapon so you let it be.`);
                    break;
                case 'noMoney':
                    utils.printLine("Your funds are insufficient.");
                    break;
                case 'getMoney':
                    utils.printLine(`You found ${currencyAmount} yens.`);
                    break;
                case 'lostMoney':
                    utils.printLine(`You lost ${currencyAmount} yens.`);
                    break;
            }
        }

    };
});
