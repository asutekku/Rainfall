import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Weapon} from "../../items/Weapon";

export interface MessageProps {
    message: string;
}

interface MessageState {
    selected?: boolean;
}

export class ActionMessage extends React.Component<MessageProps, MessageState> {

    constructor(props: MessageProps) {
        super(props);
    }

    handleClick() {
    }

    render(): any {
        return <div className={'actionMessage'}>{this.props.message}</div>
    }
}

interface MessageActorProps {
    actor: Actor;
}

export class ActorName extends React.Component<MessageActorProps> {
    render(): any {
        return <span style={{color: this.props.actor.color}}>[{this.props.actor.name}]</span>
    }
}

interface WeaponProps {
    weapon: Weapon;
}

export class WeaponName extends React.Component<WeaponProps> {
    render(): any {
        return <span className={'weaponBlue'}>[{this.props.weapon.name}]</span>
    }
}

interface LootProps {
    name: string;
}

export class Loot extends React.Component<LootProps> {
    render(): any {
        return <span className={'itemYellow'}>[{this.props.name}]</span>
    }
}