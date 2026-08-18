import type {StatusKey} from "../../interact/statuses";
import {Utils} from "../../utils/utils";

/**
 * Traits — who somebody is, as opposed to what they do or what they're made of.
 *
 * Class and faction between them decide a hire's job and their profile, which
 * makes two Tyger Claws Marksmen mechanically identical. Traits are what stop
 * that: 1-3 rolled per candidate out of a pool deep enough that the board is
 * worth reading rather than sorting by price.
 *
 * Two rules the table has to keep, or the system stops working:
 *
 *   READABLE   — every trait says what it does in one line on the hire board.
 *                A trait the player has to memorise is a trait they ignore.
 *
 *   NEVER PURELY BAD — a downside always buys a discount (`price` below 1).
 *                A card with no upside is a card nobody picks, so a pure
 *                penalty would just be a worse candidate rather than a
 *                different one. Glass Jaw costs 30% less; that is the whole
 *                reason to consider it.
 *
 * Every hook below lands on a seam that already existed. `out` and `incoming`
 * join the multiplier stack the statuses and stances already run through,
 * `edge` joins `statusEdge`, `rider` uses the same path as the weapon and class
 * riders, `caution` scales the tactical AI's own defence weight. Adding the
 * fortieth trait is a row in this table, not an engineering task — which is the
 * point, because the pool needs to get much deeper than thirteen.
 */

export interface TraitSpec {
    name: string;
    /** One line, in the language of the street. This is what the board prints. */
    blurb: string;
    /** Draw weight. Rare and defining traits sit low. */
    weight: number;
    /** Fee multiplier. Below 1 for anyone carrying a real flaw. */
    price: number;

    // --- combat ---
    /** Flat accuracy modifier. */
    edge?: number;
    /** Damage this body deals, multiplied. */
    out?: number;
    /** Damage this body takes, multiplied. */
    incoming?: number;
    /** Damage taken on the first hit of a fight, multiplied. */
    firstHitIn?: number;
    /** Damage dealt below a quarter health, multiplied. */
    lowHpOut?: number;
    /** An extra status left behind by a landed hit. */
    rider?: { key: StatusKey; stacks: number; chance: number };
    /** A status they open every fight carrying. */
    open?: { key: StatusKey; stacks: number };

    // --- behaviour (the tactical AI's own weights) ---
    /** Scales how much the AI fears incoming fire: >1 plays safe, <1 plays hard. */
    caution?: number;
    /** Won't switch targets while the current one is still standing. */
    sticky?: boolean;

    // --- economy ---
    /** Skims this fraction off every payday. */
    payCut?: number;
    /** Extra chance to strip something off a body. */
    salvage?: number;
    /** Fraction off what Trauma Team wants to scrape them up. */
    buyoutCut?: number;

    // --- relational ---
    /** A faction they have history with: they hit them harder. */
    hates?: string;
}

export const TRAITS: { [id: string]: TraitSpec } = {
    // ---------------------------------------------------------- combat --
    steadyHands: {
        name: "Steady Hands", weight: 10, price: 1.2, edge: 3,
        blurb: "shoots straight whatever is happening — +3 to hit",
    },
    glassJaw: {
        name: "Glass Jaw", weight: 9, price: 0.7, firstHitIn: 1.35,
        blurb: "the first hit of a fight always finds something soft — and they come cheap",
    },
    butcher: {
        name: "Butcher", weight: 8, price: 1.15,
        rider: {key: "bleed", stacks: 2, chance: 0.3},
        blurb: "leaves people bleeding — wounds that armour cannot stop",
    },
    hardToKill: {
        name: "Hard to Kill", weight: 6, price: 1.3, incoming: 0.9,
        blurb: "takes a beating and keeps working — 10% less damage taken",
    },
    // ------------------------------------------------------ behaviour --
    coward: {
        name: "Coward", weight: 10, price: 0.75, caution: 1.8,
        blurb: "breaks for cover early and often — survives, contributes less",
    },
    tunnelVision: {
        name: "Tunnel Vision", weight: 9, price: 0.9, sticky: true, out: 1.08,
        blurb: "finishes what they started — will not switch targets, hits harder for it",
    },
    reckless: {
        name: "Reckless", weight: 9, price: 1, caution: 0.5, out: 1.15, incoming: 1.15,
        blurb: "walks straight in — hits 15% harder, takes 15% more",
    },
    triggerDiscipline: {
        name: "Trigger Discipline", weight: 8, price: 1.05, edge: 2, out: 0.95,
        blurb: "waits for the shot — more accurate, less spray",
    },
    // -------------------------------------------------------- economy --
    owesMoney: {
        name: "Owes the Wrong People", weight: 11, price: 0.55, payCut: 0.1,
        blurb: "signs for half — and 10% of every payday goes somewhere else",
    },
    scrounger: {
        name: "Scrounger", weight: 9, price: 1.15, salvage: 0.12,
        blurb: "comes off every street with something in their pockets",
    },
    unionRates: {
        name: "Union Rates", weight: 6, price: 1.35, buyoutCut: 0.6,
        blurb: "expensive, but their people cover the Trauma Team bill",
    },
    // ----------------------------------------------------- conditional --
    lastStand: {
        name: "Last Stand", weight: 5, price: 1.25, lowHpOut: 1.5,
        blurb: "worst when comfortable, terrifying when cornered — +50% under a quarter health",
    },
    badBlood: {
        name: "Bad Blood", weight: 8, price: 0.95, hates: "*",
        blurb: "has history with one crew, and takes it out of them",
    },
    juiced: {
        name: "Juiced", weight: 7, price: 1.1,
        open: {key: "adrenaline", stacks: 2},
        blurb: "walks in already up — opens every fight on adrenaline",
    },
};

