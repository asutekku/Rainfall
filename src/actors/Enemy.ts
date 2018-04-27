import {Actor} from "./Actor";
import {Role} from "./resources/Role";
import {Utils} from "../utils/utils";
import {getItem} from "../interact/getItem";
import {Stats} from "./resources/stats";
import {Name} from "./resources/Name";

export class Enemy extends Actor {
    constructor() {
        super();
        this.weapon = getItem.weapon();
        this.gender = Name.getGender();
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.items = [getItem.item()];
        this.item = getItem.item();
        this.role = new Role();
        this.color = this.role.color;
        this.level = Math.floor((Stats.level) + Utils.range(1, 3));
        this.currency = Math.floor(Utils.range(20, 50));
        this.health = Utils.range(Math.floor(Stats.level ^ 2 / 0.09) * 0.9,
            Math.floor(Stats.level ^ 2 / 0.09) * 1.1);
        this.experience = Math.floor(Stats.level ^ 2 / 0.4);
    }
}
