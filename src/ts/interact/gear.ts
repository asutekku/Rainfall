import type {Actor} from "../actors/Actor";
import type {Armor} from "../items/Armor";
import type {Weapon} from "../items/Weapon";
import {Stash} from "./crew";
import {GetItem} from "./getItem";

/** How a candidate weapon reads against the one in hand. */
export type Verdict = "up" | "down" | "trade" | "same";

/** One stat of the head-to-head: printable values plus the signed movement. */
export interface StatDelta {
    stat: string;
    cur: string;
    next: string;
    /** >0 the candidate is better here, <0 worse, 0 even. */
    delta: number;
    /** A mode change (full auto), not a rung on a ladder — out of the verdict. */
    mode?: boolean;
}

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

    /**
     * Everything `a` could swap to: their own chrome plus The Stash, sorted by
     * the same valuation auto-equip decides with (Gear.weaponValue) — so
     * the top of the list is what the fixer would actually pick, not merely
     * the rarest paint job. Rarity and price only break ties.
     */
    public static weaponChoices(a: Actor): Weapon[] {
        return [...Gear.chromeWeapons(a), ...Stash.of(a).weapons]
            .filter((w) => w.name !== "Fists")
            .sort((x, y) => Gear.weaponValue(y, a) - Gear.weaponValue(x, a)
                || (y.rarity || 0) - (x.rarity || 0)
                || (y.cost || 0) - (x.cost || 0));
    }

    /** Every piece of armour `a` could strap on. */
    public static armorChoices(a: Actor): Armor[] {
        return Stash.of(a).armor.slice();
    }

    /**
     * The swap list with duplicates folded: two Streetmasters are one row
     * marked ×2, not two identical rows — same-name catalog weapons have the
     * same stats, so the second row said nothing and cost a render. Order is
     * weaponChoices' order; equipping takes the stack's live instance.
     */
    public static stackedWeapons(a: Actor): Array<{item: Weapon; n: number}> {
        const out: Array<{item: Weapon; n: number}> = [];
        for (const w of Gear.weaponChoices(a)) {
            const hit = out.find((s) => s.item.name === w.name
                && Gear.isCyberweapon(a, s.item) === Gear.isCyberweapon(a, w));
            if (hit) { hit.n += 1; } else { out.push({item: w, n: 1}); }
        }
        return out;
    }

    /** Armour choices with duplicates folded the same way. */
    public static stackedArmor(a: Actor): Array<{item: Armor; n: number}> {
        const out: Array<{item: Armor; n: number}> = [];
        for (const r of Gear.armorChoices(a)) {
            const hit = out.find((s) => s.item.name === r.name && s.item.bodyPart === r.bodyPart);
            if (hit) { hit.n += 1; } else { out.push({item: r, n: 1}); }
        }
        return out;
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

    /**
     * THE weapon swap: shelve what's held (into The Stash — chrome retracts,
     * Fists evaporate), take up `w`. Returns what was replaced. Every path
     * that changes hands — the Gear tab, staging, the debrief claim, the
     * fixer's auto-kit — comes through here, so the shelve rule exists once.
     */
    public static swapWeapon(a: Actor, w: Weapon): Weapon | null {
        const old = a.weapon;
        if (old && old.name !== "Fists") { Gear.shelveWeapon(a, old); }
        a.weapon = w;
        return old && old.name !== "Fists" ? old : null;
    }

    /** THE armour swap: the slot's old piece goes back in The Stash. */
    public static swapArmor(a: Actor, piece: Armor): Armor | null {
        const old = Gear.displaced(a, piece);
        if (old) { Stash.of(a).armor.push(old); }
        a.equipment[piece.bodyPart === "headgear" ? "headgear" : "upper"] = piece;
        return old;
    }

    /** Swap to `w` out of The Stash (or the body, for chrome); feed line back. */
    public static equipWeapon(a: Actor, w: Weapon): string | null {
        if (!Gear.takeWeapon(a, w)) { return null; }
        Gear.swapWeapon(a, w);
        return `${a.name.split(" ")[0]} swaps to the ${w.name}.`;
    }

    /** Strap on `piece` out of The Stash; feed line back. */
    public static equipArmor(a: Actor, piece: Armor): string | null {
        const bag = Stash.of(a).armor;
        const at = bag.indexOf(piece);
        if (at < 0) { return null; }
        bag.splice(at, 1);
        Gear.swapArmor(a, piece);
        return `${a.name.split(" ")[0]} straps on the ${piece.name} (SP ${piece.stoppingPower}).`;
    }

    /**
     * Go in bare-knuckle. Fists aren't an item you can run out of, so this
     * never depends on a copy surviving in a bag: the current weapon is
     * shelved, any stray Fists copies are absorbed, and a fresh pair comes up.
     */
    public static equipFists(a: Actor): string | null {
        if (a.weapon && a.weapon.name === "Fists") { return null; }
        Gear.swapWeapon(a, GetItem.weapon("Fists"));
        const stash = Stash.of(a);
        stash.weapons = stash.weapons.filter((w) => w.name !== "Fists");
        return `${a.name.split(" ")[0]} goes in bare-knuckle.`;
    }

    /**
     * Shopping value of a weapon: mean damage — in `a`'s hands when a body is
     * given, so auto-equip hands the Handgun expert the pistol their training
     * actually pays out on — with a bonus for armour-piercing.
     */
    public static weaponValue(w: Weapon, a?: Actor): number {
        return (a ? a.damageFactor(w) : 1) * w.averageDamage() + (w.ap ? 4 : 0);
    }

    /**
     * The stats a swap decision actually turns on, candidate against what's in
     * hand. With an actor, the numbers are personal: DMG folds in their skill
     * (+5%/level with the governing skill), and a SKL row prints the training
     * behind each weapon. AUTO is a mode, not a rung on a ladder — full auto
     * trades aimed shots for volume — so it's flagged `mode` and stays out of
     * the verdict.
     */
    public static compare(cur: Weapon, w: Weapon, a?: Actor): StatDelta[] {
        const n1 = (x: number) => String(Math.round(x * 10) / 10);
        const acc = (x: number) => x > 0 ? `+${x}` : String(x);
        const dmg = (x: Weapon) => (a ? a.damageFactor(x) : 1) * x.averageDamage();
        const rows: StatDelta[] = [
            {stat: "DMG", cur: n1(dmg(cur)), next: n1(dmg(w)), delta: dmg(w) - dmg(cur)},
        ];
        if (a) {
            rows.push({stat: "SKL", cur: String(a.skillFor(cur)), next: String(a.skillFor(w)),
                delta: a.skillFor(w) - a.skillFor(cur)});
        }
        rows.push(
            {stat: "ACC", cur: acc(cur.accuracyBonus), next: acc(w.accuracyBonus),
                delta: w.accuracyBonus - cur.accuracyBonus},
            {stat: "ROF", cur: String(cur.rateOfFire), next: String(w.rateOfFire),
                delta: w.rateOfFire - cur.rateOfFire},
            {stat: "RNG", cur: `${cur.range}m`, next: `${w.range}m`, delta: w.range - cur.range},
            {stat: "AP", cur: cur.ap ? "yes" : "—", next: w.ap ? "yes" : "—",
                delta: (w.ap ? 1 : 0) - (cur.ap ? 1 : 0)},
            {stat: "AUTO", cur: cur.autofire ? "yes" : "—", next: w.autofire ? "yes" : "—",
                delta: (w.autofire ? 1 : 0) - (cur.autofire ? 1 : 0), mode: true},
        );
        return rows;
    }

    /**
     * Whether the candidate beats what's in hand — honestly. More damage is
     * not "better", full stop: a rear-line merc wants reach, a brawler wants
     * hits per turn. So this is a Pareto call: ▲ only when the candidate gives
     * nothing up, ▼ only when it gains nothing, and everything that trades one
     * stat for another is ◆ — the player's doctrine breaks the tie, not ours.
     */
    public static verdict(cur: Weapon, w: Weapon, a?: Actor): Verdict {
        const ds = Gear.compare(cur, w, a).filter((d) => !d.mode).map((d) => d.delta);
        const up = ds.some((d) => d > 0.05);
        const down = ds.some((d) => d < -0.05);
        return up && down ? "trade" : up ? "up" : down ? "down" : "same";
    }

    public static VERDICT_GLYPH: Record<Verdict, string> = {up: "▲", down: "▼", trade: "◆", same: "="};

    /** The verdict as a sentence — names which stats move which way. */
    public static verdictLine(cur: Weapon, w: Weapon, a?: Actor): string {
        const ds = Gear.compare(cur, w, a).filter((d) => !d.mode);
        const ups = ds.filter((d) => d.delta > 0.05).map((d) => d.stat).join(", ");
        const downs = ds.filter((d) => d.delta < -0.05).map((d) => d.stat).join(", ");
        switch (Gear.verdict(cur, w, a)) {
            case "up": return `upgrade — better ${ups}`;
            case "down": return `downgrade — worse ${downs}`;
            case "trade": return `trade-off — gains ${ups} · gives up ${downs}`;
            default: return "even swap";
        }
    }

    /** The piece this one would displace: whatever's worn in its slot. */
    public static displaced(a: Actor, piece: Armor): Armor | null {
        const slot = piece.bodyPart === "headgear" ? "headgear" : "upper";
        return (a.equipment[slot] as Armor | undefined) || null;
    }

    /** Stopping power gained (or lost) by strapping this on, slot vs slot. */
    public static armorDelta(a: Actor, piece: Armor): number {
        const old = Gear.displaced(a, piece);
        return piece.stoppingPower - (old ? old.stoppingPower : 0);
    }

    /** THE damage string — "3d6+2 AP" — printed the same on every screen. */
    public static dmg(w: Weapon): string {
        return `${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}${w.ap ? " AP" : ""}`;
    }

    /** The one-line spec sheet a weapon prints wherever it's listed. */
    public static weaponLine(w: Weapon): string {
        return `${Gear.dmg(w)} · ROF ${w.rateOfFire} · ${w.range}m`;
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

}
