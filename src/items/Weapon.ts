import {Utils} from "../utils/utils";
import {Item} from "./Item";

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

    constructor(weaponType, name: string, accuracy, rarity, damage, criticalChance, diceThrows, shots, rateOfFire, reliability, range, cost, description) {
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
}