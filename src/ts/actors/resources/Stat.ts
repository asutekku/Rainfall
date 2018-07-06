export class Stat {
    name: string;
    description: string;
    value: number;
    short: string;

    constructor(name:string, short:string, desc:string, val:number) {
        this.name = name;
        this.short = short;
        this.description = desc;
        this.value = val;
    }
}
