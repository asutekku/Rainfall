import {Actor} from "../actors/Actor";
import {Point} from "./battlefield";

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
    /** HP that actually got past armour (0 on a miss or a fully-soaked hit) */
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
}

/** A frag goes off: everyone inside the radius — both sides — eats the roll. */
export interface BlastEvent {
    kind: "blast";
    actor: Actor;
    at: Point;
    radius: number;
    victims: BlastVictim[];
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
    | LevelEvent | MarkEvent;

/** One resolved turn: the animation script plus the text feed it produced. */
export interface TurnResult {
    events: BattleEvent[];
    messages: any[];
}
