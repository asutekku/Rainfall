import {default as weaponData} from "../../objects/weapons";
import {default as cyberweaponData} from "../../objects/cyberweapons";
import {Weapon} from "./Weapon";

export default class Equipment {
    public static weapons: Weapon[] =
        [...weaponData, ...cyberweaponData].map((cfg) => new Weapon(cfg));
}
