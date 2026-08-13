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
        const canvas = this.prototype.canvas;
        if (!canvas) {
            return;
        }
        canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    }

    constructor(name: string, height: number, width: number, depth: number, setting: Setting) {
        this.name = name;
        this.height = height;
        this.width = width;
        this.depth = depth;
        this.setting = setting;
        this.buildings = [];
        this.actors = [];
        // The canvas is a rendering concern, not part of the map model. It is
        // created lazily via initCanvas() so the map (and everything that
        // imports it, e.g. State) can be constructed headless, without a DOM.
        this.canvas = null;
        this.context = null;
    }

    /**
     * Creates the backing canvas. Browser-only; call from the render layer once
     * a DOM is available. Safe to call more than once.
     */
    public initCanvas(): HTMLCanvasElement {
        if (this.canvas) {
            return this.canvas;
        }
        this.canvas = document.createElement("canvas");
        this.canvas.id = "map";
        this.canvas.height = this.height;
        this.canvas.width = this.width;
        this.context = this.canvas.getContext("2d");
        this.context!.translate(
            (this.width ? this.width : 100) * 0.5,
            (this.height ? this.height : 100) * 0.5,
        );
        return this.canvas;
    }
}
