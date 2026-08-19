import type {Actor} from "../actors/Actor";
import type {Armor} from "../items/Armor";
import type {Weapon} from "../items/Weapon";
import {Stash} from "./crew";
import {GetItem} from "./getItem";

/**
 * Equipping, in one place.
 *
 * The inventory panel and the staging screen both let a merc change what they
 * hold; the swap rules belong to neither screen. Spare gear lives in exactly
 * one place — The Stash (see `Stash`) — so any merc can kit up out of it:
 * equipping pulls the piece from it and the old piece goes back in. The two
 * things that are not items in a bag: Fists (a state — conjured on demand)
 * and cyberweapons (part of the body — derived from the chrome list, never
 * stored anywhere). Each call mutates the actors and returns a feed line for
 * whoever wants to print one.
 */
export class Gear {

    /** A chrome-granted weapon is part of the body it's installed in. */
    public static isCyberweapon(a: Actor, w: Weapon): boolean {
        return a.cybernetics.some((c) => c.effects.grantsWeapon === w.name);
    }

    /**
     * The weapons this actor's chrome grants, minus the one already in hand.
     * Built fresh from the cybernetics list — a cyberweapon is a property of
     * the body, so it never sits in a bag and can never be lost, fenced or
     * picked up by anyone else.
     */
    public static chromeWeapons(a: Actor): Weapon[] {
        return a.cybernetics
            .map((c) => c.effects.grantsWeapon)
            .filter((n): n is string => !!n && a.weapon.name !== n)
            .map((n) => GetItem.weapon(n));
    }

    /** Everything `a` could swap to: their own chrome plus The Stash. */
    public static weaponChoices(a: Actor): Weapon[] {
        return [...Gear.chromeWeapons(a), ...Stash.of(a).weapons].filter((w) => w.name !== "Fists");
    }

    /** Every piece of armour `a` could strap on. */
    public static armorChoices(a: Actor): Armor[] {
        return Stash.of(a).armor.slice();
    }

    /** Pull `w` out of The Stash — chrome needs no pulling, the body brings it. */
    private static takeWeapon(a: Actor, w: Weapon): boolean {
        if (Gear.isCyberweapon(a, w)) { return true; }
        const bag = Stash.of(a).weapons;
        const at = bag.indexOf(w);
        if (at >= 0) { bag.splice(at, 1); return true; }
        return false;
    }

    /** The old weapon goes back in The Stash; chrome retracts into the body. */
    private static shelveWeapon(a: Actor, old: Weapon): void {
        if (Gear.isCyberweapon(a, old)) { return; }
        Stash.of(a).weapons.push(old);
    }

    /** Swap to `w`; the old weapon goes back in The Stash. */
    public static equipWeapon(a: Actor, w: Weapon): string | null {
        if (!Gear.takeWeapon(a, w)) { return null; }
        const old = a.weapon;
        if (old && old.name !== "Fists") { Gear.shelveWeapon(a, old); }
        a.weapon = w;
        return `${a.name.split(" ")[0]} swaps to the ${w.name}.`;
    }

    /** Strap on `piece`; the old piece in that slot goes back in The Stash. */
    public static equipArmor(a: Actor, piece: Armor): string | null {
        const bag = Stash.of(a).armor;
        const at = bag.indexOf(piece);
        if (at < 0) { return null; }
        bag.splice(at, 1);
        const slot = piece.bodyPart === "headgear" ? "headgear" : "upper";
        const old = a.equipment[slot] as Armor | null;
        if (old) { Stash.of(a).armor.push(old); }
        a.equipment[slot] = piece;
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
        const stash = Stash.of(a);
        stash.weapons = stash.weapons.filter((w) => w.name !== "Fists");
        a.weapon = GetItem.weapon("Fists");
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