export const TRAIT_IDS: string[] = Object.keys(TRAITS);

/** Factions a Bad Blood grudge can be against. */
const GRUDGE_FACTIONS = ["Maelstrom", "Tyger Claws", "Arasaka", "Militech", "Scav", "6th Street"];

/** How many traits a candidate rolls. Most have one; a few are characters. */
function traitCount(): number {
    const r = Math.random();
    return r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
}

/** Weighted draw without replacement. */
export function rollTraits(): string[] {
    const pool = TRAIT_IDS.slice();
    const picked: string[] = [];
    const want = traitCount();
    while (picked.length < want && pool.length) {
        const total = pool.reduce((n, id) => n + TRAITS[id]!.weight, 0);
        let roll = Math.random() * total;
        let chosen = pool[0]!;
        for (const id of pool) {
            roll -= TRAITS[id]!.weight;
            if (roll <= 0) { chosen = id; break; }
        }
        picked.push(chosen);
        pool.splice(pool.indexOf(chosen), 1);
    }
    return picked;
}

/** The faction a Bad Blood hire has history with (rolled once, at hire). */
export function rollGrudge(): string {
    return Utils.pickRandom(GRUDGE_FACTIONS);
}

/** What a set of traits does to the asking price. */
export function traitPrice(ids: string[]): number {
    return ids.reduce((n, id) => n * (TRAITS[id] ? TRAITS[id]!.price : 1), 1);
}

/** Sum a numeric hook across a body's traits (0 when nobody has it). */
export function traitSum(ids: string[], key: "edge" | "payCut" | "salvage" | "buyoutCut"): number {
    return ids.reduce((n, id) => n + ((TRAITS[id] && TRAITS[id]![key]) || 0), 0);
}

/** Multiply a multiplicative hook across a body's traits (1 when nobody has it). */
export function traitMult(ids: string[],
                          key: "out" | "incoming" | "firstHitIn" | "lowHpOut" | "caution"): number {
    return ids.reduce((n, id) => n * ((TRAITS[id] && TRAITS[id]![key]) || 1), 1);
}

/** True when any of these traits sets a boolean hook. */
export function traitHas(ids: string[], key: "sticky"): boolean {
    return ids.some((id) => TRAITS[id] && TRAITS[id]![key] === true);
}

/** Every on-hit rider these traits contribute. */
export function traitRiders(ids: string[]): Array<NonNullable<TraitSpec["rider"]>> {
    return ids.map((id) => TRAITS[id] && TRAITS[id]!.rider)
        .filter((r): r is NonNullable<TraitSpec["rider"]> => !!r);
}

/** Every fight-start status these traits contribute. */
export function traitOpeners(ids: string[]): Array<NonNullable<TraitSpec["open"]>> {
    return ids.map((id) => TRAITS[id] && TRAITS[id]!.open)
        .filter((o): o is NonNullable<TraitSpec["open"]> => !!o);
}
