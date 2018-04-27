import {Actor} from "./Actor";
import{name} from "./tools/nameBuilder";
import{gender} from "./tools/nameBuilder";
import {Role} from "./resources/Role";
import {Utils} from "../utils/utils";
import {getItem} from "../interact/getItem";
import {Stats} from "./resources/stats";

export class Enemy extends Actor {
    constructor() {
        super();
        this.weapon = getItem.weapon();
        this.name = name();
        this.gender = gender();
        this.items = [getItem.item()];
        this.role = new Role();
        this.color = this.role.color;
        this.level = Math.floor((Stats.level) + Utils.range(1, 3));
        this.currency = Math.floor(Utils.range(50, 20));
        this.experience = Math.floor(Utils.range(50, 20));
    }
}
