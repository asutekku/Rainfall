import type {Actor} from "../actors/Actor";
import type {Armor} from "../items/Armor";
import type {Weapon} from "../items/Weapon";

/**
 * Equipping, in one place.
 *
 * The inventory panel and the staging screen both let a merc change what they
 * hold; the swap rules (the old piece goes back in the pack, Fists don't)
 * belong to neither screen. Each call mutates the actor and returns a feed
 * line for whoever wants to print one.
 */
export class Gear {

    /** Swap to the weapon at `idx` of the pack; the old one goes back in it. */
    public static equipWeapon(a: Actor, idx: number): string | null {
        const w = a.inventory.weapons[idx] as Weapon | undefined;
        if (!w) { return null; }
        a.inventory.weapons.splice(idx, 1);
        const old = a.weapon;
        if (old && old.name !== "Fists") {
            old.equipped = false;
            a.inventory.weapons.push(old);
        }
        a.weapon = w;
        w.equipped = true;
        return `${a.name.split(" ")[0]} swaps to the ${w.name}.`;
    }

    /** Strap on the armour at `idx` of the pack; the old piece goes back in it. */
    public static equipArmor(a: Actor, idx: number): string | null {
        const piece = a.inventory.armor[idx] as Armor | undefined;
        if (!piece) { return null; }
        a.inventory.armor.splice(idx, 1);
        const slot = piece.bodyPart === "headgear" ? "headgear" : "upper";
        const old = a.equipment[slot] as Armor | null;
        if (old) {
            old.equipped = false;
            a.inventory.armor.push(old);
        }
        a.equipment[slot] = piece;
        piece.equipped = true;
        return `${a.name.split(" ")[0]} straps on the ${piece.name} (SP ${piece.stoppingPower}).`;
    }

    /** The one-line spec sheet a weapon prints wherever it's listed. */
    public static weaponLine(w: Weapon): string {
        return `${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}${w.ap ? " AP" : ""}` +
            ` · ROF ${w.rateOfFire} · ${w.range}m`;
    }
}
