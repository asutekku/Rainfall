import {GetItem} from "../../interact/getItem";
import {Utils} from "../../utils/utils";
import {Actor} from "../Actor";
import {Statistics} from "../resources/Statistics";
import {ObjectPosition} from "../../utils/ObjectPosition";

export class Goon extends Actor {
    constructor(position?: ObjectPosition) {
        super(position);
        const getHealth = Math.floor(Utils.getRandomInt(
            Math.floor(Statistics.level ^ (2 / 0.09)) * 0.9,
            Math.floor(Statistics.level ^ (2 / 0.09)) * 1.1,
        ));
        //this.weapon = new GeneratedWeapon();
        //this.gender = Name.getGender();
        //this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.items = [GetItem.item()];
        this.item = GetItem.item();
        //this.role = new Role();
        this.hostile = true;
        this.level = Math.floor(Statistics.level + Utils.getRandomInt(1, 3));
        this.currency = Math.floor(Utils.getRandomInt(20, 50));
        this.health = getHealth;
        this.maxHealth = getHealth;
        this.experience = Math.floor(Statistics.level ^ (2 / 0.4));
    }
}
