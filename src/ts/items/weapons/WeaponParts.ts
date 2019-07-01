import {Utils} from "../../utils/utils";

export class WeaponPart {
    name: string;
    manufacturer: string;
    damageModifier: number;
    fireRateModifier: number;
    accuracyModifier: number;
    recoilModifier: number;
    cost: number;

    constructor(parameters: { name: string, manufacturer: string, dmg?: number, fr?: number, acc?: number, rec?: number, cost?: number }) {
        let {name, manufacturer, dmg, fr, acc, rec, cost} = parameters;
        this.name = name;
        this.manufacturer = manufacturer;
        this.fireRateModifier = fr ? fr : 0;
        this.accuracyModifier = acc ? acc : 0;
        this.damageModifier = dmg ? dmg : 0;
        this.recoilModifier = rec ? rec : 0;
        this.cost = cost ? cost : 0;
    }
}

export class weaponStock extends WeaponPart {
    constructor(name: string, manufacturer: string, dmg: number, fr: number, acc: number, rec: number) {
        super({
            name: name,
            manufacturer: manufacturer,
            dmg: dmg,
            fr: fr,
            acc: acc,
            rec: rec
        });
    }
}

export class weaponBarrel extends WeaponPart {
    constructor(name: string, manufacturer: string, dmg: number, fr: number, acc: number, rec: number) {
        super({
            name: name,
            manufacturer: manufacturer,
            dmg: dmg,
            fr: fr,
            acc: acc,
            rec: rec
        });
    }
}

export class weaponSights extends WeaponPart {
    constructor(name: string, manufacturer: string, acc: number, rec: number) {
        super({
            name: name,
            manufacturer: manufacturer,
            acc: acc,
            rec: rec
        });
    }
}

export class weaponMagazine extends WeaponPart {
    ammoType: ammoType;
    maxCapacity: number;
    ammoCount: number;

    constructor(name: string, manufacturer: string, type: ammoType, cap: number) {
        super({
            name: name,
            manufacturer: manufacturer
        });
        this.ammoType = type;
        this.maxCapacity = cap;
        this.ammoCount = cap;
    }
}

export enum ammoType {
    small = '8mm',
    medium = '12mm',
    large = '16mm'
}

export class weaponBody extends WeaponPart {
    type: string;

    constructor(name: string, manufacturer: string, type: string) {
        super({
            name: name,
            manufacturer: manufacturer
        });
        this.type = type;
    }
}

export class StatGenerator {
    damageModifier: number;
    fireRateModifier: number;
    accuracyModifier: number;
    recoilModifier: number;
    rangeModifier: number;

    constructor(weaponType?: string) {
        const modifiers: number[] = Utils.randomInts(5, 30, 100, 150, 300).sort((a, b) => b - a);
        switch (weaponType) {
            case 'Pistol':
                this.damageModifier = modifiers[0];
                this.recoilModifier = modifiers[1];
                this.rangeModifier = modifiers[2];
                this.accuracyModifier = modifiers[3];
                this.fireRateModifier = modifiers[4];
                break;
            case 'sniper_rifle':
                this.damageModifier = modifiers[0];
                this.rangeModifier = modifiers[1];
                this.accuracyModifier = modifiers[2];
                this.recoilModifier = modifiers[3];
                this.fireRateModifier = modifiers[4];
                break;
            case 'Assault Rifle':
                this.fireRateModifier = modifiers[0];
                this.damageModifier = modifiers[1];
                this.rangeModifier = modifiers[2];
                this.accuracyModifier = modifiers[3];
                this.recoilModifier = modifiers[4];
                break;
            case 'Submachine Gun':
                this.fireRateModifier = modifiers[0];
                this.recoilModifier = modifiers[1];
                this.rangeModifier = modifiers[2];
                this.damageModifier = modifiers[3];
                this.accuracyModifier = modifiers[4];
                break;
            case 'Shotgun':
                this.damageModifier = modifiers[0];
                this.recoilModifier = modifiers[1];
                this.accuracyModifier = modifiers[2];
                this.rangeModifier = modifiers[3];
                this.fireRateModifier = modifiers[4];
                break;
            default:
                this.damageModifier = modifiers[0];
                this.fireRateModifier = modifiers[1];
                this.accuracyModifier = modifiers[2];
                this.recoilModifier = modifiers[3];
                this.rangeModifier = modifiers[4];
                break;
        }
    }
}