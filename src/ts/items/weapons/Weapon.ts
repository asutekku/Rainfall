import {Utils} from "../../utils/utils";
import {Item} from "../Item";
import {ObjectPosition} from "../../utils/ObjectPosition";
import {StatGenerator} from "./WeaponParts";

export class Weapon extends Item {
    public weaponType: string;
    public reliability: number;
    public accuracy: number;
    public rarity: number;
    public damage: number;
    public criticalChance: number;
    public recoil: number;
    public shots: number;
    public rateOfFire: number;
    public range: number;
    public level: number;
    public equipped: boolean;
    public manufacturer: string;
    public ammoType: string;

    constructor(
        weaponType: string,
        name: string,
        rarity: number,
        criticalChance: number,
        shots: number,
        rateOfFire: number,
        reliability: number,
        cost: number,
        description: string,
        manufacturer: string,
        ammo: string,
    ) {
        super("weapon", name, cost, description, new ObjectPosition(0, 0, 0));
        const stats = new StatGenerator(weaponType);
        this.weaponType = weaponType;
        this.rarity = rarity;
        this.criticalChance = criticalChance;
        this.shots = this.getShots(shots);
        this.reliability = reliability;
        this.accuracy = stats.accuracyModifier;
        this.damage = stats.damageModifier;
        this.rateOfFire = stats.fireRateModifier;
        this.range = stats.rangeModifier;
        this.recoil = stats.recoilModifier;
        this.manufacturer = manufacturer;
        this.level = 1;
        this.equipped = false;
        this.ammoType = ammo;
    }

    /**
     * Returns damage caused with 20% variability
     * @param damage Weapon damage
     */
    private static getShotDamage(damage: number): number {
        return Utils.getRandomInt(damage * 0.9, damage * 1.1);
    }

    /**
     * Magical function to return the damage caused by the weapon
     * Also counts the hits and misses (Not used yet though)
     */
    public getDamage(): number {
        let damage = 0;
        let shotAccuracy = this.accuracy;
        const recoilPerShot = this.recoil / this.shots;
        const maxRecoil = (100 - shotAccuracy) / 2;
        const recoilInc = Math.floor(maxRecoil / recoilPerShot);
        let miss = 0;
        let hit = 0;
        for (let i = 0; i <= this.shots; i++) {
            if (Utils.chance(shotAccuracy)) {
                damage += Weapon.getShotDamage(this.damage);
                hit += 1;
            } else {
                miss += 1;
            }
            shotAccuracy += recoilInc;
        }
        return Math.floor(damage);
    }

    public getShotDamageString(damage: number): string {
        return `(${Math.floor(damage * 0.9)}-${Math.floor(damage * 1.1)})*${this.shots}`;
    }

    /**
     * Returns the amount of shots from rate of fire
     * @param rateOfFire Weapon rate of fire
     */
    private getShots(rateOfFire: number): number {
        return Math.ceil(rateOfFire / 100);
    }
}
