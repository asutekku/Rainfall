import {GameObject, gameObjectType} from "./GameObject";

export class Environmental extends GameObject {
    type = gameObjectType.env;

    constructor(props) {
        super(props);
    }
}