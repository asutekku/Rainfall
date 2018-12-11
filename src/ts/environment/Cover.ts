import {EnvironmentObject} from "./EnvironmentObject";

export class Cover implements EnvironmentObject {
    public name: string;
    public position: number[];
    public sps: number;

    constructor(name: string, position: number[], sps: number) {
        this.name = name;
        this.position = position;
        this.sps = sps;
    }

    public setPosition(x: number, y: number): void {
        this.position = [x, y];
    }
}
