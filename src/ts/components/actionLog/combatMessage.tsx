import * as React from "react";
import {Actor} from "../../actors/Actor";
import {MessageCombat} from "../../interact/messageSchema";
import {Weapon} from "../../items/Weapon";
import en_US from "../../../lang/en_US";

export class CombatMessage extends React.Component<{ message: MessageCombat }> {

    damageCaused = `<span class='hitRed'>[${this.props.message.prevHP} -> ${this.props.message.prevHP - this.props.message.damage <= 0 ? 0 : this.props.message.prevHP - this.props.message.damage}]</span>`;
    damageType = 'hit';

    actorName = (actor: Actor): string => {
        console.log('ActorName(): ' + actor.name);
        return `<span style='color: ${actor.skill.color}'>[${actor.name}]</span>`;
    };

    weaponName = (weapon: Weapon): string => {
        return `<span class='weaponBlue'>[${weapon.name}]</span>`;
    };

    damage = (dmg: number): string => {
        return `<span class='hitRed'>[${dmg}]</span>`;
    };

    combatStrings = {
        actorName: this.actorName(this.props.message.attacker).toString(),
        targetName: this.actorName(this.props.message.defender).toString(),
        damageType: 'hit',
        weaponName: this.weaponName(this.props.message.attacker.weapon),
        playerDamage: this.damage(this.props.message.damage),
        enemyHealth: this.damageCaused
    };

    public render(): any {
        console.log(this.props.message.defender.name);
        console.log(this.combatStrings.targetName);
        return <div className={'actionMessage'} dangerouslySetInnerHTML={{__html: this.fillTemplate(en_US.Log.hit.normal, this.combatStrings)}}/>;
    }

    //>{this.actorName(m.attacker)} hit {this.actorName(m.defender)} with {this.weaponName(m.attacker.weapon)} causing {this.damage(m.damage)} damage. {this.damageCaused}
    //>{this.fillTemplate(en_US.Log.hit.normal, this.combatStrings)}

    private fillTemplate = (template: string, templateVars: Object) => {
        template = template.replace(/\${/g, '${this.');
        return new Function(`return \`>${template}\`;`).call(templateVars);
    };
}

export class DeathMessage extends React.Component<{ dead: Actor, killer: Actor }> {
    actorName = (actor: Actor) => <span style={{color: actor.skill.color}}>[{actor.name}]</span>;
    public render = (): any => <div className={'actionMessage'}>>{this.actorName(this.props.killer)} killed {this.actorName(this.props.dead)}.</div>;
}

export class WeaponName extends React.Component<{ weapon: Weapon }> {
    public render = (): any => <span className={'weaponBlue'}>[{this.props.weapon.name}]</span>;
}

export class HitType extends React.Component<{ type: string }> {
    public render = (): any => <span className={'hitRed'}>[{this.props.type}]</span>;
}

export class LootItems extends React.Component<{ name: string; }> {
    public render = (): any => <span className={'itemYellow'}>[{this.props.name}]</span>;
}

export class Level extends React.Component<{ lvl: number }> {
    public render = (): any => <span className={'damageGreen'}>[{this.props.lvl}]</span>;
}

export class LootMoney extends React.Component<{ amount: number }> {
    public render = (): any => <span className={'itemYellow'}>[{this.props.amount}]</span>;
}

export class NanoBots extends React.Component<{ charge: number }> {
    public render = (): any => <span><span className={'weaponBlue'}>[Nanobots]</span> from TraumaTeam revitalize you. You have been charged {this.props.charge}¥.</span>;
}

export class Damage extends React.Component<{ dmg: number }> {
    public render = (): any => <span className={'hitRed'}>[{this.props.dmg}]</span>;
}

export class DmgResult extends React.Component<{ oldHP: number, dmg: number }> {
    public render = (): any => {
        const newHP: number = this.props.oldHP - this.props.dmg <= 0 ? 0 : -this.props.oldHP - this.props.dmg;
        return <span className={'hitRed'}>[{this.props.oldHP} -> {newHP}]</span>;
    };
}
