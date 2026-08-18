import type {Actor} from "../../actors/Actor";
import type {KitId} from "../../interact/loadout";
import {STATUS, activeStatuses} from "../../interact/statuses";

/**
 * Row data for the phone battle HUD, kept free of runtime imports (type-only
 * Actor) so tests can load it without dragging the component graph — pulling
 * React + Actor through a component module trips the actors' circular-import
 * order and leaves `class Player extends Actor` with an uninitialised base.
 *
 * Both the chips and the card's plain-language list are derived from the
 * status registry rather than written out here, so adding an effect needs no
 * edit in the UI at all — declare it in statuses.ts and it shows up.
 */

/**
 * Battle states worth a chip on a 34px row, worst first — only two fit.
 *
 * A status earns a chip by changing what you expect to happen next. The rest
 * of the vocabulary lives on the unit card, which has room to say what it
 * means instead of abbreviating it to three letters nobody can look up.
 */
export function hudTags(a: Actor): Array<[string, string]> {
    const t: Array<[string, string]> = [];
    if (a.mortallyWounded) { t.push(["DYING", "s-dying"]); }
    else if (a.routed) { t.push(["FLED", "s-down"]); }
    else if (!a.canFight()) { t.push(["DOWN", "s-down"]); }
    for (const [key] of activeStatuses(a)) {
        const def = STATUS[key];
        if (!def.chip) { continue; }
        t.push([def.chip, "s-" + def.tone]);
    }
    return t.slice(0, 2);
}

/**
 * Ordnance still on this unit's belt, in the order the staging screen lists it.
 *
 * Type-only import of `KitId` on purpose: this module is loaded by tests that
 * must not drag the component graph in behind it (see the note at the top).
 */
export function onBelt(a: Actor): Array<[KitId, number]> {
    const held: Array<[KitId, number]> = [
        ["frag", a.grenades], ["flash", a.flashes], ["emp", a.emps], ["smoke", a.smokes],
    ];
    return held.filter(([, n]) => n > 0);
}

/** Worn or subdermal — whichever plate is actually stopping bullets. */
export function hudArmor(a: Actor): number {
    const worn = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
    return Math.max(worn, a.cyberSP());
}

/**
 * Every status on a unit, spelled out with its live stack count. The row
 * abbreviates because it has 34px; this is the legend behind it, and the only
 * place the whole vocabulary is written in words.
 */
export function unitConditions(a: Actor): Array<[string, string, boolean]> {
    const out: Array<[string, string, boolean]> = [];
    if (a.mortallyWounded) {
        out.push(["Dying", "bleeding out — one turn from dead unless stabilised", true]);
    } else if (a.routed) {
        out.push(["Fled", "morale broke; ran off the street", true]);
    } else if (!a.canFight()) {
        out.push(["Down", "out of the fight, not dead", true]);
    }
    for (const [key, n] of activeStatuses(a)) {
        const def = STATUS[key];
        out.push([def.label, def.explain(n), def.debuff]);
    }
    return out;
}
