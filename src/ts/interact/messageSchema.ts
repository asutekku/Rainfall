import {Actor} from "../actors/Actor";

export interface DefaultMessage {
    msg?: string;
}

export class MessageStr implements DefaultMessage {
    msg: string;

    constructor(msg: string) {
        this.msg = msg;
    }
}

export class DeathMessage implements DefaultMessage {
    type = 'death';
    msg: string;
    dead: Actor;
    killer: Actor;

    constructor(dead: Actor, killer: Actor, msg?: string) {
        this.msg = msg ? msg : '';
        this.dead = dead;
        this.killer = killer;
    }
}

export class MessageCombat implements DefaultMessage {
    type = "combat";
    msg: string;
    attacker: Actor;
    defender: Actor;
    attType: string;
    critical: boolean;
    damage: number;
    prevHP: number;

    constructor(parameters: { msg: string, attacker: Actor, defender: Actor, attType: string, critical: boolean, damage: number, prevHP: number }) {
        let {msg, attacker, defender, attType, critical, damage, prevHP} = parameters;
        this.msg = msg;
        this.attacker = attacker;
        this.defender = defender;
        this.attType = attType;
        this.critical = critical;
        this.damage = damage;
        this.prevHP = prevHP;
    }
}


