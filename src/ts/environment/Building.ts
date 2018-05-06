export class Building {
    private name: string;
    width: number;
    height: number;
    private floors: number;
    x: number;
    y: number;

    constructor(name, width, height, floors) {
        this.name = name;
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.floors = floors;
    }

    draw(ctx) {
        ctx.fillStyle = "#000";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
