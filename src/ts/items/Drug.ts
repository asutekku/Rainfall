import {Item} from "./Item";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Drug extends Item {
    public drugType: string;
    public strength: number;
    public diff: number;
    public duration: number; // minutes

    constructor(
        name: string,
        description: string,
        drugType: string,
        cost: number,
        strength: number,
        diff: number,
        duration: number,
    ) {
        super("drug", name, cost, description, new ObjectPosition(0));
        this.drugType = drugType;
        this.strength = strength;
        this.diff = diff;
        this.duration = duration;
    }
}
