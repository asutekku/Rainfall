import {Actor} from "../Actor";
import {getItem} from "../../interact/getItem";
import {Name} from "../resources/Name";
import {Role} from "../resources/Role";
import {Statistics} from "../resources/Statistics";
import {Utils} from "../../utils/utils";

export class Goon extends Actor {
    constructor() {
        super();
        this.weapon = getItem.weapon();
        this.gender = Name.getGender();
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.items = [getItem.item()];
        this.item = getItem.item();
        this.role = new Role();
        this.color = this.role.color;
        this.weapon = getItem.weapon();
        this.level = Math.floor(Statistics.level + Utils.range(1, 3));
        this.currency = Math.floor(Utils.range(20, 50));
        this.health = Math.floor(Utils.range(
            Math.floor(Statistics.level ^ (2 / 0.09)) * 0.9,
            Math.floor(Statistics.level ^ (2 / 0.09)) * 1.1
        ));
        this.experience = Math.floor(Statistics.level ^ (2 / 0.4));
    }
}
