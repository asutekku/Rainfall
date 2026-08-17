/**
 * Battle statuses: one grammar, one registry, one place that knows the rules.
 *
 * The old set was four effects with four different grammars — `bleeding` was a
 * magnitude that never decayed, `stunned` a countdown, `pinned` a boolean,
 * `crippled` a permanent boolean — and two of the four deleted the victim's
 * turn outright, which is the worst thing you can do to a fight the player
 * watches rather than plays.
 *
 * The shape is lifted from Slay the Spire, which gets three things right:
 *
 * 1. **Every effect declares one stack type.** DURATION lasts N turns and
 *    sheds one at the end of each of the owner's turns; INTENSITY applies with
 *    N power and stays until the fight ends. Five stacks of a duration effect
 *    is five turns of the same strength, never a stronger effect.
 * 2. **One deliberate exception.** Poison — here Bleed — is both: it ticks for
 *    N and *then* drops to N-1. Front-loaded and fading, so stacking it early
 *    is a real plan rather than a slow trickle.
 * 3. **Effects are multipliers, not flat numbers**, so they survive any
 *    rescaling of the damage curve underneath them.
 *
 * Two rules of our own, both learned the hard way:
 *
 * - **Statuses change numbers; they do not delete turns.** Only STUN does, it
 *   is capped at one turn, and it is rare. Suppression and blinding — which
 *   used to cost a whole turn between them — are penalties now.
 * - **Damage over time bypasses armour.** It is the answer to plate, so plate
 *   does not get to answer it.
 */

import type {Actor} from "../actors/Actor";

export type StackKind = "duration" | "intensity" | "both";

export type StatusKey =
    // damage over time — all three bypass armour, all three fade differently
    | "bleed"        // both: ticks for N, then N-1. A burst that fades.
    | "burn"         // duration: ticks and melts plate while it burns
    | "toxin"        // intensity: never decays, and the wound will not close
    // amplify
    | "marked"       // duration: everyone hits this one harder
    | "staggered"    // per-round: rewards focus fire, resets every round
    // suppress
    | "suppressed"   // duration: deals less, keeps its turn
    | "blinded"      // duration: accuracy, not a lost turn
    | "stunned"      // duration: the one effect that costs a turn. Capped at 1.
    // armour
    | "shred"        // intensity: plate is gone and staying gone
    | "hardened"     // intensity: extra plate, degrading under fire
    // counterplay and buffs
    | "ward"         // intensity: eats the next N debuffs
    | "adrenaline"   // duration: hits harder
    | "overclock"    // duration: acts twice
    | "thorns"       // intensity: whoever hits you takes some back
    // legacy battle state kept in the same bag so one thing wipes it all
    | "crippled"     // intensity (1): a limb is gone; half speed
    | "fried";       // duration: chrome offline — no subdermal SP, no chrome bonuses

export interface StatusDef {
    /** Word the UI uses. */
    label: string;
    /** Three-letter chip for a 34px HUD row, or null to keep it off the row. */
    chip: string | null;
    /** Chip colour class. */
    tone: "bad" | "warn" | "good" | "dim";
    stack: StackKind;
    /** Ceiling on stacks, where the effect would be miserable unbounded. */
    max?: number;
    /** Plain-language rule, shown on the unit card. `n` is the live stack count. */
    explain: (n: number) => string;
    /** A debuff can be eaten by Ward; a buff cannot. */
    debuff: boolean;
}

