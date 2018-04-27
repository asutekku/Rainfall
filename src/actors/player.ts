import {Actor} from "./Actor";
import{name} from "./tools/nameBuilder";
import{gender} from "./tools/nameBuilder";
import {Role} from "./resources/Role";

export class Player extends Actor {
    constructor() {
        super();
        this.name = name();
        this.role = new Role();
        this.color = this.role.color;
        this.gender = gender();
    }
}