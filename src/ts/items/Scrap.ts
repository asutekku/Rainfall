import {Item} from "./Item";

export class Scrap implements Item {
    public description: string;
    public type: string;
    public name: string;
    public rarity: number;
    public cost: number;
    public level: number;
    public specificType: string;
    public id: string;

    constructor(type: string, specificType: string, name: string, cost: number, description: string, id: string) {
        this.type = type;
        this.specificType = specificType;
        this.name = name;
        this.cost = cost;
        this.description = description;
        this.rarity = 1;
        this.level = 1;
        this.id = id;
    }
}

export class Medical implements Item {
    public description: string;
    public type: string;
    public name: string;
    public rarity: number;
    public cost: number;
    public restorePoints: number;
    public level: number;
    public id: string;

    constructor(type: string, name: string, cost: number, restorePoints: number, description: string, id: string) {
        this.type = type;
        this.name = name;
        this.cost = cost;
        this.description = description;
        this.restorePoints = restorePoints;
        this.rarity = 0;
        this.level = 0;
        this.id = id;
    }
}
