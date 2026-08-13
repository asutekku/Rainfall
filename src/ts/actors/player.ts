import {GetItem} from "../interact/getItem";
import {Actor} from "./Actor";
import {Name} from "./resources/Name";
import {Role} from "./resources/Role";

export class Player extends Actor {
    constructor() {
        super();
        this.gender = Name.getGender();
        this.level = 1;
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.role = new Role();
        this.item = GetItem.item();
        // A RED merc starts armed with a sidearm; Fists stay as a fallback.
        this.weapon = GetItem.weapon("WSA Autopistol");
        this.inventory.weapons.push(GetItem.weapon("Fists"));
        // A capable RED merc: good REF/DEX/BODY/WILL, trained combat skills, a
        // full Luck pool and a rank-6 Role Ability (Combat Awareness if a Solo).
        this.setCombatProfile({ref: 7, dex: 6, body: 7, will: 6, skill: 4, luck: 7, roleRank: 6});
        // RED: everyone runs armour. Start in a Light Armor Jacket (SP ~ RED Light Armorjack).
        this.equipment.upper = GetItem.armor("Light Armor Jacket");
        this.equipment.headgear = GetItem.armor("Kevlar Helmet");
    }
}
