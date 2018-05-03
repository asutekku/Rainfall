export class Building{
    private name: string;
    width: number;
    height: number;
    private floors: number;
    xpos: number;
    ypos: number;
    constructor(name,width,height,floors){
        this.name = name;
        this.xpos = 0;
        this.ypos = 0;
        this.width = width;
        this.height = height;
        this.floors = floors;
    }
}