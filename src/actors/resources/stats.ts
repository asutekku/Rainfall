export class Stats {
    static get inventory(): any[] {
        return this._inventory;
    }

    static set inventory(value) {
        this._inventory.push(value);
    }

    static get level(): number {
        return this._level;
    }

    static set level(value: number) {
        this._level = value;
    }

    static get money(): number {
        return this._money;
    }

    static set money(value: number) {
        this._money = value;
    }

    static get kills(): number {
        return this._kills;
    }

    static set kills(value: number) {
        this._kills = value;
    }

    private static _kills: number = 0;
    private static _money: number = 0;
    private static _level: number = 0;
    private static _inventory: any[] = [];
}

