import {Utils} from "../utils/utils";
import {Item} from "./Item";
import {Actor} from "../actors/Actor";

export class Weapon implements Item {
    weaponType: string;
    reliability: number;
    name: string;
    accuracy: number;
    rarity: number;
    damage: number;
    crit: number;
    diceThrows: number;
    shots: number;
    rateOfFire: number;
    cost: number;
    description: string;
    type: string;
    range: number;
    level: number;

    constructor(weaponType:string, name: string, accuracy:number, rarity:number, damage:number,
                criticalChance:number, diceThrows:number, shots:number, rateOfFire:number,
                reliability:number, range:number, cost:number, description: string,) {
        this.type = "weapon";
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
        this.level = 0;
    }

    averageDamage(): number {
        let low = this.diceThrows * this.rateOfFire + this.damage;
        let high = (this.diceThrows * 6) * this.rateOfFire + this.damage;
        return (low + high) / 2;
    };

    weaponDamage(): number {
        let damage = 0;
        for (let i = 0; i <= this.rateOfFire; i++) {
            if (Utils.chance(this.accuracy)) {
                damage += (Utils.dice(this.diceThrows, 6) + this.damage)
            }
        }
        return Math.floor(damage);
    }
}