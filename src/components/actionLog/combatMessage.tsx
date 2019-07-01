import * as React from "react";
import {Actor} from "../../ts/actors/Actor";
import {MessageCombat} from "../../ts/interact/messageSchema";
import {Weapon} from "../../ts/items/weapons/Weapon";
import en_US from "../../lang/en_US";
import {GeneratedWeapon} from "../../ts/items/weapons/GeneratedWeapon";
import {GameObject} from "../../ts/items/GameObject";

export const CombatMessage = (props: { message: MessageCombat }) => {

    let damageCaused = `<span class='hitRed'>[${props.message.prevHP} -> ${props.message.prevHP - props.message.damage <= 0 ? 0 : props.message.prevHP - props.message.damage}]</span>`;
    let damageType = 'hit';

    let actorName = (actor: Actor) => <span className={actor.skill.color}>[${actor.name}]</span>;

    let weaponName = (weapon: GeneratedWeapon): string => {
        return `<span class='weaponBlue'>[${weapon.name}]</span>`;
    };

    let gameObjectName = (obj: GameObject) => {
        let name;
        if (obj instanceof Actor) {
            name = `<span class=${obj.role.color}>[${obj.toString()}]</span>`;
        } else {
            name = `<span class=${obj.color}>[${obj.toString()}]</span>`;
        }
        return name;
    };

    let damage = (dmg: number): string => {
        return `<span class='hitRed'>[${dmg}]</span>`;
    };

    let combatStrings = {
        actorName: gameObjectName(props.message.actor),
        targetName: gameObjectName(props.message.target),
        damageType: 'hit',
        weaponName: weaponName(props.message.actor.weapon),
        playerDamage: damage(props.message.damage),
        enemyHealth: damageCaused
    };

    let fillTemplate = (template: string, templateVars: Object) => {
        template = template.replace(/\${/g, '${this.');
        return new Function(`return \`>${template}\`;`).call(templateVars);
    };

    return <div className={'actionMessage'} dangerouslySetInnerHTML={{__html: fillTemplate(en_US.Log.hit.normal, combatStrings)}}/>;
};

export class DeathMessage extends React.Component<{ target: Actor, actor: Actor }> {

    actorName = (a: Actor) => <span className={a.role.color}>[{a.name}]</span>;

    public render = (): any => <div className={'actionMessage'}>>{this.actorName(this.props.actor)} killed {this.actorName(this.props.target)}.</div>;
}

export const WeaponName = (weapon: Weapon) => <span className={'weaponBlue'}>[{weapon.name}]</span>;

export const HitType = (type: string) => <span className={'hitRed'}>[{type}]</span>;

export const LootItems = (name: string) => <span className={'itemYellow'}>[{name}]</span>;

export const Level = (lvl: number) => <span className={'damageGreen'}>[{lvl}]</span>;

export const LootMoney = (amount: number) => <span className={'itemYellow'}>[{amount}]</span>;

export const NanoBots = (charge: number) => {
    return <span><span className={'weaponBlue'}>[Nanobots]</span> from TraumaTeam revitalize you. You have been charged {charge}¥.</span>;
};

export const Damage = (dmg: number) => <span className={'hitRed'}>[{dmg}]</span>;

export class DmgResult extends React.Component<{ oldHP: number, dmg: number }> {
    public render = (): any => {
        const newHP: number = this.props.oldHP - this.props.dmg <= 0 ? 0 : -this.props.oldHP - this.props.dmg;
        return <span className={'hitRed'}>[{this.props.oldHP} -> {newHP}]</span>;
    };
}
