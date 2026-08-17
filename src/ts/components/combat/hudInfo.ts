import type {Actor} from "../../actors/Actor";

/**
 * Row data for the phone battle HUD, kept free of runtime imports (type-only
 * Actor) so tests can load it without dragging the component graph — pulling
 * React + Actor through a component module trips the actors' circular-import
 * order and leaves `class Player extends Actor` with an uninitialised base.
 */

/**
 * Battle states worth a chip on a 34px row, worst first — only two fit.
 *
 * Deliberately short: a chip has to change what you expect to happen next.
 * MARKED and CRIPPLED do not (nothing you can do about either), so they live
 * in the unit card with the rest of the vocabulary instead of stealing width
 * from the states that are about to cost someone the fight.
 */
export function hudTags(a: Actor): Array<[string, string]> {
    const t: Array<[string, string]> = [];
    if (a.mortallyWounded) { t.push(["DYING", "s-dying"]); }
    else if (a.routed) { t.push(["FLED", "s-down"]); }
    else if (!a.canFight()) { t.push(["DOWN", "s-down"]); }
    if (a.bleeding > 0) { t.push(["BLD", "s-bad"]); }
    if (a.stunned > 0) { t.push(["STN", "s-warn"]); }
    if (a.pinned) { t.push(["PIN", "s-warn"]); }
    return t.slice(0, 2);
}

/** Worn or subdermal — whichever plate is actually stopping bullets. */
export function hudArmor(a: Actor): number {
    const worn = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
    return Math.max(worn, a.cyberSP());
}

/**
 * Every condition on a unit, spelled out. The row abbreviates because it has
 * 34px; this is the legend behind it, and the only place CRP/MRK are named.
 */
export function unitConditions(a: Actor, marked: boolean): Array<[string, string]> {
    const c: Array<[string, string]> = [];
    if (a.mortallyWounded) { c.push(["Dying", "bleeding out — one turn from dead unless stabilised"]); }
    else if (a.routed) { c.push(["Fled", "morale broke; ran off the street"]); }
    else if (!a.canFight()) { c.push(["Down", "out of the fight, not dead"]); }
    if (a.bleeding > 0) { c.push(["Bleeding", `losing health every turn (${a.bleeding})`]); }
    if (a.stunned > 0) { c.push(["Stunned", "loses the next turn"]); }
    if (a.pinned) { c.push(["Pinned", "suppressed — can't advance"]); }
    if (a.crippled) { c.push(["Crippled", "a limb is gone; slower and less accurate"]); }
    if (marked) { c.push(["Marked", "targeted — incoming fire hits harder"]); }
    return c;
}
