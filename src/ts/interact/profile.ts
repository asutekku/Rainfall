import type {Actor} from "../actors/Actor";

/**
 * Plate, Chrome, Ghost — the three ways a body is hard to kill, and the one
 * thing on a unit that tells the player what to bring.
 *
 * The engine has always modelled three genuinely different defences: the armour
 * soak curve, subdermal plating that an EMP switches off, and evasion that
 * makes an aimed shot a waste of accuracy. Nothing on screen ever named them,
 * so a wave of Wraiths and a wave of Militech Troopers read as the same problem
 * with different colours — and the ordnance pick, which is exactly the decision
 * this information is for, was a coin flip.
 *
 * A profile is **what beats you**, not what you are wearing. That framing is
 * what makes it useful at staging: the player doesn't need to know a Bruiser's
 * armour is zero, they need to know volume of fire is the answer. Everything
 * below is derived from live state, so it stays true as a fight wears a unit
 * down: shred somebody's plate off and they stop reading Plate, fry a chromed
 * heavy and their subdermal stops counting.
 */

export type Profile = "plate" | "chrome" | "ghost";

export interface ProfileSpec {
    /** Word for the tooltip and the unit card. */
    label: string;
    /** The icon. Geometric, legible at 10px, distinct from the rank star. */
    glyph: string;
    /** One line: what this unit is. */
    blurb: string;
    /** One line: what the player should bring. This is the useful half. */
    counter: string;
}

export const PROFILE: { [k in Profile]: ProfileSpec } = {
    plate: {
        label: "Plate", glyph: "▣",
        blurb: "heavy worn armour — soaks whatever you shoot at it",
        counter: "armour-piercing, fire and poison, frags, aimed shots",
    },
    chrome: {
        label: "Chrome", glyph: "◈",
        blurb: "runs on chrome — subdermal plating, wired reflexes, boosted aim",
        counter: "EMP and quickhacks: fry the wiring and it all switches off",
    },
    ghost: {
        label: "Ghost", glyph: "◌",
        blurb: "thin and hard to pin down — dies fast to anything that connects",
        counter: "volume and area: autofire, suppression, blast radius",
    },
};

export const PROFILE_ORDER: Profile[] = ["plate", "chrome", "ghost"];

/**
 * The armour ladder's first real tier (RED Light Armorjack). Below this, worn
 * plate does not change how you fight the wearer; at or above it, shooting them
 * with ordinary kinetic is a losing trade.
 */
export const PLATE_SP = 11;

/**
 * Factions whose protection is wiring rather than plate.
 *
 * Enemy archetypes model subdermal armour as plain body SP — there is no
 * separate cyber-SP on that side of the table — so the numbers alone would call
 * a full-conversion Dragoon "Plate" and send the player after it with armour
 * piercing instead of the EMP that actually shuts it down. This is the one
 * place that knows the difference, and it belongs here rather than smeared
 * across the archetype rows.
 */
const CHROME_FACTIONS = ["Chrome", "Cyberpsycho", "Maelstrom", "Tyger Claws"];

/** Worn body armour, ignoring anything cybernetic. */
export function wornSP(a: Actor): number {
    return a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
}

/**
 * The rule itself, over plain numbers.
 *
 * Split out from `profileOf` because the hire board reasons about candidates
 * who are not Actors yet — a `MercOffer` is a stat line and an armour rating,
 * and the board has to show the same badge the staging screen will, or the
 * player is shopping blind for the thing they are about to be judged on.
 *
 * Order matters: chrome wins over plate, because a chromed heavy in a hard
 * shell still folds to an EMP and that is the more useful thing to say.
 */
export function profileFrom(worn: number, cyber: number, faction?: string): Profile {
    // A subdermal only defines you while it is doing more than your jacket.
    const chromed = (faction && CHROME_FACTIONS.indexOf(faction) >= 0)
        || (cyber > 0 && cyber >= worn);
    if (chromed) { return "chrome"; }
    if (Math.max(worn, cyber) >= PLATE_SP) { return "plate"; }
    return "ghost";
}

/**
 * Which of the three this unit is, right now.
 *
 * Live state, not a stored tag: a `fried` unit reports zero cyber-SP, so a
 * Netrunner who has already done their job visibly moves the target off Chrome,
 * and a shredded heavy stops reading Plate. Both fall out of the derivation for
 * free, and both are things the player should be able to watch happen.
 */
export function profileOf(a: Actor): Profile {
    return profileFrom(wornSP(a), a.cyberSP(), a.faction);
}

/** The spec, for anything that wants to print it. */
export function profileSpec(a: Actor): ProfileSpec {
    return PROFILE[profileOf(a)];
}

/** One line for a tooltip: what they are, then what to bring. */
export function profileTitle(a: Actor): string {
    const p = profileSpec(a);
    return `${p.label} — ${p.blurb}. Bring: ${p.counter}.`;
}

/** How a wave breaks down, for the staging summary line. */
export function profileTally(units: Actor[]): Array<[Profile, number]> {
    return PROFILE_ORDER
        .map((p) => [p, units.filter((u) => profileOf(u) === p).length] as [Profile, number])
        .filter(([, n]) => n > 0);
}
