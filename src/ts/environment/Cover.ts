import { EnvironmentObject } from "./EnvironmentObject";

export class Cover implements EnvironmentObject {
    name: string;
    position: number[];
    sps: number;

    constructor(name: string, position: number[], sps: number) {
        this.name = name;
        this.position = position;
        this.sps = sps;
    }

    setPosition(x: number, y: number): void {
        this.position = [x, y];
    }
}