/** Everything a status can be, and exactly what it does. */
export const STATUS: { [K in StatusKey]: StatusDef } = {
    bleed: {
        label: "Bleeding", chip: "BLD", tone: "bad", stack: "both", debuff: true,
        explain: (n) => `losing ${n} health at the start of each turn, straight through armour — fades as it goes`,
    },
    burn: {
        label: "Burning", chip: "BRN", tone: "bad", stack: "duration", debuff: true,
        explain: (n) => `taking ${BURN_TICK} a turn and losing a point of armour with it, for ${n} more turn${n === 1 ? "" : "s"}`,
    },
    toxin: {
        label: "Poisoned", chip: "TOX", tone: "bad", stack: "intensity", debuff: true,
        explain: (n) => `losing ${n} a turn through armour, and it will not wear off or heal`,
    },
    marked: {
        label: "Marked", chip: "MRK", tone: "bad", stack: "duration", debuff: true,
        explain: (n) => `everyone hits it ${Math.round(MARKED_AMP * 100)}% harder for ${n} more turn${n === 1 ? "" : "s"}`,
    },
    staggered: {
        label: "Staggered", chip: null, tone: "warn", stack: "intensity", debuff: true,
        explain: (n) => `reeling from ${n} hit${n === 1 ? "" : "s"} this round — takes ${Math.round(n * STAGGER_AMP * 100)}% more until the round ends`,
    },
    suppressed: {
        label: "Suppressed", chip: "SUP", tone: "warn", stack: "duration", debuff: true,
        explain: (n) => `heads down: deals ${Math.round(SUPPRESS_CUT * 100)}% less for ${n} more turn${n === 1 ? "" : "s"} (bleeding and fire don't care)`,
    },
    blinded: {
        label: "Blinded", chip: "BLD?", tone: "warn", stack: "duration", debuff: true,
        explain: (n) => `can't see the sights — badly off aim for ${n} more turn${n === 1 ? "" : "s"}`,
    },
    stunned: {
        label: "Stunned", chip: "STN", tone: "warn", stack: "duration", max: 1, debuff: true,
        explain: () => `loses the next turn — the only status that costs one`,
    },
    shred: {
        label: "Shredded", chip: "SHR", tone: "bad", stack: "intensity", debuff: true,
        explain: (n) => `${n} points of armour torn off for the rest of the fight`,
    },
    hardened: {
        label: "Hardened", chip: null, tone: "good", stack: "intensity", debuff: false,
        explain: (n) => `${n} points of extra plate, shedding one with every hit it stops`,
    },
    ward: {
        label: "Warded", chip: "WRD", tone: "good", stack: "intensity", debuff: false,
        explain: (n) => `the next ${n} thing${n === 1 ? "" : "s"} thrown at it simply won't stick`,
    },
    adrenaline: {
        label: "Wired", chip: null, tone: "good", stack: "duration", debuff: false,
        explain: (n) => `hitting ${Math.round(ADRENALINE_AMP * 100)}% harder for ${n} more turn${n === 1 ? "" : "s"}`,
    },
    overclock: {
        label: "Overclocked", chip: null, tone: "good", stack: "duration", debuff: false,
        explain: (n) => `moving twice for every one turn the street gets, ${n} more time${n === 1 ? "" : "s"}`,
    },
    thorns: {
        label: "Spiked", chip: null, tone: "good", stack: "intensity", debuff: false,
        explain: (n) => `anything that hits it takes ${n} straight back`,
    },
    crippled: {
        label: "Crippled", chip: null, tone: "warn", stack: "intensity", max: 1, debuff: true,
        explain: () => `a leg is torn up — half speed for the rest of the fight`,
    },
    fried: {
        label: "Fried", chip: "EMP", tone: "warn", stack: "duration", debuff: true,
        explain: (n) => `chrome is offline for ${n} more turn${n === 1 ? "" : "s"}: no subdermal armour, no implant edge`,
    },
};

// ------------------------------------------------------------- constants --

/** Marked: what everyone else's hits are multiplied by. */
export const MARKED_AMP = 0.4;
/** Staggered: extra damage per hit already taken this round. */
export const STAGGER_AMP = 0.1;
/** Suppressed: how much of its damage a unit with its head down loses. */
export const SUPPRESS_CUT = 0.3;
/** Blinded: accuracy points lost. */
export const BLIND_EDGE = -8;
/** Burn: HP per tick, and the plate it takes with it. */
export const BURN_TICK = 4;
/** Wired: what a stimmed unit's hits are multiplied by. */
export const ADRENALINE_AMP = 0.35;

const STACK_CEILING = 30;

// ------------------------------------------------------------- the bag --

export type StatusBag = { [K in StatusKey]?: number };

/** How many stacks of `key` are on `a`. */
export function stacksOf(a: Actor, key: StatusKey): number {
    return a.statuses[key] || 0;
}

export function hasStatus(a: Actor, key: StatusKey): boolean {
    return stacksOf(a, key) > 0;
}

/**
 * Put `n` stacks of `key` on `a`, honouring the grammar.
 *
 * Ward eats one debuff *application* — the whole application, not one stack —
 * which is what makes stacking a debuff a decision rather than an inevitability.
 * Returns the stacks that actually landed (0 when warded or already capped).
 */
export function applyStatus(a: Actor, key: StatusKey, n: number = 1): number {
    if (n <= 0) { return 0; }
    const def = STATUS[key];
    if (def.debuff && key !== "ward" && stacksOf(a, "ward") > 0) {
        a.statuses.ward = stacksOf(a, "ward") - 1;
        if (a.statuses.ward! <= 0) { delete a.statuses.ward; }
        return 0;
    }
    const cap = def.max ?? STACK_CEILING;
    const before = stacksOf(a, key);
    const after = Math.min(cap, before + n);
    if (after <= 0) { delete a.statuses[key]; } else { a.statuses[key] = after; }
    return after - before;
}

