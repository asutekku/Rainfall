import {Utils} from "./utils";

class IObjectPosition {
    x: number;
    y: number;
}

export class ObjectPosition {
    constructor(x?: number, y?: number, z?: number) {
        this._x = x ? x : 0;
        this._y = y ? y : 0;
        this._z = z ? z : 0;
    }

    private _x: number;

    get x(): number {
        return this._x;
    }

    set x(value: number) {
        this._x = value;
    }

    private _y: number;

    get y(): number {
        return this._y;
    }

    set y(value: number) {
        this._y = value;
    }

    private _z: number;

    get z(): number {
        return this._z;
    }

    set z(value: number) {
        this._z = value;
    }

    public set(position: ObjectPosition) {
        this._x = position.x;
        this._y = position.y;
        this._z = position.z;
    }

    public random(range?: number): void {
        const r: number = range ? range : 50;
        this.x = Math.floor(Utils.getRandomInt(-r, r));
        this.y = Math.floor(Utils.getRandomInt(-r, r));
        this.z = Math.floor(Utils.getRandomInt(-r, r));
    }

    public get(): Object {
        return {
            x: this._x,
            y: this._y,
            z: this._z,
        };
    }
}