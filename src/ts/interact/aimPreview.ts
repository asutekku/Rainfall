import {Actor} from "../actors/Actor";
import {Battlefield, Point} from "./battlefield";
import {rangeDV} from "./rangeTable";

/**
 * Exact to-hit odds for the order UI (XCOM-style "63%"). Uses the real RED
 * dice distribution — exploding 10s, fumbling 1s — but ignores Luck top-ups,
 * so the shown number is the floor of what the shot can do.
 */

export interface AimPreview {
    ok: boolean;          // false = no shot from here (out of range)
    pct: number;          // 0-100 chance to hit
    dist: number;         // metres to the target
    covered: boolean;     // the target is behind cover from the firing point
    melee: boolean;
}

/** The RED d10 as (value, probability) pairs: 2-9 flat, 10s explode, 1s fumble. */
const D10: Array<[number, number]> = (() => {
    const out: Array<[number, number]> = [];
    for (let v = 2; v <= 9; v++) { out.push([v, 0.1]); }
    for (let v = 11; v <= 20; v++) { out.push([v, 0.01]); }   // nat 10 + d10
    for (let v = -9; v <= 0; v++) { out.push([v, 0.01]); }    // nat 1 - d10
    return out;
})();

/** P(exploding d10 ≥ need) — exported so the AI can reason about its own odds. */
export const pAtLeast = (need: number): number =>
    D10.reduce((p, [v, pr]) => v >= need ? p + pr : p, 0);

/** P(attacker roll + atk >= defender roll + def), both dice exploding. */
const pOpposed = (atk: number, def: number): number => {
    let p = 0;
    for (const [dv, dp] of D10) { p += dp * pAtLeast(dv + def - atk); }
    return p;
};

/** Odds of `actor` hitting `target`, firing from `from` (defaults to where it stands). */
export function aimPreview(actor: Actor, target: Actor, from?: Point, aimed: boolean = false): AimPreview {
    const w = actor.weapon;
    const at: Point = from || {x: actor.position.x, y: actor.position.y};
    const tp: Point = {x: target.position.x, y: target.position.y};
    const dist = Battlefield.gap(at, tp);
    const covered = Battlefield.coverPenaltyAt(tp, at) > 0;

    if (w.weaponClass === "melee") {
        const reach = dist <= 4;   // TacticalAI's MELEE_REACH
        const p = pOpposed(actor.attackBonus(w) + (aimed ? -8 : 0), target.evasion());
        return {ok: reach, pct: Math.round(p * 100), dist, covered: false, melee: true};
    }
    const dv = rangeDV(w.weaponClass, dist);
    if (dv === null) { return {ok: false, pct: 0, dist, covered, melee: false}; }
    const canAim = aimed && !w.autofire;   // RED: autofire can't make an Aimed Shot
    const mod = actor.attackBonus(w) + (canAim ? -8 : 0);
    const need = dv + (covered ? 4 : 0);
    return {ok: true, pct: Math.round(pAtLeast(need - mod) * 100), dist, covered, melee: false};
}
