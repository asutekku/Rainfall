import {Item} from "./Item";

export class Drug implements Item {
    public description: string;
    public type: string;
    public drugType: string;
    public name: string;
    public cost: number;
    public strength: number;
    public diff: number;
    public duration: number; // minutes
    public id: string;

    constructor(
        name: string,
        description: string,
        drugType: string,
        cost: number,
        strength: number,
        diff: number,
        duration: number,
    ) {
        this.type = "drug";
        this.drugType = drugType;
        this.name = name;
        this.cost = cost;
        this.description = description;
        this.strength = strength;
        this.diff = diff;
        this.duration = duration;
        this.id = `drug_${this.name.replace(" ", "").toLowerCase()}`;
    }
}
