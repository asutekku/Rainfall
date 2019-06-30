import {Utils} from "../../utils/utils";
import {Parts} from "../Equipment";
import {StatGenerator, weaponBarrel, weaponBody, weaponMagazine, weaponSights, weaponStock} from "./WeaponParts";

export class GeneratedWeapon {

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

    public name: string;
    public type: string;
    public stats: StatGenerator;
    private stock: weaponStock;
    private barrel: weaponBarrel;
    private sights: weaponSights;
    private magazine: weaponMagazine;
    private body: weaponBody;

    constructor() {
        const body = new weaponBody('Nesti', 'Stanlock', 'assault_rifle');
        this.body = body;
        this.type = body.type;
        this.magazine = new weaponMagazine('Teddi', body.manufacturer, '8mm', 30);
        this.sights = new weaponSights('Glaz', body.manufacturer, 0.1, 0.05);
        this.barrel = Utils.pickRandom(Parts.barrels);
        this.stock = Utils.pickRandom(Parts.stocks);
        this.name = GeneratedWeapon.getName(this.body, this.magazine, this.sights, this.barrel, this.stock);
        this.stats = new StatGenerator(this.body.type);
    }

    private static getName(body: weaponBody, mag: weaponMagazine, sights: weaponSights, barrel: weaponBarrel, stock: weaponStock): string {
        const name: string = body.name;
        const abbv: string = sights.name[0] + barrel.name[0] + stock.name[0];
        const ammo: string = mag.ammoType;
        return `${name} ${abbv} ${ammo}`;
    }

    private static getShotDamage(damage: number): number {
        return Utils.getRandomInt(damage * 0.9, damage * 1.1);
    }

    public getDamage(): number {
        let damage = 0;
        let shotAccuracy = this.stats.accuracyModifier;
        const recoilPerShot = this.stats.recoilModifier / this.magazine.ammoCount;
        const maxRecoil = (100 - shotAccuracy) / 2;
        const recoilInc = Math.floor(maxRecoil / recoilPerShot);
        let miss = 0;
        let hit = 0;
        for (let i = 0; i <= this.magazine.ammoCount; i++) {
            if (Utils.chance(shotAccuracy)) {
                damage += GeneratedWeapon.getShotDamage(this.stats.damageModifier);
                hit += 1;
            } else {
                miss += 1;
            }
            shotAccuracy += recoilInc;
        }
        return Math.floor(damage);
    }
}