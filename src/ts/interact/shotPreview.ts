import {Actor} from "../actors/Actor";
import {Battlefield, Point} from "./battlefield";
import {QUALITY_MULT, QualityOdds, applySoak, AIMED_EDGE, coverEdge, expectedMult, outOfRange, qualityOdds, rangeEdge} from "./damageModel";

/**
 * What a shot from here is worth, in the numbers a player can act on.
 *
 * This replaced `aimPreview`, which answered "what are the odds this hits?" —
 * the only question worth asking when a miss meant nothing happened. Every
 * shot lands now, so the useful questions are how *hard* it lands and how much
 * of that armour keeps. Read by the unit card, so someone watching a fight
 * they don't control can see why their merc is chipping away at one target and
 * cutting through another.
 *
 * Luck is ignored, so the figures are the floor of what the shot can do.
 */

export interface ShotPreview {
    /** false = the target is past what this weapon reaches at all */
    ok: boolean;
    /** metres to the target */
    dist: number;
    /** the target is behind cover from the firing point */
    covered: boolean;
    melee: boolean;
    /** out of melee reach — in range, but the swing can't land */
    unreachable: boolean;
    /** the accuracy edge behind the shot (attack bonus, range, cover) */
    edge: number;
    odds: QualityOdds;
    /** mean HP past armour per shot, and what a clean hit / a crit would do */
    expected: number;
    onHit: number;
    onCrit: number;
    /** share of a solid hit that armour keeps (0-1) */
    soaked: number;
}

const MELEE_BASE = 12;
const MELEE_REACH = 4;

function bodySP(target: Actor): number {
    const worn = target.equipment.upper ? target.equipment.upper.stoppingPower : 0;
    return Math.max(worn, target.cyberSP());
}

/** What `actor` would do to `target`, firing from `from` (defaults to where it stands). */
export function shotPreview(actor: Actor, target: Actor, from?: Point, aimed: boolean = false): ShotPreview {
    const w = actor.weapon;
    const at: Point = from || {x: actor.position.x, y: actor.position.y};
    const tp: Point = {x: target.position.x, y: target.position.y};
    const dist = Battlefield.gap(at, tp);
    const cover = Battlefield.coverPenaltyAt(tp, at);
    const melee = w.weaponClass === "melee";

    const base = actor.attackBonus(w) + (aimed ? AIMED_EDGE : 0);
    const edge = melee
        ? base + MELEE_BASE - target.evasion()
        : base + rangeEdge(w.weaponClass, dist) + coverEdge(cover);

    const sp = bodySP(target);
    const raw = w.averageDamage() * actor.damageFactor(w);
    const onHit = applySoak(Math.round(raw * QUALITY_MULT.hit), sp, w.ap);
    const onCrit = applySoak(Math.round(raw * QUALITY_MULT.crit), sp, w.ap);
    const shape = {
        dist, covered: cover > 0, melee, edge,
        odds: qualityOdds(edge),
        onHit, onCrit,
        soaked: raw > 0 ? Math.max(0, 1 - onHit / raw) : 0,
    };

    if (melee) {
        return {...shape, ok: true, unreachable: dist > MELEE_REACH,
                expected: dist > MELEE_REACH ? 0 : applySoak(Math.round(raw * expectedMult(edge)), sp, w.ap)};
    }
    if (outOfRange(w.weaponClass, dist)) {
        return {...shape, ok: false, unreachable: false, expected: 0};
    }
    return {...shape, ok: true, unreachable: false,
            expected: applySoak(Math.round(raw * expectedMult(edge)), sp, w.ap)};
}
