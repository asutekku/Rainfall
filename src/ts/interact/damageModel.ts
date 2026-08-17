/**
 * How a hit turns into a number.
 *
 * This replaces two Cyberpunk RED mechanics that made a watched fight
 * unreadable, both of them cliffs rather than curves:
 *
 * 1. **Hit or nothing.** An exploding/fumbling d10 (SD 5.09, range -9..+20)
 *    against fixed DVs meant two points of attack modifier moved the hit rate
 *    by twenty points, and a whole run of levelling moves it by about eight.
 *    The die was louder than the build, and roughly a third of all turns
 *    produced no number at all. Measured over 600 sector-1 firefights, half of
 *    every shot fired at 13-25m did nothing.
 *
 * 2. **Flat armour subtraction.** `max(0, roll - SP)` against small dice pools
 *    is an on/off switch: a 1d6 pistol (mean 3.5) against the SP 12 every
 *    sector-1 goon wears dealt zero, always. At character levels 3 and 5 the
 *    *average* weapon dealt zero through the *average* armour.
 *
 * In their place: every attack lands and produces a number, with the variance
 * living in how well it connected (graze / hit / crit); and armour soaks a
 * percentage on a diminishing curve with a floor, so every point of SP is
 * worth buying and no amount of it is ever a wall.
 *
 * Nothing here imports React or Actor — it is arithmetic, so the sims and the
 * tests can load it on its own.
 */

// ---------------------------------------------------------------- armour --

/**
 * How hard armour has to work to matter. Lower = armour is stronger.
 *
 * Fitted, not chosen: with the miss gate gone and armour no longer able to
 * zero a hit, both sides deal far more per turn than they used to, so this is
 * tuned by the headless fight sim to land the mean firefight at roughly the
 * length it had before — minus the third of turns that used to be silent.
 */
export const SOAK_K = 6;

/** However heavy the plate, this share of a hit always gets through. */
export const DAMAGE_FLOOR = 0.15;

/** The fraction of a hit that armour of this SP absorbs (0-1, diminishing). */
export function soak(sp: number): number {
    const s = Math.max(0, sp);
    return s / (s + SOAK_K);
}

/**
 * Damage past armour. AP halves the effective SP *before* the curve, so it is
 * worth something at every armour value instead of only at a breakpoint.
 */
export function applySoak(raw: number, sp: number, ap: boolean = false): number {
    if (raw <= 0) { return 0; }
    const eff = ap ? sp / 2 : sp;
    const through = Math.round(raw * (1 - soak(eff)));
    return Math.max(Math.ceil(raw * DAMAGE_FLOOR), through);
}

// ------------------------------------------------------------- distance --

/** RED's distance bands, kept as the unit of range falloff. */
const BANDS: number[] = [6, 12, 25, 50, 100, 200, 400, 800];

/**
 * Where each weapon class wants to be, as inclusive band indices, plus the
 * furthest band it can reach at all. The old DV table encoded both of these
 * *and* a difficulty cliff; only the first two survive.
 */
const SWEET: { [cls: string]: [number, number, number] } = {
    //          from  to  maxBand
    pistol:  [0, 1, 4],
    smg:     [0, 2, 6],
    shotgun: [0, 1, 5],
    rifle:   [1, 4, 7],
    sniper:  [3, 6, 7],
    bow:     [0, 2, 4],
};

/** Accuracy points lost per band outside the sweet spot, and the worst it gets. */
const FALLOFF_PER_BAND = 6;
const FALLOFF_CAP = 20;

/**
 * What a point of Battlefield cover DV is worth as accuracy.
 *
 * Cover used to be worth far more than its number said: +4 DV against a d10
 * was routinely the difference between a 50% shot and a 10% one. Carried over
 * at face value into a model with no hit gate it would have been worth about a
 * tenth of a shot's damage, and the AI stopped bothering to duck. Weighting it
 * back up keeps the street tactical — cover is a ~25% damage reduction, which
 * is roughly what it always was in practice.
 */
export const COVER_WEIGHT = 2.5;

/** Accuracy lost to a target's cover, from Battlefield's DV-scale penalty. */
export function coverEdge(coverDV: number): number {
    return -coverDV * COVER_WEIGHT;
}

