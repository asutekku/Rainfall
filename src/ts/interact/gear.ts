import type {Actor} from "../actors/Actor";
import type {Armor} from "../items/Armor";
import type {Weapon} from "../items/Weapon";
import {GetItem} from "./getItem";

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

    /**
     * Go in bare-knuckle. Fists aren't an item you can run out of, so this
     * never depends on a copy surviving in the pack: the current weapon goes
     * back in, any stray pack Fists are absorbed, and a fresh pair comes up.
     */
    public static equipFists(a: Actor): string | null {
        if (a.weapon && a.weapon.name === "Fists") { return null; }
        const old = a.weapon;
        if (old && old.name !== "Fists") {
            old.equipped = false;
            a.inventory.weapons.push(old);
        }
        a.inventory.weapons = a.inventory.weapons.filter((w: Weapon) => w.name !== "Fists");
        a.weapon = GetItem.weapon("Fists");
        a.weapon.equipped = true;
        return `${a.name.split(" ")[0]} goes in bare-knuckle.`;
    }

    /** The one-line spec sheet a weapon prints wherever it's listed. */
    public static weaponLine(w: Weapon): string {
        return `${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}${w.ap ? " AP" : ""}` +
            ` · ROF ${w.rateOfFire} · ${w.range}m`;
    }

    /**
     * The rarity ladder, on the game's own palette: common stays plain, then
     * green, chrome-blue, purple, and gold for the one-of-a-kinds. Undefined
     * means "let the row's normal ink stand".
     */
    public static rarityColor(item: {rarity?: number}): string | undefined {
        const r = item.rarity || 0;
        if (r >= 5) { return "var(--warn)"; }
        if (r >= 4) { return "var(--rare)"; }
        if (r >= 3) { return "var(--chrome)"; }
        if (r >= 2) { return "var(--good)"; }
        return undefined;
    }

    /** Sort key for a weapon list: rarest first, hardest-hitting inside a tier. */
    public static power(w: Weapon): number {
        return (w.rarity || 0) * 100000 + w.diceThrows * 600 + (w.damage || 0) * 100 + (w.cost || 0) / 100;
    }
}
