import {ObjectPosition} from "../ts/utils/ObjectPosition";
import {IGameObject} from "../ts/items/GameObject";

class Projectile implements IGameObject {
    type: string;
    start: ObjectPosition;
    end: ObjectPosition;
    velocity: number;
    color: string;
    position: ObjectPosition;

    constructor(start: ObjectPosition, end: ObjectPosition, color?: string, type?: string, velocity?: number) {
        this.start = start;
        this.position = start;
        this.end = end;
        this.type = type ? type : "projectile";
        this.velocity = velocity ? velocity : 100;
        this.color = color ? color : '#f44545';
    }
}

export default Projectile;