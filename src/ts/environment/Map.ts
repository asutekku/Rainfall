import {Setting} from "./Setting";

export class Map {

    public name: string;
    public height: number;
    public width: number;
    public depth: number;
    public setting: Setting;
    public buildings: any[];
    public canvas: HTMLCanvasElement | null;
    public context: CanvasRenderingContext2D | null;
    public actors: any[];

    public static clear(): void {
        this.prototype
            .canvas!.getContext("2d")!
            .clearRect(0, 0, this.prototype.canvas!.width, this.prototype.canvas!.height);
    }

    constructor(name: string, height: number, width: number, depth: number, setting: Setting) {
        this.name = name;
        this.height = height;
        this.width = width;
        this.depth = depth;
        this.setting = setting;
        this.buildings = [];
        this.actors = [];
        this.canvas = document.createElement("canvas");
        this.canvas.id = "map";
        this.canvas.height = height;
        this.canvas.width = width;
        this.context = this.canvas.getContext("2d");
        this.context!.translate((width ? width : 100) * 0.5, (height ? height : 100) * 0.5);
    }
}
