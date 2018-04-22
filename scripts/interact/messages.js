define(['list_weapons', 'utils', 'color', 'stats', "math"], function (weapons, utils, color, stats, math) {
    return {
        combat: function (Case, actor, enemy) {

            let enemyName = utils.span("&#91;" + enemy.name + "&#93;", enemy.color);
            let playerName = utils.span("&#91;" + actor.name + "&#93;", actor.color);

            let str_actorDamage = utils.span(actor.damage, color.hitRed);
            let str_actorDamageCrit = utils.span(actor.damage * 2, color.hitRed);

            let str_enemyHealth = enemy.health;
            let pronounP = (enemy.gender === "Female" ? 'her' : 'his');
            let pronounS = (enemy.gender === "Female" ? 'she' : 'he');
            let pronounO = (enemy.gender === "Female" ? 'her' : 'him');

            let str_damageIndicator = utils.span('(' + (enemy.health + actor.damage) + "=>" + enemy.health + ')', color.damageGreen);
            let str_damageIndicatorCrit = utils.span('(' + (enemy.health + actor.damage * 2) + "=>" + enemy.health + ')', color.damageGreen);
            let str_damageIndicatorCrit0 = utils.span('(' + (enemy.health + actor.damage * 2) + "=>0)", color.damageGreen);
            let str_damageIndicator0 = utils.span('(' + (enemy.health + actor.damage) + "=>0)", color.damageGreen);

            let str_enemyDamageIndicator = utils.span('(' + (actor.health + enemy.damage) + "=>" + actor.health + ')', color.damageGreen);

            let str_Critical = utils.span("CRITICAL! ", color.hitRed);
            let hitMiss = utils.span("MISS! ", color.hitRed);

            let droppedItem = str_actorItem(enemy);
            let droppedWeapon = utils.span("&#91;" + enemy.weapon.name + "&#93;", color.itemYellow);
            
            let currencyAmount = utils.span("&#91;" + enemy.currency + "&#93;", color.itemYellow);

            let playerLVL = utils.span((actor.level), color.damageGreen);
            let playerLVLprev = utils.span((actor.level - 1), color.damageGreen);

            function str_weaponName(ownerActor) {
                return utils.span("&#91;" + ownerActor.weapon.name + "&#93;", color.weaponBlue);
            }

            function str_actorRole(ownerActor) {
                return utils.span("&#91;" + ownerActor.role + "&#93;", ownerActor.color);
            }

            function str_actorItem(ownerActor) {
                return utils.span("&#91;" + ownerActor.items.name + "&#93;", color.itemYellow);
            }
            let damageType = actor.weapon.weaponType == "Melee" ? "hit" : "shot";
            let playerWeapon = str_weaponName(actor);
            let enemyHealth = enemy.health <= 0 ? str_damageIndicator0 : str_damageIndicator;
            let enemyHealthCrit = enemy.health <= 0 ? str_damageIndicatorCrit0 : str_damageIndicatorCrit

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
                    random = Math.floor(Math.random() * 3);
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
                    utils.printLine(`You encountered ${enemyName}. However you see ${pronounP} is also ${str_actorRole(enemy)} so you just greet ${pronounO} and venture forward.`);
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
                    random = Math.floor(Math.random() * 3);
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
        },
        encounter: function (Case, actor, enemy) {
            let enemyName = utils.span("&#91;" + enemy.name + "&#93;", enemy.color);
            let playerName = utils.span("&#91;" + actor.name + "&#93;", actor.color);
            switch (Case) {
                case 'distance':
                    utils.printLine(`The distance between you and ${enemyName} is ${Math.floor(math.distance(actor.position, enemy.position))}m.`);
                    break;
            }
        }

    };
});
