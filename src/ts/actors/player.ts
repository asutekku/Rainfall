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
        this.weapon = GetItem.weapon("Fists");
        //this.weapon = GetItem.weapon("weapon_stakeout");
    }
}
