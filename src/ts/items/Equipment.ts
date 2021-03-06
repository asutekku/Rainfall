import {default as w} from "../../objects/weapons";
import {Weapon} from "./Weapon";

export default class Equipment {
    public static weapons: Weapon[] = Array.from(Object.values(w as Object)).map((e) => {
        return new Weapon(
            e.type,
            e.name,
            e.accuracy,
            e.rarity,
            e.damage,
            e.crit,
            e.diceThrows,
            e.shots,
            e.rateOfFire,
            e.reliability,
            e.range,
            e.cost,
            e.desc,
            e.brand,
            e.ammo,
        );
    });
}
