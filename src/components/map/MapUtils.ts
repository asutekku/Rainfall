import {ObjectPosition} from "../../ts/utils/ObjectPosition";
import {Utils} from "../../ts/utils/utils";

export interface PositionHolder {
    id: string;
    position: ObjectPosition;
}

export const getRandomPositionOnMap = (height: number, width: number, cellSize: number) => {
    let newX = Utils.getRandomInt(0, width);
    let newY = Utils.getRandomInt(0, height);

    let x = Math.floor(newX / cellSize) * cellSize;
    let y = Math.floor(newY / cellSize) * cellSize;
    return new ObjectPosition(x, y);
};