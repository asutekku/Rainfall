import * as React from "react";
import {Actor} from "../../ts/actors/Actor";
import {IWeapon} from "../../ts/items/weapons/GeneratedWeapon";
import {GameObject} from "../../ts/items/GameObject";
import {Utils} from "../../ts/utils/utils";
import {MessageCombat} from "../../ts/interact/messageSchema";
import en_US from "../../lang/en_US";

class LogStrings {
    public static damageCaused = (damage, prevHP): string => `<span class='hitRed'>[${prevHP} -> ${prevHP - damage <= 0 ? 0 : prevHP - damage}]</span>`;

    public static damageType = (actor: Actor): string => (actor.weapon.weaponType === 'Melee' ? 'hit' : 'shot');

    public static weaponName = (weapon: IWeapon): string => LogStrings.Brackets(weapon.name, 'weaponBlue');

    public static gameObjectName = (obj: GameObject) => {
        return LogStrings.Brackets(obj.toString(), (obj instanceof Actor) ? obj.role.color : obj.color);
    };

    public static damage = (dmg: number): string => LogStrings.Brackets(dmg, 'hitRed');

    public static damageCrit = (actor: Actor, target: Actor): string =>
        Utils.span(`(${target.health + actor.weapon.getDamage() * 2} => ${target.health})`, 'damageGreen');

    public static damageCrit0 = (actor: Actor, target: Actor): string =>
        Utils.span(`(${target.health + actor.weapon.getDamage() * 2} => 0)`, 'damageGreen');

    /*public static getHealth = (actor: Actor, target: Actor): string =>
        actor.health <= 0 ? Messages.damageCrit0(actor, target) : Messages.damageCrit(actor, target);*/
    public static causedDamage = (actor: Actor): string => Utils.span(actor.weapon.getDamage().toString(), 'hitRed');

    public static getPronoun = (actor: Actor) => ({
        pronounP: actor.gender === 'Female' ? 'her' : 'his',
        pronounS: actor.gender === 'Female' ? 'she' : 'he',
        pronounO: actor.gender === 'Female' ? 'her' : 'him',
    });

    public static level = (actor: Actor): string => Utils.span(actor.level.toString(), 'damageGreen');

    public static levelOld = (actor: Actor): string => Utils.span((actor.level - 1).toString(), 'damageGreen');

    public static lootDrop = (actor: Actor): string => Utils.span(`[${actor.item.name}]`, 'itemYellow');

    public static currencyDrop = (actor: Actor): string => Utils.span(`<${actor.currency}¥>`, 'itemYellow');

    private static Brackets = (string: string | number, className: string): string => `<span class='${className}'>[${string.toString()}]</span>`;

    public static nanobots = LogStrings.Brackets('Nanobots', 'weaponBlue');
}

export const CombatMessage = (props: { template: string, message: MessageCombat }) => {
    const strings = {
        actorName: LogStrings.gameObjectName(props.message.actor),
        targetName: LogStrings.gameObjectName(props.message.target),
        damageType: LogStrings.damageType(props.message.actor),
        weaponName: LogStrings.weaponName(props.message.actor.weapon),
        damageCaused: LogStrings.damage(props.message.damage),
        targetHealth: LogStrings.damageCaused(props.message.damage, props.message.prevHP),
        pronounP: LogStrings.getPronoun(props.message.target as Actor).pronounP,
        pronounS: LogStrings.getPronoun(props.message.target as Actor).pronounS,
        pronounO: LogStrings.getPronoun(props.message.target as Actor).pronounO,
        actorLevel: LogStrings.level(props.message.actor),
        actorLevelOld: LogStrings.levelOld(props.message.actor),
        nanobots: LogStrings.nanobots,
        deathCharge: props.message.actor.currency * 0.45,
        //lootDrop: Messages.lootDrop(target),
        currencyDrop: LogStrings.currencyDrop(props.message.target as Actor),
    };

    return <TemplateMessage template={props.template} strings={strings}/>;
};

export const DeathMessage = (props: { target: Actor, actor: Actor }) => {

    const strings = {
        actorName: LogStrings.gameObjectName(props.actor),
        targetName: LogStrings.gameObjectName(props.target),
    };

    return <TemplateMessage strings={strings} template={en_US.Log.hit.kill}/>;
};

export const LVLUPMessage = (props: { actor: Actor }) => {
    const strings = {
        actorName: LogStrings.gameObjectName(props.actor),
        actorLevelOld: LogStrings.levelOld(props.actor),
        actorLevel: LogStrings.level(props.actor),
    };
    return <TemplateMessage strings={strings} template={en_US.Log.levelUp}/>;
};

export const TemplateMessage = (props: { template: string, strings: object }) => {
    let fillTemplate = (template: string, templateVars: Object) => {
        template = template.replace(/\${/g, '${this.');
        return new Function(`return \`> ${template}\`;`).call(templateVars);
    };

    return <div className={'actionMessage'} dangerouslySetInnerHTML={{__html: fillTemplate(props.template, props.strings)}}/>;
};
