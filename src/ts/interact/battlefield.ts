import {Actor} from "../actors/Actor";
import {Utils} from "../utils/utils";

/**
 * The engagement grid. Owns the single coordinate system (metres) that both the
 * RED range maths (Combat -> Utils.distance -> rangeDV) and the isometric map
 * read from, so what you see on the arena is the distance the dice use.
 *
 * x runs left/right, y runs near->far (depth), z is height (unused for now).
 * Squad deploys on the near line, hostiles on the far line. Movement between
 * cells is a later feature; for now deployment sets the opening ranges.
 */

const X_MIN = -24;
const X_MAX = 24;
const Y_MIN = 0;
const Y_MAX = 44;
const SQUAD_Y = 5;   // near line
const ENEMY_Y = 30;  // far line (staggered per unit)

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export class Battlefield {

    /** Open a fresh engagement: squad near, hostiles far. */
    public static deploy(party: Actor[], enemies: Actor[]): void {
        this.line(party, SQUAD_Y);
        this.deployEnemies(enemies);
    }

    /** Place (or replace) a wave of hostiles on the far line. Used on spawn + respawn. */
    public static deployEnemies(enemies: Actor[]): void {
        enemies.forEach((e, i) => {
            // stagger depth by index so a wave isn't a flat wall: 25 / 30 / 35m ...
            this.place(e, this.spread(i, enemies.length, 10), ENEMY_Y + ((i % 3) - 1) * 5);
        });
    }

    /** Metres between two actors — the value the RED range table consumes. */
    public static distance(a: Actor, b: Actor): number {
        return Utils.distance(a.position, b.position);
    }

    /**
     * Project a metre position to a percentage point inside the iso arena.
     * Near (small y) renders to the front, far (large y) to the back, mapped
     * onto the board band that reads well isometrically.
     */
    public static project(pos: { x: number; y: number }): { x: number; y: number } {
        const nx = clamp01((pos.x - X_MIN) / (X_MAX - X_MIN));
        const ny = clamp01((pos.y - Y_MIN) / (Y_MAX - Y_MIN));
        const c = 1.5 + nx * 5;
        const r = 1 + (1 - ny) * 5.5;
        return {x: 50 + (c - r) * 6, y: 26 + (c + r) * 5};
    }

    private static place(a: Actor, x: number, y: number): void {
        a.position.x = x;
        a.position.y = y;
        a.position.z = 0;
    }

    /** Even spread around x=0 with the given gap between units. */
    private static spread(i: number, n: number, gap: number): number {
        return (i - (n - 1) / 2) * gap;
    }

    private static line(actors: Actor[], y: number): void {
        actors.forEach((a, i) => this.place(a, this.spread(i, actors.length, 8), y));
    }
}
