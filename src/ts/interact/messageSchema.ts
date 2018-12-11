import {Actor} from "../actors/Actor";

export interface DefaultMessage {
    msg: string;
}

export class MessageStr implements DefaultMessage {
    msg: string;

    constructor(msg: string) {
        this.msg = msg;
    }
}

export class MessageCombat implements DefaultMessage {
    msg: string;
    attacker: Actor;
    defender: Actor;
    attType: string;
    critical: boolean;
    damage: number;
    defHealth: number;

    constructor(msg: string, attacker: Actor, defender: Actor, attType: string, critical: boolean, damage: number, defHealth: number) {
        this.msg = msg;
        this.attacker = attacker;
        this.defender = defender;
        this.attType = attType;
        this.critical = critical;
        this.damage = damage;
        this.defHealth = defHealth;
    }
}


