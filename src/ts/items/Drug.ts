import { Item } from "./Item";

export class Drug implements Item {
    description: string;
    type: string;
    drugType: string;
    name: string;
    cost: number;
    strength: number;
    diff: number;
    duration: number; //minutes

    constructor(
        name: string,
        description: string,
        drugType: string,
        cost: number,
        strength: number,
        diff: number,
        duration: number
    ) {
        this.type = "drug";
        this.drugType = drugType;
        this.name = name;
        this.cost = cost;
        this.description = description;
        this.strength = strength;
        this.diff = diff;
        this.duration = duration;
    }
}
