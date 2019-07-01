import {Utils} from "../../utils/utils";
import {Parts} from "../Equipment";
import {ammoType, StatGenerator, weaponBarrel, weaponBody, weaponMagazine, weaponSights, weaponStock} from "./WeaponParts";

export interface IWeapon {
    name: string;
}

export class GeneratedWeapon implements IWeapon {

    public weaponType: string;
    public mode: weaponMode;
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
    public clips: number;

    public name: string;
    public type: string;
    public stats: StatGenerator;
    magazine: weaponMagazine;
    private stock: weaponStock;
    private barrel: weaponBarrel;
    private sights: weaponSights;
    private body: weaponBody;

    constructor() {
        const body = new weaponBody('Nesti', 'Stanlock', 'assault_rifle');
        this.body = body;
        this.type = body.type;
        this.clips = 1;
        this.magazine = new weaponMagazine('Teddi', body.manufacturer, ammoType.small, 30);
        this.sights = new weaponSights('Glaz', body.manufacturer, 0.1, 0.05);
        this.barrel = Utils.pickRandom(Parts.barrels);
        this.stock = Utils.pickRandom(Parts.stocks);
        this.mode = weaponMode.single;
        this.name = this.getName(this.body, this.magazine, this.sights, this.barrel, this.stock);
        this.stats = new StatGenerator(this.body.type);
    }

    public setMode(mode: weaponMode) {
        this.mode = mode;
    }

    public getDamage(): number {
        let damageCaused: number = 0;
        const acc: number = this.stats.accuracyModifier;
        let baseAccuracy: number = this.mode === weaponMode.single ? acc : this.mode === weaponMode.burst ? acc * .8 : acc * .7;
        const maxRecoil: number = Math.floor(baseAccuracy * (this.stats.recoilModifier / 100));
        const recoilPerShot: number = Math.floor(maxRecoil / this.magazine.ammoCount);
        console.log('Base accuracy: ' + baseAccuracy);
        console.log('Max recoil: ' + maxRecoil);
        console.log('Recoil per shot: ' + recoilPerShot);
        let miss: number = 0;
        let hit: number = 0;
        const shots: number = this.mode === weaponMode.single ? 1 : this.mode === weaponMode.burst ? 4 : this.magazine.ammoCount;
        for (let i = 0; i < shots; i++) {
            if (this.magazine.ammoCount > 0 && this.clips > 0) {
                this.magazine.ammoCount--;
                if (Utils.chance(baseAccuracy)) {
                    let dmg = this.getShotDamage(this.stats.damageModifier);
                    damageCaused += dmg;
                    console.log(i + '. hit, damage: ' + dmg);
                    hit += 1;
                } else {
                    console.log('miss, chance to hit: ' + baseAccuracy);
                    miss += 1;
                }
                baseAccuracy -= recoilPerShot;
            }
        }
        return Math.floor(damageCaused);
    }

    private getName(body: weaponBody, mag: weaponMagazine, sights: weaponSights, barrel: weaponBarrel, stock: weaponStock): string {
        const name: string = body.name;
        const abbv: string = sights.name[0] + barrel.name[0] + stock.name[0];
        const ammo: string = mag.ammoType;
        return `${name} ${abbv} ${ammo}`;
    }

    private getShotDamage(damage: number): number {
        return Utils.getRandomInt(damage * 0.9, damage * 1.1);
    }
}

export enum weaponMode {
    burst = "burst",
    single = "single",
    rapid = "rapid"
}