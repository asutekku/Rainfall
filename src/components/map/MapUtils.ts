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

export class MapConfig {
    width: number;
    height: number;
    cellSize: number;

    constructor(width: number, height: number, cellSize: number) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
    }
}

export const gridify = (val: number, cellSize: number) => {
    return Math.floor((val + cellSize / 2) / cellSize) * cellSize;
};

export const getCell = (val: number, cellSize: number) => {
    return Math.floor((val + cellSize / 2) / cellSize);
};