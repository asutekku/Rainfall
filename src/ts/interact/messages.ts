import { Utils } from "../utils/utils";
import { Actor } from "../actors/Actor";
import { State } from "../utils/State";
import { Player } from "../actors/player";
import { Enemy } from "../actors/Enemy";

/**
 * TODO: FIX THE MESS THIS IS
 */
export class Messages {
    static combat(Case: string, actor: Player, enemy: Enemy) {
        let playerName = Utils.span(`[${actor.name}]`, `${actor.role.name.toLowerCase()}Color`);
        let targetName = Utils.span(`[${enemy.name}]`, `${enemy.role.name.toLowerCase()}Color`);
        let str_actorDamage = Utils.span(actor.weapon.weaponDamage().toString(), "hitRed");
        let str_actorDamageCrit = Utils.span((actor.weapon.weaponDamage() * 2).toString(), "hitRed");
        let deathCharge = actor.currency * 0.45;
        let pronounP = enemy.gender === "Female" ? "her" : "his";
        let pronounS = enemy.gender === "Female" ? "she" : "he";
        let pronounO = enemy.gender === "Female" ? "her" : "him";
        let str_damageIndicator = Utils.span(
            `(${enemy.health + actor.weapon.weaponDamage()}=>${enemy.health})`,
            "damageGreen"
        );
        let str_damageIndicatorCrit = Utils.span(
            `(${enemy.health + actor.weapon.weaponDamage() * 2}=>${enemy.health})`,
            "damageGreen"
        );
        let str_damageIndicatorCrit0 = Utils.span(
            `(${enemy.health + actor.weapon.weaponDamage() * 2}=>0)`,
            "damageGreen"
        );
        let str_damageIndicator0 = Utils.span(`(${enemy.health + actor.weapon.weaponDamage()}=>0)`, "damageGreen");
        let str_enemyDamageIndicator = Utils.span(
            `(${actor.health + enemy.weapon.damage}=>${actor.health})`,
            "damageGreen"
        );
        let str_Critical = Utils.span("CRITICAL! ", "hitRed");
        let hitMiss = Utils.span("MISS! ", "hitRed");
        let droppedItem = str_actorItem(enemy) == undefined ? null : str_actorItem(enemy);
        let droppedWeapon = Utils.span(`[${enemy.weapon.name}]`, "itemYellow");
        let currencyAmount = Utils.span(`[${enemy.currency}]`, "itemYellow");
        let playerLVL = Utils.span(actor.level.toString(), "damageGreen");
        let playerLVLprev = Utils.span((actor.level - 1).toString(), "damageGreen");

        function str_weaponName(ownerActor: Actor): string {
            return Utils.span(`[${ownerActor.weapon.name}]`, "weaponBlue");
        }

        function str_actorRole(ownerActor: Actor): string {
            return Utils.span(`[${ownerActor.role.name}]`, ownerActor.role.color);
        }

        function str_actorItem(ownerActor: Actor): string {
            return Utils.span(`[${ownerActor.item.name}]`, "itemYellow");
        }

        let damageType = actor.weapon.weaponType == "Melee" ? "hit" : "shot";
        let playerWeapon = str_weaponName(actor);
        let enemyHealth = enemy.health <= 0 ? str_damageIndicator0 : str_damageIndicator;
        let enemyHealthCrit = enemy.health <= 0 ? str_damageIndicatorCrit0 : str_damageIndicatorCrit;

        function randomcase(amount: number) {
            return Math.floor(Math.random() * amount);
        }

        let lineToPrint = "";

        switch (Case) {
            ///ACTOR MESSAGES///
            case "hitNormal":
                lineToPrint = `${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${str_actorDamage} damage. ${enemyHealth}`;
                break;
            case "hitCritical":
                lineToPrint = `${str_Critical} ${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${str_actorDamage} damage. ${enemyHealthCrit}`;
                break;
            case "hitCriticalKill":
                lineToPrint = `${str_Critical} ${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${str_actorDamageCrit} damage. ${str_damageIndicatorCrit0}`;
                break;
            case "kill":
                lineToPrint = `${playerName} killed ${targetName}!`;
                break;
            case "hitMiss":
                switch (randomcase(3)) {
                    case 0:
                        lineToPrint = `${hitMiss} ${playerName} tried to attack ${targetName} but ${pronounS} was able to dodge the ${damageType}!`;
                        break;
                    case 1:
                        lineToPrint = `${hitMiss} ${playerName} tried to attack ${targetName} but missed!`;
                        break;
                    case 2:
                        lineToPrint = `${hitMiss} ${targetName} was able to jump away from ${playerName}'s ${damageType}!`;
                        break;
                }
                break;
            case "encounter":
                lineToPrint = `You encountered ${targetName}. Just by looking at ${pronounP} attire you can see ${pronounS} is a ${str_actorRole(
                    enemy
                )}.`;
                break;
            case "encounterSame":
                lineToPrint = `You encountered ${targetName}. However you see ${pronounP} is also ${str_actorRole(
                    enemy
                )} so you just greet ${pronounO} and venture forward.`;
                break;
            ///Level up message
            case "levelUp":
                lineToPrint = `You leveled up from ${Utils.span(
                    (actor.level - 1).toString(),
                    "damageGreen"
                )} to ${playerLVL}!`;
                break;
            ///Death message
            case "death":
                lineToPrint = `You have been killed by ${targetName}`;
                break;
            case "youredead":
                lineToPrint = "You are dead, try respawning!";
                break;
            ///Respawn message
            case "respawn":
                lineToPrint = `${Utils.span(
                    `[Nanobots]`,
                    "weaponBlue"
                )} from TraumaTeam revitalize you. You have been charged ${deathCharge} yens.`;
                break;
            ///Looking for loot message
            case "loot":
                switch (randomcase(3)) {
                    case 0:
                        lineToPrint = `As the blood still flows from ${targetName}'s liquidated carcass, you search through ${pronounP} belongings.`;
                        break;
                    case 1:
                        lineToPrint = `You search through ${targetName}'s belongings.`;
                        break;
                    case 2:
                        lineToPrint = `As you advance towards ${targetName}'s dead body you look around if ${pronounS} has anything valuable with ${pronounO}.`;
                        break;
                }
                break;
            case "lootFind":
                lineToPrint = `You found ${droppedItem}.`;
                break;
            case "lootFindSame":
                lineToPrint = `You found ${droppedItem} but as you already have it, you let it be.`;
                break;
            case "lootFindNew":
                lineToPrint = `You found ${droppedItem}. It looks much better than your current equipment so you swap them.`;
                break;
            case "lootFindOld":
                lineToPrint = `You found ${droppedItem} but it looks worse than your current equipment so you let it be.`;
                break;
            case "lootWeaponBetter":
                lineToPrint = `The enemy dropped ${droppedWeapon}. It appears to be much more powerful than your ${playerWeapon} so you take it.`;
                break;
            case "lootWeaponWorse":
                lineToPrint = `The enemy dropped ${pronounO} ${droppedWeapon}. It's worse than your current weapon so you let it be.`;
                break;
            case "noMoney":
                lineToPrint = "Your funds are insufficient.";
                break;
            case "getMoney":
                lineToPrint = `You found ${currencyAmount} yens.`;
                break;
            case "lostMoney":
                lineToPrint = `You lost ${currencyAmount} yens.`;
                break;
        }
        Utils.printLine(lineToPrint);
    }

    static encounter(Case: string, actor: Actor, target: Actor) {
        let targetName = Utils.span(`[${target.name}]`, target.color);
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
