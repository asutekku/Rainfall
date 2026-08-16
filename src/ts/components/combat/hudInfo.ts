import type {Actor} from "../../actors/Actor";

/**
 * Row data for the phone battle HUD, kept free of runtime imports (type-only
 * Actor) so tests can load it without dragging the component graph — pulling
 * React + Actor through a component module trips the actors' circular-import
 * order and leaves `class Player extends Actor` with an uninitialised base.
 */

/** Battle states worth a chip, worst first — a row only has room for three. */
export function hudTags(a: Actor, marked: boolean): Array<[string, string]> {
    const t: Array<[string, string]> = [];
    if (a.mortallyWounded) { t.push(["DYING", "s-dying"]); }
    else if (a.routed) { t.push(["FLED", "s-down"]); }
    else if (!a.canFight()) { t.push(["DOWN", "s-down"]); }
    if (a.bleeding > 0) { t.push(["BLD", "s-bad"]); }
    if (a.stunned > 0) { t.push(["STN", "s-warn"]); }
    if (a.pinned) { t.push(["PIN", "s-warn"]); }
    if (a.crippled) { t.push(["CRP", "s-warn"]); }
    if (marked) { t.push(["MRK", "s-mrk"]); }
    return t.slice(0, 3);
}

/** Worn or subdermal — whichever plate is actually stopping bullets. */
export function hudArmor(a: Actor): number {
    const worn = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
    return Math.max(worn, a.cyberSP());
}
