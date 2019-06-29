import {Actor} from "../actors/Actor";
import {GameObject} from "../items/GameObject";

export interface IDefaultMessage {
    msg?: string;
}

export class MessageStr implements IDefaultMessage {
    public msg: string;

    constructor(msg: string) {
        this.msg = msg;
    }
}

export class DeathMessage implements IDefaultMessage {
    public type = 'death';
    public msg: string;
    public dead: Actor;
    public killer: Actor;

    constructor(dead: Actor, killer: Actor, msg?: string) {
        this.msg = msg ? msg : '';
        this.dead = dead;
        this.killer = killer;
    }
}

export class DodgeMessage implements IDefaultMessage {
    public type = 'dodge';
    public msg: string;
    public attacker: Actor;
    public defender: Actor;

    constructor(dead: Actor, killer: Actor, msg?: string) {
        this.msg = msg ? msg : '';
        this.attacker = dead;
        this.defender = killer;
    }
}

export class MessageCombat implements IDefaultMessage {
    public type = "combat";
    public msg: string;
    public attacker: Actor;
    public defender: GameObject;
    public attType: string;
    public critical: boolean;
    public damage: number;
    public prevHP: number;

    constructor(parameters: { msg: string, actor: Actor, target: GameObject, attType: string, critical: boolean, damage: number, prevHP: number }) {
        const {msg, actor, target, attType, critical, damage, prevHP} = parameters;
        this.msg = msg;
        this.attacker = actor;
        this.defender = target;
        this.attType = attType;
        this.critical = critical;
        this.damage = damage;
        this.prevHP = prevHP;
    }
}


