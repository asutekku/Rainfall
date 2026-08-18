import {Actor} from "../actors/Actor";
import {Formation, formationFor} from "../actors/resources/factionStyles";
import {Chrome} from "./chrome";
import {applyStatus} from "./statuses";
import {crewFaction} from "../actors/resources/factionStyles";
import {traitOpeners} from "../actors/resources/traits";
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
const MIN_SEP = 2.5;     // metres: no two units share a cell — melee is adjacent, not stacked

/**
 * Most hostiles that may stand on the street at once.
 *
 * Not a balance number — a layout one. The phone battle HUD gives its hostile
 * column a fixed 172px with the scrollbar suppressed, which fits exactly four
 * rows, so a fifth body did not crowd the list: it fell below the fold with
 * nothing on screen to say it existed. Encounters spawn within this and
 * reinforcements top up to it rather than adding on top.
 */
export const FIELD_CAP = 4;

export const BLAST_RADIUS = 6;    // metres: frag grenade kill zone
export const GRENADE_RANGE = 22;  // metres: how far a frag can be thrown
export const SMOKE_RADIUS = 5;    // metres: smoke cloud footprint
export const SMOKE_ROUNDS = 2;    // rounds a smoke cloud hangs in the air
export const FLASH_RADIUS = 5;    // metres: flashbang burst
export const EMP_RADIUS = 5;      // metres: EMP discharge

/** A hanging smoke cloud: hides whoever stands inside it, spoils laser locks. */
export interface SmokeZone extends Point { r: number; rounds: number; }

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const dist2 = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

export interface Point { x: number; y: number; }

/** What a cover point looks like on the street (visual only; all cover plays the same). */
export type CoverKind = "car" | "crate" | "barrier" | "dumpster" | "pillar";

export interface CoverSpot extends Point { kind: CoverKind; }

const COVER_KINDS: CoverKind[] = ["car", "crate", "barrier", "dumpster", "pillar"];

/**
 * What a body brings to the first round before anyone shoots.
 *
 * Class and faction both get to open a fight, and both open it here rather than
 * in Combat, so a hostile Bulwark works the day one exists without a second
 * implementation. Deliberately small: an opener is a reason to have hired
 * somebody, not a free round.
 */
function openWith(a: Actor): void {
    if (!a.canFight()) { return; }
    // Bulwark "Dug In": four points of plate, shed one hit at a time.
    if (a.role && a.role.id === "bulwark") { applyStatus(a, "hardened", 4); }
    const f = crewFaction(a.faction);
    if (f && f.opener) { applyStatus(a, "adrenaline", f.opener); }
    if (f && f.smoke) { a.smokes += f.smoke; }
    traitOpeners(a.traits).forEach((o) => applyStatus(a, o.key, o.stacks));
}

export class Battlefield {

    /** Mid-field cover (wrecks, crates, barriers). Advancing to one both closes range and shields you. Re-rolled every deployment. */
    public static COVER: CoverSpot[] = [
        {x: -8, y: 16, kind: "car"}, {x: 7, y: 18, kind: "crate"}, {x: -2, y: 21, kind: "barrier"},
        {x: 13, y: 14, kind: "dumpster"}, {x: -15, y: 20, kind: "pillar"},
    ];

    /** Live smoke clouds. Cleared each deployment, thinned one step per round. */
    public static SMOKE: SmokeZone[] = [];

    /**
     * The hostile wave's original headcount (reinforcements add to it). Morale
     * needs it because the app prunes dead enemies from its live list.
     */
    public static WAVE: number = 0;

