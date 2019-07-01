import {default as w} from "../../objects/weapons";
import {Weapon} from "./weapons/Weapon";
import {weaponBarrel, weaponStock} from "./weapons/WeaponParts";

let stocks: any = require("../../objects/weapons/weapon_stocks.json");
let barrels: any = require("../../objects/weapons/weapon_barrels.json");

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
    public static stocks: weaponStock[] = stocks.map((stock: any) => {
        return new weaponStock(stock.name, stock.manufacturer, stock.damage, stock.fireRate, stock.accuracy, stock.recoil);
    });
    public static barrels: weaponStock[] = barrels.map((barrel: any) => {
        return new weaponBarrel(barrel.name, barrel.manufacturer, barrel.damage, barrel.fireRate, barrel.accuracy, barrel.recoil);
    });
}
