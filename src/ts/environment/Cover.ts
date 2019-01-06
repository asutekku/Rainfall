import {EnvironmentObject} from "./EnvironmentObject";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Cover implements EnvironmentObject {
    public name: string;
    public position: ObjectPosition;
    public health: number;

    constructor(name: string, position: ObjectPosition, sps: number) {
        this.name = name;
        this.position = position;
        this.health = sps;
    }
}
