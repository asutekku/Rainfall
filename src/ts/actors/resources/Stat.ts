export class Stat {
    name: string;
    description: string;
    value: number;
    short: string;

    constructor(name, short, desc, val) {
        this.name = name;
        this.short = short;
        this.description = desc;
        this.value = val;
    }
}
