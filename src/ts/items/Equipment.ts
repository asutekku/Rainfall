import {default as w} from "../../objects/weapons";
import {Weapon} from "./weapons/Weapon";
import {weaponStock} from "./weapons/WeaponParts";

let stocks: any = require("../../objects/weapons/weapon_stocks.json");

export default class Equipment {
    public static weapons: Weapon[] = Array.from(Object.keys(w as Object)).map((e: any) => {
        return new Weapon(
            e.type,
            e.name,
            e.rarity,
            e.crit,
            e.shots,
            e.rateOfFire,
            e.reliability,
            e.cost,
            e.desc,
            e.brand,
            e.ammo,
        );
    });
}

export class Parts {
    public static stocks: weaponStock[] = stocks.map((s: any) => {
        return new weaponStock(s.name, s.manufacturer, s.damage, s.fireRate, s.accuracy, s.recoil);
    });
    public static barrels: weaponStock[] = Array.from(Object.keys(stocks as Object)).map((s: any) => {
        return new weaponStock(s.name, s.manufacturer, s.damage, s.fireRate, s.accuracy, s.recoil);
    });
}
