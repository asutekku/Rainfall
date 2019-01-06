import {GetItem} from "../interact/getItem";
import {Utils} from "../utils/utils";
import {Actor} from "./Actor";
import {Name} from "./resources/Name";
import {Role} from "./resources/Role";
import {Statistics} from "./resources/Statistics";

export class Enemy extends Actor {
    constructor() {
        super();
        this.weapon = GetItem.weapon();
        this.gender = Name.getGender();
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.items = [GetItem.item()];
        this.item = GetItem.item();
        this.role = new Role();
        this.weapon = GetItem.weapon();
        this.level = Math.floor(Statistics.level + Utils.range(1, 3));
        this.currency = Math.floor(Utils.range(20, 50));
        this.health = Utils.range(
            Math.floor(Statistics.level ^ (2 / 0.09)) * 0.9,
            Math.floor(Statistics.level ^ (2 / 0.09)) * 1.1,
        );
        this.experience = Math.floor(Statistics.level ^ (2 / 0.4));
    }
}
