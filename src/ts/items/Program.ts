import {Item} from "./Item";
import {ObjectPosition} from "../utils/ObjectPosition";

export type ProgramClass = "attacker" | "defender" | "booster" | "blackice";

export interface ProgramConfig {
    name: string;
    programClass: ProgramClass;
    atk: number;             // ATK value (attack roll modifier)
    def: number;             // DEF value (defends its REZ)
    rez: number;             // REZ — the program's durability / hit points
    damage: number;          // d6 of damage dealt on a hit
    antiPersonnel: boolean;  // Black ICE that attacks the Netrunner's brain
    effect: string;
    cost: number;
}

/**
 * A Cyberpunk RED NET program: the Netrunner's attackers/defenders/boosters
 * and the Black ICE that guards NET Architecture. Black ICE is just a program
 * the architecture runs against the intruder.
 */
export class Program extends Item {
    public programClass: ProgramClass;
    public atk: number;
    public def: number;
    public rez: number;
    public maxRez: number;
    public damage: number;
    public antiPersonnel: boolean;
    public effect: string;

    constructor(cfg: ProgramConfig) {
        super("program", cfg.name, cfg.cost, cfg.effect, new ObjectPosition(0, 0, 0));
        this.programClass = cfg.programClass;
        this.atk = cfg.atk;
        this.def = cfg.def;
        this.rez = cfg.rez;
        this.maxRez = cfg.rez;
        this.damage = cfg.damage;
        this.antiPersonnel = cfg.antiPersonnel;
        this.effect = cfg.effect;
    }

    /** Sum of the program's damage dice (d6). */
    public rollDamage(): number {
        let total = 0;
        for (let i = 0; i < this.damage; i++) {
            total += Math.floor(Math.random() * 6) + 1;
        }
        return total;
    }

    public clone(): Program {
        return new Program({
            name: this.name, programClass: this.programClass, atk: this.atk, def: this.def,
            rez: this.maxRez, damage: this.damage, antiPersonnel: this.antiPersonnel,
            effect: this.effect, cost: this.cost,
        });
    }
}
