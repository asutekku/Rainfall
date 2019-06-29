import {Actor} from "./Actor";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Player extends Actor {
    constructor(position?: ObjectPosition) {
        super();
        //this.gender = Name.getGender();
        this.level = 1;
        this.position = position ? position : new ObjectPosition();
        //this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        //this.role = new Role();
        //this.item = GetItem.item();
        //this.weapon = new GeneratedWeapon();
        //this.weapon = GetItem.weapon("weapon_stakeout");
    }
}
