import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Weapon} from "../../items/Weapon";
import {MessageCombat} from "../../interact/messageSchema";

export interface MessageProps {
    message: MessageCombat;
}

interface MessageState {
    selected?: boolean;
}

export class CombatMessage extends React.Component<MessageProps, MessageState> {
    render(): any {
        const m = this.props.message;
        return <div className={'actionMessage'}>
            ><ActorName actor={m.attacker}/>
            {' hit '}
            <ActorName actor={m.defender}/>
            {' with '}
            <WeaponName weapon={m.attacker.weapon}/>
            {' causing '}
            <Damage dmg={m.damage}/>
            {' damage. '}
            <DmgResult oldHP={m.prevHP} dmg={m.damage}/>
        </div>
    }
}

export class DeathMessage extends React.Component<{ dead: Actor, killer: Actor }> {
    render(): any {
        return <div className={'actionMessage'}>
            ><ActorName actor={this.props.dead}/>
            {' was killed by '}
            <ActorName actor={this.props.killer}/>.
        </div>
    }
}


export class ActorName extends React.Component<{ actor: Actor; }> {
    render = (): any => <span style={{color: this.props.actor.color}}>[{this.props.actor.name}]</span>;
}

export class WeaponName extends React.Component<{ weapon: Weapon }> {
    render = (): any => <span className={'weaponBlue'}>[{this.props.weapon.name}]</span>;
}

export class HitType extends React.Component<{ type: string }> {
    render = (): any => <span className={'hitRed'}>[{this.props.type}]</span>;
}

export class LootItems extends React.Component<{ name: string; }> {
    render = (): any => <span className={'itemYellow'}>[{this.props.name}]</span>;
}

export class Level extends React.Component<{ lvl: number }> {
    render = (): any => <span className={'damageGreen'}>[{this.props.lvl}]</span>;
}

export class LootMoney extends React.Component<{ amount: number }> {
    render = (): any => <span className={'itemYellow'}>[{this.props.amount}]</span>;
}

export class NanoBots extends React.Component<{ charge: number }> {
    render = (): any => <span><span className={'weaponBlue'}>[Nanobots]</span> from TraumaTeam revitalize you. You have been charged {this.props.charge}¥.</span>;
}

export class Damage extends React.Component<{ dmg: number }> {
    render = (): any => <span className={'hitRed'}>[{this.props.dmg}]</span>;
}

export class DmgResult extends React.Component<{ oldHP: number, dmg: number }> {
    render = (): any => {
        const newHP: number = this.props.oldHP - this.props.dmg <= 0 ? 0 : -this.props.oldHP - this.props.dmg;
        return <span className={'hitRed'}>[{this.props.oldHP} -> {newHP}]</span>;
    };
}
