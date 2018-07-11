import { Actor } from "./Actor";
import { Role } from "./resources/Role";
import { Name } from "./resources/Name";
import { getItem } from "../interact/getItem";

export class Player extends Actor {
    constructor() {
        super();
        this.gender = Name.getGender();
        this.level = 1;
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.role = new Role();
        this.color = this.role.color;
        this.item = getItem.item();
        this.weapon = getItem.getWeapon("weapon_fists");
    }
}
