import {Actor} from "../actors/Actor";
import {GameObject} from "../items/GameObject";

export interface IDefaultMessage {
    msg?: string;
    type: string;
    actor?: Actor;
    target?: GameObject;
}

export class MessageStr implements IDefaultMessage {
    public msg: string;
    public type: string = 'default';

    constructor(msg: string) {
        this.msg = msg;
    }
}

export interface ICombatMessage extends IDefaultMessage {
    actor: Actor;
    target: GameObject;
}

export class DeathMessage implements ICombatMessage {
    public type = 'death';
    public msg: string;
    public target: Actor;
    public actor: Actor;

    constructor(killed: Actor, killer: Actor, msg?: string) {
        this.msg = msg ? msg : '';
        this.target = killed;
        this.actor = killer;
    }
}

export class LvlUpMessage implements ICombatMessage {
    public type = 'levelUp';
    public msg: string;
    public target: Actor;
    public actor: Actor;

    constructor(killed: Actor, killer: Actor, msg?: string) {
        this.msg = msg ? msg : '';
        this.target = killed;
        this.actor = killer;
    }
}

export class DodgeMessage implements ICombatMessage {
    public type = 'dodge';
    public msg: string;
    public actor: Actor;
    public target: Actor;

    constructor(actor: Actor, target: Actor, msg?: string) {
        this.msg = msg ? msg : '';
        this.actor = actor;
        this.target = target;
    }
}

export class MessageCombat implements ICombatMessage {
    public type = "combat";
    public msg: string;
    public actor: Actor;
    public target: GameObject;
    public attType: string;
    public critical: boolean;
    public damage: number;
    public prevHP: number;

    constructor(parameters: { msg: string, actor: Actor, target: GameObject, attType: string, critical: boolean, damage: number, prevHP: number }) {
        const {msg, actor, target, attType, critical, damage, prevHP} = parameters;
        this.msg = msg;
        this.actor = actor;
        this.target = target;
        this.attType = attType;
        this.critical = critical;
        this.damage = damage;
        this.prevHP = prevHP;
    }
}


