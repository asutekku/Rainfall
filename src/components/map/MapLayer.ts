import {GameObject} from "../../ts/items/GameObject";

export class MapLayer {
    grid: GameObject[][];
    width: number;
    height: number;

    /**
     * Create the grid layer for the map.
     * @param height Height in cells
     * @param width Width in cells
     */
    constructor(height: number, width: number) {
        this.width = width;
        this.height = height;
        let x = new Array(width);

        for (let i = 0; i < x.length; i++) {
            x[i] = new Array(height);
        }
        this.grid = x;
    }

    addObject(object: GameObject, x: number, y: number) {
        this.grid[y][x] = object;
    }

    clear(): void {
        let length = this.grid.length;
        let width = this.grid[0].length;
        let x = new Array(length);

        for (let i = 0; i < x.length; i++) {
            x[i] = new Array(width);
        }
        this.grid = x;
    }

    remove(x, y): void {
        if (typeof this.grid[x][y] !== 'undefined') {
            console.log(this.grid[x][y]);
            this.grid[x].splice(y, 1);
        }
    }

}