    /** Open a fresh engagement: new street furniture, squad near, hostiles far. */
    public static deploy(party: Actor[], enemies: Actor[]): void {
        this.rollCover();
        this.SMOKE = [];
        this.WAVE = enemies.length;
        this.line(party, SQUAD_Y);
        this.deployEnemies(enemies);
        [...party, ...enemies].forEach(openWith);
        // frags are carried, not conjured: the squad throws what it bought or
        // scavenged. Grenadier archetypes always pack theirs; heavier hostiles
        // sometimes bring one of their own.
        enemies.forEach((e) => {
            e.grenades = e.frags !== undefined ? e.frags
                : (e.rank || 1) >= 3 && Math.random() < 0.4 ? 1 : 0;
        });
        // battle-scoped injuries, stances, locks and magazines start clean
        [...party, ...enemies].forEach((a) => a.resetBattleState());
        Chrome.primeSquad(party);   // arm battle-scoped chrome (auras, overclock, graze)
    }

    /** Is a point inside any hanging smoke? */
    public static inSmoke(p: Point): boolean {
        return this.SMOKE.some((s) => dist2(s.x, s.y, p.x, p.y) <= s.r);
    }

    /** Pop a fresh cloud. */
    public static addSmoke(at: Point): void {
        this.SMOKE.push({x: at.x, y: at.y, r: SMOKE_RADIUS, rounds: SMOKE_ROUNDS});
    }

    /** A round passed: clouds thin and the spent ones drift away. */
    public static tickSmoke(): void {
        this.SMOKE = this.SMOKE
            .map((s) => ({...s, rounds: s.rounds - 1}))
            .filter((s) => s.rounds > 0);
    }

    /**
     * A blast levels the street furniture around it. Removes the caught cover
     * from play and reports what was lost (cars go up in a secondary explosion).
     */
    public static destroyCoverNear(at: Point, radius: number): CoverSpot[] {
        const gone = this.COVER.filter((c) => dist2(c.x, c.y, at.x, at.y) <= radius);
        if (gone.length) {
            this.COVER = this.COVER.filter((c) => gone.indexOf(c) < 0);
        }
        return gone;
    }

    /** Where a broken unit runs: the nearest street edge, away from the squad. */
    public static routExit(from: Point): Point {
        const x = from.x < 0 ? X_MIN : X_MAX;
        // bolt for the far corner on their own side of the street
        return {x, y: Math.min(Y_MAX, Math.max(from.y + 8, 36))};
    }

    /**
     * Scatter 5-7 cover points across the mid-field band, kept apart so each is
     * its own tactical decision and off the deploy lines so nobody spawns in cover.
     */
    private static rollCover(): void {
        const out: CoverSpot[] = [];
        let guard = 80;
        const want = 5 + Math.floor(Math.random() * 3);
        while (out.length < want && guard-- > 0) {
            // keep the band off both deploy lines so nobody spawns inside a wreck
            const p = {x: -18 + Math.random() * 36, y: 10 + Math.random() * 13};
            if (out.some((c) => dist2(c.x, c.y, p.x, p.y) < 6.5)) { continue; }
            out.push({x: p.x, y: p.y, kind: COVER_KINDS[Math.floor(Math.random() * COVER_KINDS.length)]!});
        }
        if (out.length >= 3) { this.COVER = out; }
    }

    /**
     * The wave's opening formation. Faction character decides it three times
     * out of four (Animals brawl in close, corporates hold a line, Tygers
     * flank) — the rest rolls wild so no faction is fully predictable.
     */
    public static chooseFormation(enemies: Actor[]): Formation {
        const all: Formation[] = ["line", "flank", "scatter", "close"];
        if (Math.random() < 0.25) { return all[Math.floor(Math.random() * all.length)]!; }
        return formationFor(enemies[0] ? enemies[0].faction : undefined);
    }

