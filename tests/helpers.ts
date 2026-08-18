import {Actor} from "../src/ts/actors/Actor";
import {GetItem} from "../src/ts/interact/getItem";
import {Role} from "../src/ts/actors/resources/Role";

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
    /** Combat class id. Defaults to a rider-free, bonus-free one — see `fighter`. */
    cls?: string;
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
    // A bare Actor rolls a random class, which makes every combat test a
    // hostage to whatever RNG the test pinned: draw a Marksman and the alpha
    // strike silently adds damage, draw an Enforcer and every hit staggers.
    // Medtech is the neutral one — no on-hit rider, no opener, no bonus — so a
    // test that wants a class asks for it.
    a.role = new Role(cfg.cls || "medtech");
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