/** Take stacks off (or all of them). */
export function clearStatus(a: Actor, key: StatusKey, n?: number): void {
    if (n === undefined) { delete a.statuses[key]; return; }
    const left = stacksOf(a, key) - n;
    if (left > 0) { a.statuses[key] = left; } else { delete a.statuses[key]; }
}

/** Everything currently on a unit, worst first, for the card and the chips. */
export function activeStatuses(a: Actor): Array<[StatusKey, number]> {
    const order: StatusKey[] = [
        "stunned", "bleed", "burn", "toxin", "suppressed", "blinded", "fried",
        "marked", "staggered", "shred", "crippled",
        "ward", "hardened", "thorns", "adrenaline", "overclock",
    ];
    return order.filter((k) => stacksOf(a, k) > 0).map((k) => [k, stacksOf(a, k)] as [StatusKey, number]);
}

// ------------------------------------------------------ damage pipeline --

/**
 * Order of operations, fixed here so the numbers stay predictable:
 *
 *   1. raw dice
 *   2. + flat adds        (alpha strike, backup fire)
 *   3. x shot quality     (graze / hit / crit)
 *   4. x outgoing         (suppressed, wired)      <- this function
 *   5. x incoming         (marked, staggered)      <- and this one
 *   6. soak               (SP - shred + hardened, floored)
 *
 * Flat before multiplicative, the way Slay the Spire specifies it: a +2 bonus
 * against a marked target is (raw + 2) x 1.4, not (raw x 1.4) + 2. Damage over
 * time skips 3-6 entirely — it is the answer to armour, so armour and
 * suppression do not get to answer it.
 */
export function outgoingMult(a: Actor): number {
    let m = 1;
    if (hasStatus(a, "suppressed")) { m -= SUPPRESS_CUT; }
    if (hasStatus(a, "adrenaline")) { m += ADRENALINE_AMP; }
    return Math.max(0.1, m);
}

export function incomingMult(target: Actor): number {
    let m = 1;
    if (hasStatus(target, "marked")) { m += MARKED_AMP; }
    m += stacksOf(target, "staggered") * STAGGER_AMP;
    return m;
}

/** What the statuses do to a unit's stopping power. */
export function spDelta(a: Actor): number {
    return stacksOf(a, "hardened") - stacksOf(a, "shred");
}

/** Accuracy the statuses cost the shooter. */
export function statusEdge(a: Actor): number {
    return hasStatus(a, "blinded") ? BLIND_EDGE : 0;
}

// ------------------------------------------------------------ the tick --

export interface StatusTick {
    /** HP the damage-over-time family took, straight through armour. */
    damage: number;
    /** Which effects did the damage, for the feed. */
    sources: StatusKey[];
    /** Plate the fire took with it. */
    shredded: number;
}

/**
 * Run at the start of a unit's turn, before it acts: damage over time lands,
 * then every DURATION effect sheds a stack.
 *
 * Bleed is the deliberate exception that ticks *and* fades — it deals its full
 * count and then drops one, so a stack of five is 5+4+3+2+1 over five turns
 * rather than a flat trickle. Toxin is the opposite: it never fades, which is
 * what makes it the attrition answer rather than the burst one.
 */
export function tickStatuses(a: Actor): StatusTick {
    const out: StatusTick = {damage: 0, sources: [], shredded: 0};

    const bleed = stacksOf(a, "bleed");
    if (bleed > 0) { out.damage += bleed; out.sources.push("bleed"); }

    const toxin = stacksOf(a, "toxin");
    if (toxin > 0) { out.damage += toxin; out.sources.push("toxin"); }

    if (hasStatus(a, "burn")) {
        out.damage += BURN_TICK;
        out.sources.push("burn");
        out.shredded = 1;
        applyStatus(a, "shred", 1);
    }

    // bleed is both kinds at once: it ticked at full strength, now it fades
    if (bleed > 0) { clearStatus(a, "bleed", 1); }

    for (const key of Object.keys(a.statuses) as StatusKey[]) {
        if (STATUS[key] && STATUS[key].stack === "duration") { clearStatus(a, key, 1); }
    }
    return out;
}

/** Focus fire only counts within a round — wiped when a fresh one opens. */
export function clearRoundStatuses(a: Actor): void {
    clearStatus(a, "staggered");
}
