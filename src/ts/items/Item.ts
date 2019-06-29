import {GameObject} from "./GameObject";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Item extends GameObject {
    type: string;
    name: string;
    cost: number;
    description: string;

    constructor(
        type: string,
        name: string,
        cost: number,
        description: string,
        position: ObjectPosition
    ) {
        super(position);
        this.type = type;
        this.name = name;
        this.cost = cost;
        this.description = description;
    }
}