/**
 * What an aimed head shot costs in accuracy, and what it pays.
 *
 * RED priced this at -8 to hit for doubled damage, which was self-balancing
 * only because -8 against a d10 collapsed the hit rate outright. Here accuracy
 * is cheap, and since only a quarter of spawned enemies wear a helmet, "double
 * damage through zero armour" was strictly better than a body shot against
 * every one of them — no accuracy price could have fixed that, because the
 * expected multiplier bottoms out around 0.6 and the payoff was over 4x.
 *
 * So the bypass is partial. Aiming finds the gap in someone's kit, not a hole
 * where their kit isn't: it works against the better of their helmet and half
 * their torso plate. That makes it what it was always meant to be — the answer
 * to a heavily plated chest, decided on the arithmetic, rather than a button
 * that is always correct.
 */
export const AIMED_EDGE = -12;
export const AIMED_MULT = 1.25;

/** The armour an aimed shot actually has to get through. */
export function aimedSP(headSP: number, bodySP: number): number {
    return Math.max(headSP, bodySP / 2);
}

function bandIndex(distance: number): number {
    for (let i = 0; i < BANDS.length; i++) {
        if (distance <= BANDS[i]!) { return i; }
    }
    return BANDS.length;
}

/** True when the target is past what this weapon can reach at all. */
export function outOfRange(weaponClass: string, distance: number): boolean {
    const s = SWEET[weaponClass] || SWEET["pistol"]!;
    return bandIndex(distance) > s[2];
}

/**
 * The accuracy the range costs: zero inside the weapon's sweet spot, falling
 * off in both directions. A sniper in a doorway still fires — badly — instead
 * of standing there with a DV 30 he cannot roll.
 */
export function rangeEdge(weaponClass: string, distance: number): number {
    const s = SWEET[weaponClass] || SWEET["pistol"]!;
    const b = bandIndex(distance);
    const off = b < s[0] ? s[0] - b : b > s[1] ? b - s[1] : 0;
    if (off === 0) { return 0; }   // not `-0`, which trips strict comparisons downstream
    return -Math.min(FALLOFF_CAP, off * FALLOFF_PER_BAND);
}

// -------------------------------------------------------- shot quality --

export type HitQuality = "miss" | "graze" | "hit" | "crit";

/** What each outcome does to the damage roll. */
export const QUALITY_MULT: { [q in HitQuality]: number } = {
    miss: 0, graze: 0.5, hit: 1, crit: 2,
};

export interface QualityOdds {
    miss: number;
    graze: number;
    hit: number;
    crit: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The outcome mix for an accuracy `edge` (attack bonus + range + cover).
 *
 * Skill still matters — it buys crits and sells grazes — but it can no longer
 * buy the difference between "a number happens" and "nothing happens". A miss
 * survives only as a fumble, and only really shows up when the edge has gone
 * negative (long range through cover), where it should.
 *
 * The constants are centred on the edges play actually produces, which the
 * sim puts between -4 and +8 with a median near +1 — not on the +12 to +16 a
 * paper reading of attackBonus suggests, because the AI spends most of the
 * fight shooting at people who are behind something.
 *
 * The slopes are as steep as the bands allow, because this model compresses
 * skill on purpose and it is worth knowing by how much. Under the old DV table
 * the gap between a street goon (+8) and a trained merc (+15) was a 10% hit
 * rate against a 60% one — six times the output. Here the multiplier can only
 * run from about 0.75 to 1.35, so the same gap is worth under a factor of two.
 * That is the price of never wasting a turn, and it means the difficulty curve
 * is now carried by encounter design rather than by hostiles being bad shots.
 */
export function qualityOdds(edge: number): QualityOdds {
    const crit = clamp(0.10 + 0.021 * edge, 0.02, 0.35);
    const graze = clamp(0.32 - 0.038 * edge, 0.05, 0.62);
    const miss = clamp(0.02 - 0.005 * edge, 0.01, 0.20);
    return {miss, graze, crit, hit: Math.max(0, 1 - crit - graze - miss)};
}

/** Mean damage multiplier at this edge — what the AI and the unit card quote. */
export function expectedMult(edge: number): number {
    const o = qualityOdds(edge);
    return o.graze * QUALITY_MULT.graze + o.hit * QUALITY_MULT.hit + o.crit * QUALITY_MULT.crit;
}

/** Draw an outcome. `roll` is injectable so tests and the AI rollout can drive it. */
export function rollQuality(edge: number, roll: number = Math.random()): HitQuality {
    const o = qualityOdds(edge);
    if (roll < o.miss) { return "miss"; }
    if (roll < o.miss + o.graze) { return "graze"; }
    if (roll < o.miss + o.graze + o.crit) { return "crit"; }
    return "hit";
}
