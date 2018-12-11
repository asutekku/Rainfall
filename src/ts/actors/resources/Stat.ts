export class Stat {
    public name: string;
    public description: string;
    public value: number;
    public short: string;

    constructor(name: string, short: string, desc: string, val: number) {
        this.name = name;
        this.short = short;
        this.description = desc;
        this.value = val;
    }
}
