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

const COVER_RADIUS = 3;  // metres: how close you must be to a cover point to benefit
const COVER_DV = 4;      // extra DV to hit a target that is behind cover

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const dist2 = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

export interface Point { x: number; y: number; }

export class Battlefield {

    /** Mid-field cover (crates, pillars). Advancing to one both closes range and shields you. */
    public static readonly COVER: Point[] = [
        {x: -8, y: 16}, {x: 7, y: 18}, {x: -2, y: 21}, {x: 13, y: 14}, {x: -15, y: 20},
    ];

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

    /** Inverse of project(): an arena click (percentage point) back to a metre position. */
    public static unproject(xPct: number, yPct: number): Point {
        const cMinusR = (xPct - 50) / 6;
        const cPlusR = (yPct - 26) / 5;
        const c = (cMinusR + cPlusR) / 2;
        const r = (cPlusR - cMinusR) / 2;
        const nx = (c - 1.5) / 5;
        const ny = 1 - (r - 1) / 5.5;
        return this.clamp({x: X_MIN + nx * (X_MAX - X_MIN), y: Y_MIN + ny * (Y_MAX - Y_MIN)});
    }

    /** Distance in metres between two raw points. */
    public static gap(a: Point, b: Point): number {
        return dist2(a.x, a.y, b.x, b.y);
    }

    /**
     * Extra DV to hit a target at `targetPos` from `fromPos`: partial cover when
     * a cover point sits close to the target and between it and the attacker.
     */
    public static coverPenaltyAt(targetPos: Point, fromPos: Point): number {
        for (const c of this.COVER) {
            if (dist2(c.x, c.y, targetPos.x, targetPos.y) <= COVER_RADIUS
                && dist2(c.x, c.y, fromPos.x, fromPos.y) < dist2(targetPos.x, targetPos.y, fromPos.x, fromPos.y)) {
                return COVER_DV;
            }
        }
        return 0;
    }

    /** Is a position tucked next to any cover point (regardless of angle)? */
    public static nearCover(pos: Point): boolean {
        return this.COVER.some((c) => dist2(c.x, c.y, pos.x, pos.y) <= COVER_RADIUS);
    }

    /** Keep a point inside the arena bounds. */
    public static clamp(p: Point): Point {
        return {x: Math.max(X_MIN, Math.min(X_MAX, p.x)), y: Math.max(Y_MIN, Math.min(Y_MAX, p.y))};
    }

    /** Move an actor up to `maxMeters` toward a destination; returns metres moved. */
    public static stepToward(self: Actor, dest: Point, maxMeters: number): number {
        const d = this.clamp(dest);
        const gap = dist2(self.position.x, self.position.y, d.x, d.y);
        if (gap <= maxMeters || gap === 0) {
            self.position.x = d.x; self.position.y = d.y;
            return gap;
        }
        const t = maxMeters / gap;
        self.position.x += (d.x - self.position.x) * t;
        self.position.y += (d.y - self.position.y) * t;
        return maxMeters;
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
