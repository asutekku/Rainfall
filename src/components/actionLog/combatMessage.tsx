import * as React from "react";
import {Actor} from "../../ts/actors/Actor";
import {MessageCombat} from "../../ts/interact/messageSchema";
import {Weapon} from "../../ts/items/weapons/Weapon";
import en_US from "../../lang/en_US";
import {GeneratedWeapon} from "../../ts/items/weapons/GeneratedWeapon";
import {GameObject} from "../../ts/items/GameObject";

export class CombatMessage extends React.Component<{ message: MessageCombat }> {

    damageCaused = `<span class='hitRed'>[${this.props.message.prevHP} -> ${this.props.message.prevHP - this.props.message.damage <= 0 ? 0 : this.props.message.prevHP - this.props.message.damage}]</span>`;
    damageType = 'hit';

    actorName = (actor: Actor) => <span className={actor.skill.color}>[${actor.name}]</span>;

    weaponName = (weapon: GeneratedWeapon): string => {
        return `<span class='weaponBlue'>[${weapon.name}]</span>`;
    };

    gameObjectName = (obj: GameObject) => {
        let name;
        if (obj instanceof Actor) {
            name = `<span class=${obj.role.color}>[${obj.toString()}]</span>`;
        } else {
            name = `<span class=${obj.color}>[${obj.toString()}]</span>`;
        }
        return name;
    };

    damage = (dmg: number): string => {
        return `<span class='hitRed'>[${dmg}]</span>`;
    };

    combatStrings = {
        actorName: this.gameObjectName(this.props.message.attacker),
        targetName: this.gameObjectName(this.props.message.defender),
        damageType: 'hit',
        weaponName: this.weaponName(this.props.message.attacker.weapon),
        playerDamage: this.damage(this.props.message.damage),
        enemyHealth: this.damageCaused
    };

    public render(): any {
        return <div className={'actionMessage'} dangerouslySetInnerHTML={{__html: this.fillTemplate(en_US.Log.hit.normal, this.combatStrings)}}/>;
    }

    //>{this.actorName(m.actor)} hit {this.actorName(m.target)} with {this.weaponName(m.actor.weapon)} causing {this.damage(m.damage)} damage. {this.damageCaused}
    //>{this.fillTemplate(en_US.Log.hit.normal, this.combatStrings)}

    private fillTemplate = (template: string, templateVars: Object) => {
        template = template.replace(/\${/g, '${this.');
        return new Function(`return \`>${template}\`;`).call(templateVars);
    };
}

export class DeathMessage extends React.Component<{ dead: Actor, killer: Actor }> {
    actorName = (actor: Actor) => <span className={actor.role.color}>[{actor.name}]</span>;
    public render = (): any => <div className={'actionMessage'}>>{this.actorName(this.props.killer)} killed {this.actorName(this.props.dead)}.</div>;
}

export class WeaponName extends React.Component<{ weapon: Weapon }> {
    public render = (): any => <span className={'weaponBlue'}>[{this.props.weapon.name}]</span>;
}

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
