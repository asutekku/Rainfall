import {Item} from "./Item";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Armor extends Item {
    public bodyPart: string;
    public set: string;
    public level: number;
    public stoppingPower: number;
    public rarity: number;
    public equipped: boolean;
    public position: ObjectPosition;

    constructor(
        bodypart: string,
        name: string,
        set: string,
        level: number,
        stoppingPower: number,
        cost: number,
        description: string,
    ) {
        super("armor", name, cost, description, new ObjectPosition(0, 0, 0));
        this.position = new ObjectPosition(0, 0, 0);
        this.bodyPart = bodypart;
        this.set = set;
        this.level = level;
        this.stoppingPower = stoppingPower;
        this.rarity = 0;
        this.equipped = false;
    }
}
