import {Setting} from "./Setting";
import {Utils} from "../utils/utils";

export class Map {
    name: string;
    height: number;
    width: number;
    depth: number;
    setting: Setting;
    buildings: any[];
    canvas: HTMLCanvasElement | null;
    context: CanvasRenderingContext2D | null;

    constructor(name, height, width, depth, setting, background) {
        this.name = name;
        this.height = height;
        this.width = width;
        this.depth = depth;
        this.setting = setting;
        this.buildings = [];
        this.canvas = document.createElement('canvas');
        this.canvas.id = "map";
        this.canvas.height = height;
        this.canvas.width = width;
        this.context = this.canvas.getContext('2d');
        this.context.translate(width * 0.5, height * 0.5);
    }

}