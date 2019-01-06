import {Item} from "./Item";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Scrap extends Item {
    public rarity: number;
    public level: number;

    constructor(name: string, cost: number, description: string) {
        super("misc", name, cost, description, new ObjectPosition(0, 0, 0));
        this.rarity = 1;
        this.level = 1;
    }
}

export class Medical extends Item {
    public rarity: number;
    public restorePoints: number;
    public level: number;

    constructor(name: string, cost: number, restorePoints: number, description: string) {
        super("medical", name, cost, description, new ObjectPosition(0, 0, 0));
        this.restorePoints = restorePoints;
        this.rarity = 0;
        this.level = 0;
    }
}
