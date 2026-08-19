import {Armor} from "../items/Armor";
import armors from "../items/armors";
import Equipment from "../items/Equipment";
import {Weapon} from "../items/Weapon";
import {Cyberware} from "../items/Cyberware";
import {default as cyberwareData} from "../../objects/cyberware";
import {Program} from "../items/Program";
import {default as programData} from "../../objects/programs";
import {Utils} from "../utils/utils";

const weapons = Equipment.weapons;

export class GetItem {
    public static weapon(name?: string): Weapon {
        const found: Weapon = name ? weapons.find((e) => e.name === name)! : Utils.pickRandom(weapons);
        return found.clone(); // per-owner instance (armour ablates, shots count)
    }

    /**
     * A common street weapon (handgun / SMG / shotgun / melee, ordinary
     * availability). Keeps enemy spawns from rolling snipers, machineguns or
     * rocket launchers out of the full 380-weapon catalog.
     */
    public static streetWeapon(): Weapon {
        const street = weapons.filter((w) =>
            ["pistol", "smg", "melee", "shotgun"].indexOf(w.weaponClass) !== -1 &&
            w.damageType === "kinetic" && w.rarity <= 3);
        return Utils.pickRandom(street).clone();
    }

    /**
     * A random kinetic weapon drawn from the given classes (for faction loadouts).
     * `maxDice` caps the d6 count so a street enemy can't roll an anti-materiel
     * rocket out of the "rifle" bucket.
     */
    public static weaponOfClass(classes: string[], maxRarity: number = 3, minDice: number = 0, maxDice: number = 6): Weapon {
        const inClass = (w: any) => classes.indexOf(w.weaponClass) !== -1 && w.damageType === "kinetic";
        const pool = weapons.filter((w) =>
            inClass(w) && w.rarity <= maxRarity && w.diceThrows >= minDice && w.diceThrows <= maxDice);
        const list = pool.length ? pool
            : weapons.filter((w) => inClass(w) && w.rarity <= maxRarity && w.diceThrows <= maxDice);
        return Utils.pickRandom(list.length ? list : weapons.filter((w) => w.weaponClass === "pistol")).clone();
    }

    /**
     * Returns a fresh Armor instance (a clone of the template). Armor ablates
     * as it takes hits, so each wearer needs its own object — handing out the
     * shared template would degrade it globally.
     */
    public static armor(name?: string): Armor {
        const t: Armor = name ? armors.find((a) => a.name === name)! : Utils.pickRandom(armors);
        return new Armor(t.bodyPart, t.name, t.set, t.level, t.stoppingPower, t.cost, t.description);
    }

    /** Chrome by mark name — resolves which line and mark the name belongs to. */
    public static cyberware(name: string): Cyberware {
        for (const line of cyberwareData) {
            const idx = line.marks.findIndex((m) => m.name === name);
            if (idx >= 0) { return new Cyberware(line, idx + 1); }
        }
        throw new Error(`unknown cyberware: ${name}`);
    }

    public static program(name: string): Program {
        return new Program(programData[name]!);
    }

}
