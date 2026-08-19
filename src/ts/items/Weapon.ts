import {Item} from "./Item";
import {ObjectPosition} from "../utils/ObjectPosition";

/**
 * Shape of a weapon entry in src/objects/weapons.ts (generated from the
 * Cyberpunk RED weapon spreadsheet).
 */
export interface WeaponConfig {
    weaponType: string;    // full RED category, e.g. "Medium Handgun"
    weaponClass: string;   // DV-table class: melee|pistol|smg|shotgun|rifle|sniper|bow
    manufacturer: string;
    name: string;
    skill: string;         // RED weapon skill used for the attack roll
    diceThrows: number;    // number of d6 (0 for non-kinetic weapons)
    damage: number;        // flat damage modifier added to the dice
    ap: boolean;           // armour-piercing (halves the target's SP)
    damageType: string;    // "kinetic" or a special type (stun/emp/entangle/drug/...)
    accuracyBonus: number; // RED weapon accuracy modifier to the attack roll
    shots: number;         // magazine size (0 for melee)
    rateOfFire: number;    // attacks per turn
    autofire: boolean;
    hands: number;
    rarity: number;
    concealment: boolean;
    reliability: number;
    quality: string;
    cost: number;
    range: number;         // max effective range in metres (display + DV cap)
    description: string;
}

export class Weapon extends Item {
    public weaponType: string;
    public weaponClass: string;
    public manufacturer: string;
    public skill: string;
    public diceThrows: number;
    public damage: number;
    public ap: boolean;
    public damageType: string;
    public accuracyBonus: number;
    public shots: number;
    public rateOfFire: number;
    public autofire: boolean;
    public hands: number;
    public rarity: number;
    public concealment: boolean;
    public reliability: number;
    public quality: string;
    public range: number;
    public level: number;

    constructor(cfg: WeaponConfig) {
        super("weapon", cfg.name, cfg.cost, cfg.description, new ObjectPosition(0, 0, 0));
        this.weaponType = cfg.weaponType;
        this.weaponClass = cfg.weaponClass;
        this.manufacturer = cfg.manufacturer;
        this.skill = cfg.skill;
        this.diceThrows = cfg.diceThrows;
        this.damage = cfg.damage;
        this.ap = cfg.ap;
        this.damageType = cfg.damageType;
        this.accuracyBonus = cfg.accuracyBonus;
        this.shots = cfg.shots;
        this.rateOfFire = cfg.rateOfFire;
        this.autofire = cfg.autofire;
        this.hands = cfg.hands;
        this.rarity = cfg.rarity;
        this.concealment = cfg.concealment;
        this.reliability = cfg.reliability;
        this.quality = cfg.quality;
        this.range = cfg.range;
        this.level = 0;
    }

    /**
     * A fresh, independent copy. Weapons carry per-owner mutable state
     * (`equipped`, `level`), so actors and loot drops each need their own
     * instance rather than sharing the catalog template.
     */
    public clone(): Weapon {
        return new Weapon({
            weaponType: this.weaponType, weaponClass: this.weaponClass, manufacturer: this.manufacturer,
            name: this.name, skill: this.skill, diceThrows: this.diceThrows, damage: this.damage,
            ap: this.ap, damageType: this.damageType, accuracyBonus: this.accuracyBonus, shots: this.shots,
            rateOfFire: this.rateOfFire, autofire: this.autofire, hands: this.hands, rarity: this.rarity,
            concealment: this.concealment, reliability: this.reliability, quality: this.quality,
            cost: this.cost, range: this.range, description: this.description,
        });
    }

    /** Mean damage of a single hit (Cyberpunk RED: each d6 averages 3.5). */
    public averageDamage(): number {
        if (this.damageType !== "kinetic" || this.diceThrows <= 0) {
            return 0;
        }
        return this.diceThrows * 3.5 + this.damage;
    }

    /**
     * Damage of a single hit, resolved by the Cyberpunk RED rules: sum the
     * weapon's d6 and add the flat modifier. If two or more of those dice come
     * up 6, the hit is a critical injury and deals +5 bonus damage. Non-kinetic
     * weapons (stun, EMP, entangle, ...) deal no HP damage.
     */
    public getDamage(): number {
        if (this.damageType !== "kinetic" || this.diceThrows <= 0) {
            return 0;
        }
        let total = this.damage;
        let sixes = 0;
        for (let i = 0; i < this.diceThrows; i++) {
            const roll = Math.floor(Math.random() * 6) + 1;
            total += roll;
            if (roll === 6) {
                sixes += 1;
            }
        }
        if (sixes >= 2) {
            total += 5;
        }
        return total;
    }
}
