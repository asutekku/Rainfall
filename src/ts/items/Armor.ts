import { Item } from "./Item";

export class Armor implements Item {
    description: string;
    type: string;
    bodypart: string;
    name: string;
    set: string;
    level: number;
    stoppingPower: number;
    rarity: number;
    cost: number;
    equipped: boolean;
    id: string;

    constructor(
        bodypart: string,
        name: string,
        set: string,
        level: number,
        stoppingPower: number,
        cost: number,
        description: string,
        id: string
    ) {
        this.bodypart = bodypart;
        this.type = "armor";
        this.name = name;
        this.set = set;
        this.level = level;
        this.stoppingPower = stoppingPower;
        this.cost = cost;
        this.description = description;
        this.rarity = 0;
        this.equipped = false;
        this.id = id;
    }
}
