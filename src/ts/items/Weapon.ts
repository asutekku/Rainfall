import {Utils} from "../utils/utils";
import {Item} from "./Item";

export class Weapon implements Item {
    public weaponType: string;
    public reliability: number;
    public name: string;
    public accuracy: number;
    public rarity: number;
    public damage: number;
    public crit: number;
    public diceThrows: number;
    public shots: number;
    public rateOfFire: number;
    public cost: number;
    public description: string;
    public type: string;
    public range: number;
    public level: number;
    public equipped: boolean;
    public manufacturer: string;
    public id: string;
    public ammoType: string;

    constructor(
        weaponType: string,
        name: string,
        accuracy: number,
        rarity: number,
        damage: number,
        criticalChance: number,
        diceThrows: number,
        shots: number,
        rateOfFire: number,
        reliability: number,
        range: number,
        cost: number,
        description: string,
        manufacturer: string,
        id: string,
        ammo: string,
    ) {
        this.type = "weapons";
        this.weaponType = weaponType;
        this.name = name;
        this.accuracy = accuracy;
        this.rarity = rarity;
        this.damage = damage;
        this.crit = criticalChance;
        this.diceThrows = diceThrows;
        this.shots = shots;
        this.rateOfFire = rateOfFire;
        this.reliability = reliability;
        this.range = range;
        this.cost = cost;
        this.description = description;
        this.manufacturer = manufacturer;
        this.level = 0;
        this.equipped = false;
        this.id = id;
        this.ammoType = ammo;
    }

    public averageDamage(): number {
        const low = this.diceThrows * this.rateOfFire + this.damage;
        const high = this.diceThrows * 6 * this.rateOfFire + this.damage;
        return (low + high) / 2;
    }

    public getDamage(): number {
        let damage = 0;
        for (let i = 0; i <= this.rateOfFire; i++) {
            if (Utils.chance(this.accuracy)) {
                damage += Utils.dice(this.diceThrows, 6) + this.damage;
            }
        }
        return Math.floor(damage);
    }
}
