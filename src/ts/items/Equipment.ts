import {default as weaponData} from "../../objects/weapons";
import {Weapon} from "./Weapon";

export default class Equipment {
    public static weapons: Weapon[] = weaponData.map((cfg) => new Weapon(cfg));
}
