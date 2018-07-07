import { Utils } from "../utils/utils";
import { Actor } from "../actors/Actor";
import colors from "../utils/colors";
import { State } from "../utils/State";
import {Player} from "../actors/player";
import {Enemy} from "../actors/Enemy";

/**
 * TODO: FIX THE MESS THIS IS
 */
export class Messages {
    static combat(Case:string, actor:Player, enemy:Enemy) {
        let playerName = Utils.span(`[${actor.name}]`, actor.role.color);
        let targetName = Utils.span(`[${enemy.name}]`, enemy.role.color);
        let str_actorDamage = Utils.span(actor.weapon.weaponDamage().toString(), colors.hitRed);
        let str_actorDamageCrit = Utils.span((actor.weapon.weaponDamage() * 2).toString(), colors.hitRed);
        let deathCharge = actor.currency * 0.45;
        let pronounP = enemy.gender === "Female" ? "her" : "his";
        let pronounS = enemy.gender === "Female" ? "she" : "he";
        let pronounO = enemy.gender === "Female" ? "her" : "him";
        let str_damageIndicator = Utils.span(
            `(${enemy.health + actor.weapon.weaponDamage()}=>${enemy.health})`,
            colors.damageGreen
        );
        let str_damageIndicatorCrit = Utils.span(
            `(${enemy.health + actor.weapon.weaponDamage() * 2}=>${enemy.health})`,
            colors.damageGreen
        );
        let str_damageIndicatorCrit0 = Utils.span(
            `(${enemy.health + actor.weapon.weaponDamage() * 2}=>0)`,
            colors.damageGreen
        );
        let str_damageIndicator0 = Utils.span(`(${enemy.health + actor.weapon.weaponDamage()}=>0)`, colors.damageGreen);
        let str_enemyDamageIndicator = Utils.span(
            `(${actor.health + enemy.weapon.damage}=>${actor.health})`,
            colors.damageGreen
        );
        let str_Critical = Utils.span("CRITICAL! ", colors.hitRed);
        let hitMiss = Utils.span("MISS! ", colors.hitRed);
        let droppedItem = str_actorItem(enemy) == undefined ? null : str_actorItem(enemy);
        let droppedWeapon = Utils.span(`&#91;${enemy.weapon.name}&#93;`, colors.itemYellow);
        let currencyAmount = Utils.span(`&#91;${enemy.currency}&#93;`, colors.itemYellow);
        let playerLVL = Utils.span(actor.level.toString(), colors.damageGreen);
        let playerLVLprev = Utils.span((actor.level - 1).toString(), colors.damageGreen);

        function str_weaponName(ownerActor:Actor) {
            return Utils.span(`&#91;${ownerActor.weapon.name}&#93;`, colors.weaponBlue);
        }

        function str_actorRole(ownerActor:Actor) {
            return Utils.span(`&#91;${ownerActor.role.name}&#93;`, ownerActor.role.color);
        }

        function str_actorItem(ownerActor:Actor) {
            return Utils.span(`&#91;${ownerActor.item.name}&#93;`, colors.itemYellow);
        }

        let damageType = actor.weapon.weaponType == "Melee" ? "hit" : "shot";
        let playerWeapon = str_weaponName(actor);
        let enemyHealth = enemy.health <= 0 ? str_damageIndicator0 : str_damageIndicator;
        let enemyHealthCrit = enemy.health <= 0 ? str_damageIndicatorCrit0 : str_damageIndicatorCrit;

        function randomcase(amount: number) {
            return Math.floor(Math.random() * amount);
        }

        switch (Case) {
            ///ACTOR MESSAGES///
            case "hitNormal":
                Utils.printLine(
                    `${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${str_actorDamage} damage. ${enemyHealth}`
                );
                break;
            case "hitCritical":
                Utils.printLine(
                    `${str_Critical} ${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${str_actorDamage} damage. ${enemyHealthCrit}`
                );
                break;
            case "hitCriticalKill":
                Utils.printLine(
                    `${str_Critical} ${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${str_actorDamageCrit} damage. ${str_damageIndicatorCrit0}`
                );
                break;
            case "kill":
                Utils.printLine(`${playerName} killed ${targetName} !`);
                break;
            case "hitMiss":
                switch (randomcase(3)) {
                    case 0:
                        Utils.printLine(
                            `${hitMiss} ${playerName} tried to attack ${targetName} but ${pronounS} was able to dodge the ${damageType}!`
                        );
                        break;
                    case 1:
                        Utils.printLine(`${hitMiss} ${playerName} tried to attack ${targetName} but missed!`);
                        break;
                    case 2:
                        Utils.printLine(
                            `${hitMiss} ${targetName} was able to jump away from ${playerName}'s ${damageType}!`
                        );
                        break;
                }
                break;
            case "encounter":
                Utils.printLine(
                    `You encountered ${targetName}. Just by looking at ${pronounP} attire you can see ${pronounS} is a ${str_actorRole(
                        enemy
                    )}.`
                );
                break;
            case "encounterSame":
                Utils.printLine(
                    `You encountered ${targetName}. However you see ${pronounP} is also ${str_actorRole(
                        enemy
                    )} so you just greet ${pronounO} and venture forward.`
                );
                break;
            ///Level up message
            case "levelUp":
                Utils.printLine(
                    `You leveled up from ${Utils.span((actor.level - 1).toString(), colors.damageGreen)} to ${playerLVL}!`
                );
                break;
            ///Death message
            case "death":
                Utils.printLine(`You have been killed by ${targetName}`);
                break;
            case "youredead":
                Utils.printLine("You are dead, try respawning!");
                break;
            ///Respawn message
            case "respawn":
                Utils.printLine(
                    `${Utils.span(
                        "[Nanobots]",
                        colors.weaponBlue
                    )} from TraumaTeam revitalize you. You have been charged ${deathCharge} yens.`
                );
                break;
            ///Looking for loot message
            case "loot":
                switch (randomcase(3)) {
                    case 0:
                        Utils.printLine(
                            `As the blood still flows from ${targetName}'s liquidated carcass, you search through ${pronounP} belongings.`
                        );
                        break;
                    case 1:
                        Utils.printLine(`You search through ${targetName}'s belongings.`);
                        break;
                    case 2:
                        Utils.printLine(
                            `As you advance towards ${targetName}'s dead body you look around if ${pronounS} has anything valuable with ${pronounO}.`
                        );
                        break;
                }
                break;
            case "lootFind":
                Utils.printLine(`You found ${droppedItem}.`);
                break;
            case "lootFindSame":
                Utils.printLine(`You found ${droppedItem} but as you already have it, you let it be.`);
                break;
            case "lootFindNew":
                Utils.printLine(
                    `You found ${droppedItem}. It looks much better than your current equipment so you swap them.`
                );
                break;
            case "lootFindOld":
                Utils.printLine(
                    `You found ${droppedItem} but it looks worse than your current equipment so you let it be.`
                );
                break;
            case "lootWeaponBetter":
                Utils.printLine(
                    `The enemy dropped ${droppedWeapon}. It appears to be much more powerful than your ${playerWeapon} so you take it.`
                );
                break;
            case "lootWeaponWorse":
                Utils.printLine(
                    `The enemy dropped ${pronounO} ${droppedWeapon}. It's worse than your current weapon so you let it be.`
                );
                break;
            case "noMoney":
                Utils.printLine("Your funds are insufficient.");
                break;
            case "getMoney":
                Utils.printLine(`You found ${currencyAmount} yens.`);
                break;
            case "lostMoney":
                Utils.printLine(`You lost ${currencyAmount} yens.`);
                break;
        }
    }

    static encounter(Case:string, actor: Actor, target: Actor) {
        let targetName = Utils.span(`&#91;${target.name}&#93;`, target.color);
        let playerName = Utils.span(`&#91;${actor.name}&#93;`, actor.color);
        switch (Case) {
            case "distance":
                Utils.printLine(
                    `The distance between you and ${targetName} is ${Math.floor(
                        Utils.distance(actor.position, target.position)
                    )}m.`
                );
                break;
        }
    }
}
