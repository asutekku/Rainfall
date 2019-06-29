import {GetItem} from "../interact/getItem";
import {Utils} from "../utils/utils";
import {Actor} from "./Actor";
import {Statistics} from "./resources/Statistics";

export class Enemy extends Actor {
    constructor() {
        super();
        //this.weapon = new GeneratedWeapon()
        //this.gender = Name.getGender();
        //this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.items = [GetItem.item()];
        this.hostile = true;
        //this.item = GetItem.item();
        //this.role = new Role();
        this.level = Math.floor(Statistics.level + Utils.getRandomInt(1, 3));
        this.currency = Math.floor(Utils.getRandomInt(20, 50));
        this.health = Utils.getRandomInt(
            Math.floor(Statistics.level ^ (2 / 0.09)) * 0.9,
            Math.floor(Statistics.level ^ (2 / 0.09)) * 1.1,
        );
        this.experience = Math.floor(Statistics.level ^ (2 / 0.4));
    }
}
