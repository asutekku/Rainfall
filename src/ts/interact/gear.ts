import type {Actor} from "../actors/Actor";
import type {Armor} from "../items/Armor";
import type {Weapon} from "../items/Weapon";
import {Stash} from "./crew";
import {GetItem} from "./getItem";

/**
 * Equipping, in one place.
 *
 * The inventory panel and the staging screen both let a merc change what they
 * hold; the swap rules belong to neither screen. Spare gear lives in the crew
 * stash (see `Stash`), so any merc can kit up out of it: equipping pulls the
 * piece from wherever it sits and the old piece goes back to the stash. The
 * two exceptions are Fists (a state, not an item) and cyberweapons (bolted
 * into a body — they travel in that actor's own pocket and never enter the
 * shared duffel). Each call mutates the actors and returns a feed line for
 * whoever wants to print one.
 */
export class Gear {

    /** A chrome-granted weapon is part of the body it's installed in. */
    public static isCyberweapon(a: Actor, w: Weapon): boolean {
        return a.cybernetics.some((c) => c.effects.grantsWeapon === w.name);
    }

    /** Everything `a` could swap to: their own pocket (cyberweapons) plus the stash. */
    public static weaponChoices(a: Actor): Weapon[] {
        const stash = Stash.of(a);
        const own = stash === a.inventory ? [] : a.inventory.weapons;
        return [...own, ...stash.weapons].filter((w) => w.name !== "Fists");
    }

    /** Every piece of armour `a` could strap on. */
    public static armorChoices(a: Actor): Armor[] {
        const stash = Stash.of(a);
        const own = stash === a.inventory ? [] : (a.inventory.armor as Armor[]);
        return [...own, ...stash.armor];
    }

    /** Pull `w` out of whichever bag holds it (the actor's pocket wins over the stash). */
    private static takeWeapon(a: Actor, w: Weapon): boolean {
        for (const bag of [a.inventory.weapons, Stash.of(a).weapons]) {
            const at = bag.indexOf(w);
            if (at >= 0) { bag.splice(at, 1); return true; }
        }
        return false;
    }

    /** The old weapon goes back where it belongs: pocket for chrome, stash for steel. */
    private static shelveWeapon(a: Actor, old: Weapon): void {
        old.equipped = false;
        (Gear.isCyberweapon(a, old) ? a.inventory.weapons : Stash.of(a).weapons).push(old);
    }

    /** Swap to `w`; the old weapon goes back to the stash (or the pocket, for chrome). */
    public static equipWeapon(a: Actor, w: Weapon): string | null {
        if (!Gear.takeWeapon(a, w)) { return null; }
        const old = a.weapon;
        if (old && old.name !== "Fists") { Gear.shelveWeapon(a, old); }
        a.weapon = w;
        w.equipped = true;
        return `${a.name.split(" ")[0]} swaps to the ${w.name}.`;
    }

    /** Strap on `piece`; the old piece in that slot goes back to the stash. */
    public static equipArmor(a: Actor, piece: Armor): string | null {
        let found = false;
        for (const bag of [a.inventory.armor, Stash.of(a).armor]) {
            const at = bag.indexOf(piece);
            if (at >= 0) { bag.splice(at, 1); found = true; break; }
        }
        if (!found) { return null; }
        const slot = piece.bodyPart === "headgear" ? "headgear" : "upper";
        const old = a.equipment[slot] as Armor | null;
        if (old) {
            old.equipped = false;
            Stash.of(a).armor.push(old);
        }
        a.equipment[slot] = piece;
        piece.equipped = true;
        return `${a.name.split(" ")[0]} straps on the ${piece.name} (SP ${piece.stoppingPower}).`;
    }

    /**
     * Go in bare-knuckle. Fists aren't an item you can run out of, so this
     * never depends on a copy surviving in a bag: the current weapon is
     * shelved, any stray Fists copies are absorbed, and a fresh pair comes up.
     */
    public static equipFists(a: Actor): string | null {
        if (a.weapon && a.weapon.name === "Fists") { return null; }
        const old = a.weapon;
        if (old && old.name !== "Fists") { Gear.shelveWeapon(a, old); }
        a.inventory.weapons = a.inventory.weapons.filter((w: Weapon) => w.name !== "Fists");
        const stash = Stash.of(a);
        if (stash !== a.inventory) { stash.weapons = stash.weapons.filter((w) => w.name !== "Fists"); }
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
