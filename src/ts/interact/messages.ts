import { Utils } from "../utils/utils";
import { Actor } from "../actors/Actor";
import { State } from "../utils/State";
import { Player } from "../actors/player";
import { Enemy } from "../actors/Enemy";

export class Messages {
    static actorWeapon = (actor: Actor) => Utils.span(`[${actor.weapon.name}]`, "weaponBlue");
    static damageCrit = (actor: Actor, target: Actor): string =>
        Utils.span(`(${target.health + actor.weapon.weaponDamage() * 2}=>${target.health})`, "damageGreen");
    static damageCrit0 = (actor: Actor, target: Actor): string =>
        Utils.span(`(${target.health + actor.weapon.weaponDamage() * 2}=>0)`, "damageGreen");
    static getHealth = (actor: Actor, target: Actor): string =>
        actor.health <= 0 ? Messages.damageCrit0(actor, target) : Messages.damageCrit(actor, target);
    static actorName = (actor: Actor): string => Utils.span(`[${actor.name}]`, `${actor.role.name.toLowerCase()}Color`);
    static damageType = (actor: Actor): string => (actor.weapon.weaponType === "Melee" ? "hit" : "shot");
    static causedDamage = (actor: Actor): string => Utils.span(actor.weapon.weaponDamage().toString(), "hitRed");
    static getPron = (actor: Actor) => ({
        pronounP: actor.gender === "Female" ? "her" : "his",
        pronounS: actor.gender === "Female" ? "she" : "he",
        pronounO: actor.gender === "Female" ? "her" : "him"
    });
    static level = (actor: Actor) => Utils.span(actor.level.toString(), "damageGreen");
    static levelOld = (actor: Actor) => Utils.span((actor.level - 1).toString(), "damageGreen");
    static nanobots = Utils.span(`[Nanobots]`, "weaponBlue");
    static lootDrop = (actor: Actor) => Utils.span(`[${actor.item.name}]`, "itemYellow");
    static currencyDrop = (actor: Actor) => Utils.span(`<${actor.currency}¥>`, "itemYellow");

    static getCombatStrings = (actor: Actor, target: Actor) => ({
        playerName: Messages.actorName(actor),
        targetName: Messages.actorName(target),
        playerWeapon: Messages.actorWeapon(actor),
        playerDamage: Messages.causedDamage(actor),
        enemyHealth: Messages.getHealth(actor, target),
        damageType: Messages.damageType(actor),
        pronounP: Messages.getPron(target).pronounP,
        pronounS: Messages.getPron(target).pronounS,
        pronounO: Messages.getPron(target).pronounO,
        actorLevel: Messages.level(actor),
        actorLevelOld: Messages.levelOld(actor),
        nanobots: Messages.nanobots,
        deathCharge: actor.currency * 0.45,
        lootDrop: Messages.lootDrop(target),
        currencyDrop: Messages.currencyDrop(target)
    });

    static encounter(Case: string, actor: Actor, target: Actor) {
        const targetName: string = Utils.span(`[${target.name}]`, `${target.role.name.toLowerCase()}Color`);
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

    static logMessage = (msg: string, actor?: Actor, msgCase?: string) => {
        let v: Object;
        if (!(actor instanceof Player)) {
            v = Messages.getCombatStrings(State.currentEnemy!, State.player!);
        } else {
            v = Messages.getCombatStrings(State.player!, State.currentEnemy!);
        }
        if (!msgCase) {
            Utils.printLine(Messages.fillTemplate(msg, v));
        } else {
            switch (msgCase) {
                case "combat":
                    v = Messages.getCombatStrings(State.player!, State.currentEnemy!);
                    break;
            }
            Utils.printLine(Messages.fillTemplate(msg, v));
        }
    };

    static fillTemplate = (template: string, templateVars: Object) => {
        template = template.replace(/\${/g, "${this.");
        return new Function(`return \`${template}\`;`).call(templateVars);
    };
}
