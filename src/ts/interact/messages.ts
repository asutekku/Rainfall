import {Actor} from '../actors/Actor';
import {Player} from '../actors/player';
import {State} from '../utils/State';
import {Utils} from '../utils/utils';
import {MessageCombat} from './messageSchema';
import {GameObject} from "../items/GameObject";

export class Messages {
    public static nanobots = Utils.span(`[Nanobots]`, 'weaponBlue');
    public static actorWeapon = (actor: Actor) => Utils.span(`${actor.weapon.name}]`);
    public static damageCrit = (actor: Actor, target: Actor): string =>
        Utils.span(`(${target.health + actor.weapon.getDamage() * 2} => ${target.health})`, 'damageGreen');
    public static damageCrit0 = (actor: Actor, target: Actor): string =>
        Utils.span(`(${target.health + actor.weapon.getDamage() * 2} => 0)`, 'damageGreen');
    public static getHealth = (actor: Actor, target: Actor): string =>
        actor.health <= 0 ? Messages.damageCrit0(actor, target) : Messages.damageCrit(actor, target);
    public static actorName = (actor: Actor): string => Utils.span(`[${actor.name}]`, `${actor.role.name.toLowerCase()}Color`);
    public static damageType = (actor: Actor): string => (actor.weapon.weaponType === 'Melee' ? 'hit' : 'shot');
    public static causedDamage = (actor: Actor): string => Utils.span(actor.weapon.getDamage().toString(), 'hitRed');
    public static getPronoun = (actor: Actor) => ({
        pronounP: actor.gender === 'Female' ? 'her' : 'his',
        pronounS: actor.gender === 'Female' ? 'she' : 'he',
        pronounO: actor.gender === 'Female' ? 'her' : 'him',
    });
    public static level = (actor: Actor) => Utils.span(actor.level.toString(), 'damageGreen');
    public static levelOld = (actor: Actor) => Utils.span((actor.level - 1).toString(), 'damageGreen');
    public static lootDrop = (actor: Actor) => Utils.span(`[${actor.item.name}]`, 'itemYellow');
    public static currencyDrop = (actor: Actor) => Utils.span(`<${actor.currency}¥>`, 'itemYellow');

    public static getCombatStrings = (actor: Actor, target: Actor) => ({
        actor: Messages.actorName(actor),
        target: Messages.actorName(target),
        playerWeapon: Messages.actorWeapon(actor),
        playerDamage: Messages.causedDamage(actor),
        enemyHealth: Messages.getHealth(actor, target),
        damageType: Messages.damageType(actor),
        pronounP: Messages.getPronoun(target).pronounP,
        pronounS: Messages.getPronoun(target).pronounS,
        pronounO: Messages.getPronoun(target).pronounO,
        actorLevel: Messages.level(actor),
        actorLevelOld: Messages.levelOld(actor),
        nanobots: Messages.nanobots,
        deathCharge: actor.currency * 0.45,
        lootDrop: Messages.lootDrop(target),
        currencyDrop: Messages.currencyDrop(target),
    });

    public static getCombatMessage = (actor: Actor, target: GameObject, prevHP: number, damage: number): MessageCombat => {
        const params = {
            msg: 'Hello',
            actor: actor,
            target: target,
            attType: actor.weapon.type,
            critical: false,
            damage: damage,
            prevHP: prevHP,
        };
        return new MessageCombat(params);
    };

    public static encounter(Case: string, actor: Actor, target: Actor) {
        const targetName: string = Utils.span(`[${target.name}]`, `${target.role.name.toLowerCase()}Color`);
        switch (Case) {
            case 'distance':
                Utils.printLine(
                    `The distance between you and ${targetName} is ${Math.floor(
                        Utils.distance(actor.position, target.position),
                    )}m.`,
                );
                break;
        }
    }

    public static getStrings = (actor: Actor, target: Actor) => {
        return Messages.getCombatStrings(actor, target);
    };

    public static logMessage = (msg: string, actor ?: Actor, msgCase ?: string) => {
        let v: object;
        if (!(actor instanceof Player)) {
            v = Messages.getCombatStrings(State.currentEnemy!, State.player!);
        } else {
            v = Messages.getCombatStrings(State.player!, State.currentEnemy!);
        }
        if (!msgCase) {
            Utils.printLine(Messages.fillTemplate(msg, v));
        } else {
            switch (msgCase) {
                case 'combat':
                    v = Messages.getCombatStrings(State.player!, State.currentEnemy!);
                    break;
            }
            Utils.printLine(Messages.fillTemplate(msg, v));
        }
    };

    public static fillTemplate = (template: string, templateVars: Object) => {
        template = template.replace(/\${/g, '${this.');
        return new Function(`return \`${template}\`;`).call(templateVars);
    };
}
