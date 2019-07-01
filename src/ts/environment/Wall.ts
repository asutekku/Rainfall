import {ObjectPosition} from "../utils/ObjectPosition";
import {Environmental} from "../items/environmental";

export class Wall extends Environmental {
    constructor(position: ObjectPosition) {
        super(position);
        this.name = 'wall';
    }

}