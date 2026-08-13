import {GetItem} from "../interact/getItem";
import {Utils} from "../utils/utils";
import {Actor} from "./Actor";
import {Name} from "./resources/Name";
import {Role} from "./resources/Role";
import {Statistics} from "./resources/Statistics";

export class Enemy extends Actor {
    constructor() {
        super();
        this.gender = Name.getGender();
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.items = [GetItem.item()];
        this.item = GetItem.item();
        this.role = new Role();
        this.weapon = GetItem.streetWeapon();
        // RED street-thug profile; HP is derived from BODY/WILL in setCombatProfile.
        this.setCombatProfile({ref: 5, dex: 5, body: 6, will: 5, skill: 2, luck: 3, roleRank: 3});
        this.equipment.upper = GetItem.armor("Kevlar Vest"); // street-thug body armour (SP 6)
        this.level = Math.floor(Statistics.level + Utils.range(1, 3));
        this.currency = Math.floor(Utils.range(20, 50));
        // XP reward for killing this enemy, scaled by its level (was a XOR).
        this.experience = Math.floor(this.level * 15);
    }
}
