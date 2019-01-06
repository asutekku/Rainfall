import {GameObject} from "./GameObject";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Item extends GameObject {
    private readonly _type: string;
    private readonly _name: string;
    private readonly _cost: number;
    private readonly _description: string;

    constructor(
        type: string,
        name: string,
        cost: number,
        description: string,
        position: ObjectPosition
    ) {
        super(position);
        this._type = type;
        this._name = name;
        this._cost = cost;
        this._description = description;
    }

    get type(): string {
        return this._type;
    }

    get name(): string {
        return this._name;
    }

    get cost(): number {
        return this._cost;
    }

    get description(): string {
        return this._description;
    }
}
