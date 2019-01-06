import {ObjectPosition} from "../utils/ObjectPosition";

export class GameObject {
    static id: number;
    position: ObjectPosition;

    constructor(position: ObjectPosition) {
        this.position = position;
        GameObject.id = GameObject.setID();
    };

    private static setID(): number {
        const oldID = GameObject.id;
        return oldID + 1;
    }

    public move(newPosition: ObjectPosition) {
        this.position = newPosition;
    }
}
