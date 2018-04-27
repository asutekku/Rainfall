import {Item} from "./Item";

export class Armor implements Item {
    description: string;
    type: string;
    name: string;
    set: string;
    level: number;
    stoppingPower: string;
    rarity: number;
    cost: number;
    constructor(type, name, set, level, stoppingPower, cost, description) {
        this.type = type;
        this.name = name;
        this.set = set;
        this.level = level;
        this.stoppingPower = stoppingPower;
        this.cost = cost;
        this.description = description;
        this.rarity = 0;
    }
}
