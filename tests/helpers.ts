import {Actor} from "../src/ts/actors/Actor";
import {GetItem} from "../src/ts/interact/getItem";

/**
 * Shared scaffolding for the battle-system tests: deterministic dice and a
 * factory for combat-ready actors with known stats.
 */

/** Run `fn` with Math.random pinned (0.5 → d10 rolls 6, d6 rolls 4: no explode, no fumble). */
export function withRandom<T>(value: number | (() => number), fn: () => T): T {
    const orig = Math.random;
    Math.random = typeof value === "function" ? value : () => value;
    try {
        return fn();
    } finally {
        Math.random = orig;
    }
}

export interface FighterCfg {
    ref?: number;
    dex?: number;
    body?: number;
    will?: number;
    skill?: number;
    luck?: number;
    weapon?: string;
    x?: number;
    y?: number;
}

/** A combat-ready actor with explicit stats (luck 0 by default so dice are pure). */
export function fighter(cfg: FighterCfg = {}): Actor {
    const a = new Actor();
    a.setCombatProfile({
        ref: cfg.ref ?? 5, dex: cfg.dex ?? 5, body: cfg.body ?? 5, will: cfg.will ?? 5,
        skill: cfg.skill ?? 5, luck: cfg.luck ?? 0,
    });
    if (cfg.weapon) { a.weapon = GetItem.weapon(cfg.weapon); }
    a.position.x = cfg.x ?? 0;
    a.position.y = cfg.y ?? 0;
    a.position.z = 0;
    return a;
}
