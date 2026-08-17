import {Actor} from "../actors/Actor";
import {Point} from "./battlefield";
import type {HitQuality} from "./damageModel";
import type {StatusKey} from "./statuses";

/**
 * Structured play-by-play of a single combat turn. The engine (Combat) records
 * these while it resolves a unit's turn; the 3D battle scene replays them as
 * animations — walk paths, muzzle flashes, tracers, falls — so what the player
 * watches is exactly what the dice did, in the order they did it.
 */

export interface TurnEvent {
    kind: "turn";
    actor: Actor;
    side: "party" | "enemy";
}

export interface MoveEvent {
    kind: "move";
    actor: Actor;
    from: Point;
    to: Point;
    /** ends the move tucked next to cover (plays the crouch) */
    cover: boolean;
    /** all-out sprint (melee closing at double speed — faster, leaning gait) */
    sprint?: boolean;
}

export interface ShotEvent {
    kind: "shot";
    actor: Actor;
    target: Actor;
    hit: boolean;
    /** how well it connected — drives the damage multiplier and the floater label */
    quality: HitQuality;
    /** HP that actually got past armour (0 on a miss) */
    damage: number;
    aimed: boolean;
    autofire: boolean;
    melee: boolean;
    /** the target was behind cover for this shot */
    covered: boolean;
    /** this shot took the target out of the fight */
    dropped: boolean;
    /** rounds leaving the barrel this attack (weapon rate of fire; 5 on autofire) — how many tracers to draw */
    rounds: number;
}

/** Target out of the weapon's range band — the turn fizzles visibly. */
export interface NoShotEvent {
    kind: "noshot";
    actor: Actor;
}

export interface BlastVictim {
    target: Actor;
    /** HP that got through (armour is halved against blasts) */
    damage: number;
    /** dove clear for half damage */
    dodged: boolean;
    dropped: boolean;
    /** flashbang/EMP left them reeling — they lose their next turn */
    stunned?: boolean;
}

/** What kind of ordnance went off (drives visuals, feed wording and effects). */
export type BlastType = "frag" | "smoke" | "flash" | "emp" | "car" | "slam";

/** Something goes off at a point: frag, smoke, flashbang, EMP, car, boss slam. */
export interface BlastEvent {
    kind: "blast";
    actor: Actor;
    at: Point;
    radius: number;
    gtype: BlastType;
    victims: BlastVictim[];
}

/** A big hit left a lasting mark — battle-scoped critical injury. */
export interface CritEvent {
    kind: "crit";
    actor: Actor;                                      // the one who got hurt
    effect: "bleeding" | "crippled" | "stunned";
}

/** Turn-start damage-over-time tick: bleeding, fire, toxins — all through armour. */
export interface BleedEvent {
    kind: "bleed";
    actor: Actor;
    damage: number;
    dropped: boolean;
    /** which effects did it, so the board and the feed can name them */
    sources: StatusKey[];
}

/** A status landed on (or fell off) a unit — the board announces it. */
export interface StatusEvent {
    kind: "status";
    actor: Actor;
    status: StatusKey;
    stacks: number;
    /** the target's Ward ate it instead */
    warded: boolean;
}

/** The unit sits its turn out. Only a stun does this. */
export interface SkipEvent {
    kind: "skip";
    actor: Actor;
    reason: "stunned";
}

/** Dry magazine: the turn's attack becomes a reload. */
export interface ReloadEvent {
    kind: "reload";
    actor: Actor;
}

/** Autofire hosing a position: no damage, but a pinned target hides next turn. */
export interface SuppressEvent {
    kind: "suppress";
    actor: Actor;
    target: Actor;
    pinned: boolean;
}

/** Field medicine: stop the bleeding, drag the dying back to their feet. */
export interface StabilizeEvent {
    kind: "stabilize";
    actor: Actor;
    target: Actor;
    /** target was mortally wounded and is back up (at 1 HP) */
    saved: boolean;
}

/** Morale breaks: the unit sprints off the field and out of the fight. */
export interface RoutEvent {
    kind: "rout";
    actor: Actor;
    to: Point;
}

/** A cover object is destroyed (cars go up in a secondary explosion). */
export interface CoverGoneEvent {
    kind: "coverGone";
    at: Point;
    ckind: string;
    exploded: boolean;
}

/** A rank-5 signature move. */
export interface AbilityEvent {
    kind: "ability";
    actor: Actor;
    name: "leap" | "volley";
    /** leap landing point */
    to?: Point;
}

/** Netrunner quickhack: Short Circuit through a chromed target's systems. */
export interface HackEvent {
    kind: "hack";
    actor: Actor;
    target: Actor;
    damage: number;
    stunned: boolean;
    dropped: boolean;
}

/** Mortally Wounded unit rolls its Death Save instead of acting. */
export interface SaveEvent {
    kind: "save";
    actor: Actor;
    survived: boolean;
}

export interface LevelEvent {
    kind: "level";
    actor: Actor;
}

/** A sniper paints its target: the laser telegraphs next turn's shot. */
export interface MarkEvent {
    kind: "mark";
    actor: Actor;
    target: Actor;
}

export type BattleEvent = TurnEvent | MoveEvent | ShotEvent | NoShotEvent | BlastEvent | SaveEvent
    | LevelEvent | MarkEvent | CritEvent | BleedEvent | SkipEvent | ReloadEvent | SuppressEvent
    | StabilizeEvent | RoutEvent | CoverGoneEvent | AbilityEvent | HackEvent | StatusEvent;

/** One resolved turn: the animation script plus the text feed it produced. */
export interface TurnResult {
    events: BattleEvent[];
    messages: any[];
}
