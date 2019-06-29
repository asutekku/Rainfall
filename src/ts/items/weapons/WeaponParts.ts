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
    ammoType: string;
    maxCapacity: number;
    ammoCount: number;

    constructor(name: string, manufacturer: string, type: string, cap: number) {
        super({
            name: name,
            manufacturer: manufacturer
        });
        this.ammoType = type;
        this.maxCapacity = cap;
        this.ammoCount = this.maxCapacity;
    }
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

    constructor(weapontype?: string) {
        const modifiers: number[] = Utils.randomInts(5, 10, 100, 150, 250);
        switch (weapontype) {
            case 'Pistol':
                this.damageModifier = Utils.maxRemove(modifiers);
                this.recoilModifier = Utils.maxRemove(modifiers);
                this.rangeModifier = Utils.maxRemove(modifiers);
                this.accuracyModifier = Utils.maxRemove(modifiers);
                this.fireRateModifier = Utils.maxRemove(modifiers);
                break;
            case 'sniper_rifle':
                this.damageModifier = Utils.maxRemove(modifiers);
                this.rangeModifier = Utils.maxRemove(modifiers);
                this.accuracyModifier = Utils.maxRemove(modifiers);
                this.recoilModifier = Utils.maxRemove(modifiers);
                this.fireRateModifier = Utils.maxRemove(modifiers);
                break;
            case 'Assault Rifle':
                this.fireRateModifier = Utils.maxRemove(modifiers);
                this.damageModifier = Utils.maxRemove(modifiers);
                this.rangeModifier = Utils.maxRemove(modifiers);
                this.accuracyModifier = Utils.maxRemove(modifiers);
                this.recoilModifier = Utils.maxRemove(modifiers);
                break;
            case 'Submachine Gun':
                this.fireRateModifier = Utils.maxRemove(modifiers);
                this.recoilModifier = Utils.maxRemove(modifiers);
                this.rangeModifier = Utils.maxRemove(modifiers);
                this.damageModifier = Utils.maxRemove(modifiers);
                this.accuracyModifier = Utils.maxRemove(modifiers);
                break;
            case 'Shotgun':
                this.damageModifier = Utils.maxRemove(modifiers);
                this.recoilModifier = Utils.maxRemove(modifiers);
                this.accuracyModifier = Utils.maxRemove(modifiers);
                this.rangeModifier = Utils.maxRemove(modifiers);
                this.fireRateModifier = Utils.maxRemove(modifiers);
                break;
            default:
                this.damageModifier = modifiers[0];
                this.fireRateModifier = modifiers[1];
                this.accuracyModifier = modifiers[2];
                this.recoilModifier = modifiers[3];
                this.rangeModifier = modifiers[5];
                break;
        }
    }
}