import {GameObject, gameObjectType} from "./GameObject";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Item extends GameObject {
    type: gameObjectType;
    name: string;
    itemType: string;
    cost: number;
    description: string;

    constructor(
        itemType: string,
        name: string,
        cost: number,
        description: string,
        position: ObjectPosition
    ) {
        super(position);
        this.itemType = itemType;
        this.type = gameObjectType.item;
        this.name = name;
        this.cost = cost;
        this.description = description;
    }
}