    /**
     * Place (or replace) a wave of hostiles. Each engagement opens differently:
     * a far skirmish line, a split flanking ambush, a loose scatter through the
     * mid-street, or a close-quarters brawl already inside pistol range.
     */
    public static deployEnemies(enemies: Actor[], formation?: Formation): void {
        const style = formation || this.chooseFormation(enemies);
        const placed: Actor[] = [];
        enemies.forEach((e, i) => {
            let x = 0, y = ENEMY_Y;
            switch (style) {
                case "flank": {   // flank ambush: halves tucked against both walls, mid-depth
                    const side = i % 2 === 0 ? -1 : 1;
                    x = side * (12 + Math.random() * 8);
                    y = 15 + Math.random() * 11;
                    break;
                }
                case "scatter": {   // loose scatter through the far half of the street
                    x = -18 + Math.random() * 36;
                    y = 24 + Math.random() * 16;
                    break;
                }
                case "close": {   // close contact: the fight starts inside pistol range
                    x = this.spread(i, enemies.length, 9);
                    y = 19 + Math.random() * 5;
                    break;
                }
                default: {  // classic staggered far line: 25 / 30 / 35m
                    x = this.spread(i, enemies.length, 10);
                    y = ENEMY_Y + ((i % 3) - 1) * 5;
                }
            }
            const spot = this.resolveFree(this.clamp({x, y}), placed, e);
            this.place(e, spot.x, spot.y);
            placed.push(e);
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
     * a cover point sits close to the target and between it and the attacker,
     * plus concealment when the target stands inside smoke (capped together).
     */
    public static coverPenaltyAt(targetPos: Point, fromPos: Point): number {
        let dv = 0;
        for (const c of this.COVER) {
            if (dist2(c.x, c.y, targetPos.x, targetPos.y) <= COVER_RADIUS
                && dist2(c.x, c.y, fromPos.x, fromPos.y) < dist2(targetPos.x, targetPos.y, fromPos.x, fromPos.y)) {
                dv = COVER_DV;
                break;
            }
        }
        if (this.inSmoke(targetPos)) { dv += COVER_DV; }
        return Math.min(dv, 6);
    }

    /** Is a position tucked next to any cover point (regardless of angle)? */
    public static nearCover(pos: Point): boolean {
        return this.COVER.some((c) => dist2(c.x, c.y, pos.x, pos.y) <= COVER_RADIUS);
    }

    /** Keep a point inside the arena bounds. */
    public static clamp(p: Point): Point {
        return {x: Math.max(X_MIN, Math.min(X_MAX, p.x)), y: Math.max(Y_MIN, Math.min(Y_MAX, p.y))};
    }

    /**
     * Move an actor up to `maxMeters` toward a destination, then resolve it out of
     * any cell already occupied by another unit (no stacking — melee ends up on an
     * adjacent cell). Returns metres actually moved.
     */
    public static stepToward(self: Actor, dest: Point, maxMeters: number, others: Actor[] = []): number {
        const start: Point = {x: self.position.x, y: self.position.y};
        const d = this.clamp(dest);
        const gap = dist2(start.x, start.y, d.x, d.y);
        const target: Point = (gap <= maxMeters || gap === 0)
            ? d
            : {x: start.x + (d.x - start.x) * (maxMeters / gap), y: start.y + (d.y - start.y) * (maxMeters / gap)};
        const resolved = this.resolveFree(target, others, self);
        self.position.x = resolved.x; self.position.y = resolved.y;
        return dist2(start.x, start.y, resolved.x, resolved.y);
    }

    /** Is this point clear of every other live unit's cell and off the cover objects themselves? */
    private static isFree(p: Point, others: Actor[], self: Actor): boolean {
        if (this.COVER.some((c) => dist2(c.x, c.y, p.x, p.y) < 1.5)) { return false; }
        return !others.some((o) => o !== self && o.canFight()
            && dist2(o.position.x, o.position.y, p.x, p.y) < MIN_SEP);
    }

    /** Nearest unoccupied point to `target`: try it, then rings of cells around it. */
    private static resolveFree(target: Point, others: Actor[], self: Actor): Point {
        if (this.isFree(target, others, self)) { return target; }
        for (const r of [MIN_SEP, MIN_SEP * 1.5, MIN_SEP * 2.2, MIN_SEP * 3]) {
            for (let k = 0; k < 8; k++) {
                const ang = k * Math.PI / 4;
                const cand = this.clamp({x: target.x + Math.cos(ang) * r, y: target.y + Math.sin(ang) * r});
                if (this.isFree(cand, others, self)) { return cand; }
            }
        }
        return target;
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
