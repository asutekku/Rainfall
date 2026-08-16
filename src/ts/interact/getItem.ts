import {Actor} from "../actors/Actor";
import {Purse} from "./crew";
import {Player} from "../actors/player";
import {Armor} from "../items/Armor";
import armors from "../items/armors";
import Equipment from "../items/Equipment";
import {Item} from "../items/Item";
import items from "../items/items";
import {Medical} from "../items/Scrap";
import {Weapon} from "../items/Weapon";
import {Cyberware} from "../items/Cyberware";
import {default as cyberwareData} from "../../objects/cyberware";
import {Program} from "../items/Program";
import {default as programData} from "../../objects/programs";
import {Vehicle} from "../items/Vehicle";
import {default as vehicleData} from "../items/vehicles";
import {State} from "../utils/State";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {Messages} from "./messages";

const Log = en_US.Log;

const weapons = Equipment.weapons;

export class GetItem {
    public static weapon(name?: string): Weapon {
        const found: Weapon = name ? weapons.find((e) => e.name === name)! : Utils.pickRandom(weapons);
        return found.clone(); // per-owner instance (independent equipped/level state)
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

    public static cyberware(name: string): Cyberware {
        return new Cyberware(cyberwareData.find((c) => c.name === name)!);
    }

    public static program(name: string): Program {
        return new Program(programData[name]!);
    }

    public static vehicle(name: string): Vehicle {
        return new Vehicle(vehicleData[name]!);
    }

    public static item() {
        const randomItem = Math.floor(Math.random() * 3);
        if (randomItem === 0) {
            return GetItem.armor();
        } else if (randomItem === 1) {
            return Utils.pickRandom(weapons).clone();
        } else if (randomItem === 2) {
            return Utils.pickRandom(items);
        }
    }

    public static updateCurrency(money: number, actor: Actor) {
        if (money >= 0) {
            Messages.logMessage(Log.findMoney, actor);
            // Fixer "Operator" negotiates a better cut: every eddie is 20% bigger.
            Purse.earn(actor, Math.floor(money * (1 + actor.fixerCut())));
        } else {
            Messages.logMessage(Log.insufficientFunds, actor);
        }
    }

    public static addItemToInventory(item: Item | Armor | Weapon | Medical, actor: Actor) {
        actor.inventory[GetItem.inventoryBucket(item)]!.push(item);
    }

    /**
     * Maps an item's `type` to its inventory bucket. Item types are singular
     * ("weapon", "drug", ...) while the inventory is keyed "weapons", "armor",
     * "misc", "medical"; without this mapping, looting a weapon or drug indexes
     * a non-existent bucket and throws.
     */
    private static inventoryBucket(item: Item): string {
        switch (item.type) {
            case "weapon":
                return "weapons";
            case "armor":
                return "armor";
            case "medical":
                return "medical";
            default:
                return "misc";
        }
    }

    /**
     * Equips/uses an item by mutating the model only. Rendering the resulting
     * equipped/health state is the view layer's job (it re-reads the model),
     * which keeps this usable headless and in tests.
     */
    public static useItem(item: Item) {
        const player: Player = State.player!;
        if (item instanceof Weapon) {
            const equipWeapon = !item.equipped;
            player.inventory.weapons.forEach((w) => (w.equipped = false));
            player.weapon = equipWeapon ? (item as Weapon) : GetItem.weapon("Fists");
            item.equipped = equipWeapon;
        }
        if (item instanceof Armor) {
            const equipArmor = !item.equipped;
            player.inventory.armor
                .filter((w) => w.bodyPart === item.bodyPart)
                .forEach((e) => (e.equipped = false));
            player.equipment[item.bodyPart!] = equipArmor ? item : null;
            item.equipped = equipArmor;
        }
        if (item instanceof Medical) {
            player.health = Math.min(player.maxHealth, player.health + item.restorePoints!);
        } else {
            // currentActor.inventory.misc.push(item);
        }
    }
}
