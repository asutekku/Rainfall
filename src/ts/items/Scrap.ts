import { Item } from "./Item";

export class Scrap implements Item {
    description: string;
    type: string;
    name: string;
    rarity: number;
    cost: number;
    level: number;

    constructor(type, name, cost, description) {
        this.type = type;
        this.name = name;
        this.cost = cost;
        this.description = description;
        this.rarity = 1;
        this.level = 1;
    }
}

export class Medical implements Item {
    description: string;
    type: string;
    name: string;
    rarity: number;
    cost: number;
    restorePoints: number;
    level: number;

    constructor(type, name, cost, description, restorePoints) {
        this.type = type;
        this.name = name;
        this.cost = cost;
        this.description = description;
        this.restorePoints = restorePoints;
        this.rarity = 0;
        this.level = 0;
    }
}
