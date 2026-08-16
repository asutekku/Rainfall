import {Actor} from "../actors/Actor";
import {Weapon} from "../items/Weapon";
import {pAtLeast} from "./aimPreview";
import {BLAST_RADIUS, Battlefield, GRENADE_RANGE, Point} from "./battlefield";
import {rangeDV} from "./rangeTable";

/**
 * Tactical combat AI.
 *
 * Each turn the acting unit enumerates a handful of candidate destinations
 * (hold, advance to its weapon's best range, duck to cover, flank, retreat),
 * then scores each one with a small Monte-Carlo rollout: it samples the real
 * Cyberpunk RED resolution — exploding d10 to-hit against the range/cover DV,
 * d6 damage with crits, autofire multipliers, armour — to estimate the damage
 * it would deal from there and the damage it would take in return. It picks the
 * position with the best expected trade, weighting survival higher as its own
 * HP drops. This is deliberately a "mini Monte Carlo": cheap, stochastic, and
 * good enough to play smart without a full game-tree search.
 */

export interface Plan {
    moveTo?: Point | undefined;
    target?: Actor | undefined;
    aimed?: boolean | undefined;
    /** throw a frag at this point instead of shooting */
    grenadeAt?: Point | undefined;
    /** all-out double move that forfeits the attack (melee closing distance) */
    sprint?: boolean | undefined;
    /** sniper telegraph: paint this target now, fire the steadied shot next turn */
    markTarget?: Actor | undefined;
    label: string;
}

const SAMPLES = 20;        // rollouts per (attacker,target) estimate
const MELEE_REACH = 4;     // metres you must be within to melee (>= one cell, so adjacent works)

const W_MOVE = 0.02;       // tiny cost per metre moved (prefer standing when equal)

/**
 * Per-temperament weight profiles. `camp` is the penalty for ending a turn
 * stationary without a real shot — it keeps units from turtling into a mutual
 * standoff. Aggressors carry a big camp penalty (they always push); campers
 * carry none (holding cover is their whole plan).
 */
interface Profile { off: number; def: number; kill: number; cover: number; risk: number; progress: number; camp: number; }

const PROFILES: { [k: string]: Profile } = {
    //          offense defense kill cover risk progress camp
    balanced:   {off: 1.2, def: 0.80, kill: 10, cover: 2.5, risk: 0.9, progress: 0.32, camp: 1.5},
    aggressive: {off: 1.5, def: 0.50, kill: 12, cover: 1.0, risk: 0.5, progress: 0.60, camp: 4.0},
    flanker:    {off: 1.3, def: 0.70, kill: 11, cover: 2.0, risk: 0.7, progress: 0.45, camp: 2.5},
    camper:     {off: 1.1, def: 1.00, kill: 10, cover: 4.5, risk: 1.1, progress: 0.12, camp: 0.0},
    berserker:  {off: 1.7, def: 0.35, kill: 14, cover: 0.5, risk: 0.3, progress: 0.90, camp: 5.0},
};

const profileFor = (a: Actor): Profile => PROFILES[a.temperament] || PROFILES["balanced"]!;

const d6 = (): number => Math.floor(Math.random() * 6) + 1;

/** RED d10: explodes on a natural 10, fumbles on a natural 1. */
function redRoll(): number {
    const first = Math.floor(Math.random() * 10) + 1;
    if (first === 10) { return 10 + (Math.floor(Math.random() * 10) + 1); }
    if (first === 1) { return 1 - (Math.floor(Math.random() * 10) + 1); }
    return first;
}

/** Effective body stopping power the RED way: best of worn/subdermal, halved by AP. */
function effectiveSP(target: Actor, ap: boolean): number {
    const worn = target.equipment.upper ? target.equipment.upper.stoppingPower : 0;
    let sp = Math.max(worn, target.cyberSP());
    if (ap) { sp = Math.floor(sp / 2); }
    return sp;
}

/** Head stopping power (headgear only; subdermal armour doesn't cover the head). */
function headSP(target: Actor, ap: boolean): number {
    let sp = target.equipment.headgear ? target.equipment.headgear.stoppingPower : 0;
    if (ap) { sp = Math.floor(sp / 2); }
    return sp;
}

function sampleKineticDamage(w: Weapon): number {
    let total = w.damage;
    let sixes = 0;
    for (let i = 0; i < w.diceThrows; i++) {
        const roll = d6();
        total += roll;
        if (roll === 6) { sixes += 1; }
    }
    if (sixes >= 2) { total += 5; }
    return total;
}

/** Net damage past armour for a landed hit — head shots use head SP and double what gets through. */
function landedDamage(w: Weapon, target: Actor, aimed: boolean): number {
    const dmg = sampleKineticDamage(w);
    return aimed ? Math.max(0, dmg - headSP(target, w.ap)) * 2 : Math.max(0, dmg - effectiveSP(target, w.ap));
}

/** One simulated attack: net HP damage dealt (0 on miss / out of range / non-kinetic). */
function sampleNet(attacker: Actor, target: Actor, distance: number, coverDV: number, aimed: boolean): number {
    const w = attacker.weapon;
    if (w.damageType !== "kinetic" || w.diceThrows <= 0) { return 0; }
    const aimPenalty = aimed ? -8 : 0;   // RED Aimed Shot: -8 to hit

    if (w.weaponClass === "melee") {
        if (distance > MELEE_REACH) { return 0; }
        if (redRoll() + attacker.attackBonus(w) + aimPenalty < redRoll() + target.evasion()) { return 0; }
        return landedDamage(w, target, aimed);
    }

    const dv = rangeDV(w.weaponClass, distance);
    if (dv === null) { return 0; }
    const total = redRoll() + attacker.attackBonus(w) + aimPenalty;
    const need = dv + coverDV;
    if (total < need) { return 0; }

    if (w.autofire) {   // autofire can't aim; damage is 2d6 x margin, capped
        const maxMult = w.weaponClass === "rifle" ? 4 : 3;
        const mult = Math.max(1, Math.min(total - need, maxMult));
        const a = d6(); const b = d6();
        let dmg = (a + b) * mult;
        if (a === 6 && b === 6) { dmg += 5; }
        return Math.max(0, dmg - effectiveSP(target, w.ap));
    }
    return landedDamage(w, target, aimed);
}

/** Mean net damage across the given distance + cover, optionally aiming for the head. */
function expectedNet(attacker: Actor, target: Actor, distance: number, coverDV: number, aimed: boolean): number {
    let sum = 0;
    for (let i = 0; i < SAMPLES; i++) { sum += sampleNet(attacker, target, distance, coverDV, aimed); }
    return sum / SAMPLES;
}

/** Best expected damage and whether an aimed head shot beats a normal shot here. */
function bestNet(attacker: Actor, target: Actor, distance: number, coverDV: number): { value: number; aimed: boolean } {
    const normal = expectedNet(attacker, target, distance, coverDV, false);
    // Aiming is a specialist move: worth the -8 only when body armour is genuinely
    // stopping normal fire. If a normal shot already punches through (avg damage well
    // over the target's SP), take it — the higher hit chance resolves faster.
    const penetration = attacker.weapon.averageDamage() - effectiveSP(target, attacker.weapon.ap);
    if (!TacticalAI.allowAimed || attacker.weapon.autofire || penetration >= 3) {
        return {value: normal, aimed: false};
    }
    // ... and only for shooters who can actually land it. A low-skill ganger
    // spamming -8 head shots is a whiff war, not a tactic: gate on the real
    // odds of the aimed shot connecting.
    const dv = attacker.weapon.weaponClass === "melee" ? null : rangeDV(attacker.weapon.weaponClass, distance);
    if (dv !== null) {
        const aimChance = pAtLeast(dv + coverDV - (attacker.attackBonus(attacker.weapon) - 8));
        if (aimChance < 0.35) { return {value: normal, aimed: false}; }
    }
    const aimed = expectedNet(attacker, target, distance, coverDV, true);
    return aimed > normal ? {value: aimed, aimed: true} : {value: normal, aimed: false};
}

const pos = (a: Actor): Point => ({x: a.position.x, y: a.position.y});

/** A point at most `maxDist` metres from `from` in the direction of `to`. */
function pointToward(from: Point, to: Point, maxDist: number): Point {
    const gap = Battlefield.gap(from, to);
    if (gap <= maxDist || gap === 0) { return {x: to.x, y: to.y}; }
    const t = maxDist / gap;
    return {x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t};
}

/** The range this weapon wants to fight at (its low-DV band, kept off point-blank). */
function preferredGap(w: Weapon): number {
    if (w.weaponClass === "melee") { return 2.5; }   // adjacent cell, not on top of the target
    switch (w.weaponClass) {
        case "shotgun": return 10;
        case "pistol": return 14;
        case "smg": return 16;
        case "bow": return 16;
        case "rifle": return 30;
        case "sniper": return 60;
        default: return 14;
    }
}

export class TacticalAI {

    /** A/B switch for the balance sim: whether the AI may choose aimed head shots. */
    public static allowAimed = true;

    /** Roll a combat temperament for a spawned enemy (melee thugs rush by nature). */
    public static rollTemperament(weaponClass: string): string {
        if (weaponClass === "melee") { return Math.random() < 0.6 ? "berserker" : "aggressive"; }
        const r = Math.random();
        if (r < 0.38) { return "aggressive"; }
        if (r < 0.63) { return "balanced"; }
        if (r < 0.85) { return "flanker"; }
        return "camper";
    }

    /** Choose this turn's move + attack for `self`. */
    public static plan(self: Actor, _allies: Actor[], enemies: Actor[]): Plan {
        const foes = enemies.filter((e) => e.canFight());
        if (!foes.length) { return {label: "hold"}; }

        // a clustered enemy squad is worth a frag — but never danger-close
        const frag = this.grenadePlan(self, _allies, foes);
        if (frag) { return frag; }

        const prof = profileFor(self);
        const run = self.runMeters();
        const here = pos(self);
        const nearest = foes.reduce((a, b) => Battlefield.gap(here, pos(b)) < Battlefield.gap(here, pos(a)) ? b : a);
        const primary = pos(nearest);

        // melee too far to land a blow this turn: all-out sprint beats a
        // half-advance that leaves the brawler standing in the open
        if (self.weapon.weaponClass === "melee" && Battlefield.gap(here, primary) > run + MELEE_REACH) {
            return {moveTo: pointToward(here, primary, run * 2), sprint: true, label: "sprint"};
        }

        // snipers play their own game: paint, then fire the steadied shot
        if (self.weapon.weaponClass === "sniper") {
            const sniper = this.sniperPlan(self, foes);
            if (sniper) { return sniper; }
        }

        const candidates = this.candidates(self, here, primary, foes, run);

        let best = candidates[0]!;
        let bestScore = -Infinity;
        let bestTarget: Actor | undefined;
        let bestAimed = false;
        for (const spot of candidates) {
            const evalResult = this.score(self, spot, foes, prof);
            if (evalResult.score > bestScore) {
                bestScore = evalResult.score;
                best = spot;
                bestTarget = evalResult.target;
                bestAimed = evalResult.aimed;
            }
        }

        const moved = Battlefield.gap(here, best) > 0.5;
        return {
            moveTo: moved ? best : undefined,
            target: bestTarget,
            aimed: bestAimed,
            label: moved ? (Battlefield.nearCover(best) ? "cover" : "reposition") : "attack",
        };
    }

    /**
     * Sniper doctrine: fire the steadied shot at a live laser lock, otherwise
     * pick the juiciest target, settle into cover if there's some close by,
     * and paint it — the visible telegraph IS the counterplay window.
     */
    private static sniperPlan(self: Actor, foes: Actor[]): Plan | null {
        const here = pos(self);
        const locked = self.marking && self.marking.canFight() ? self.marking : null;
        if (locked) {
            const dist = Battlefield.gap(here, pos(locked));
            const cover = Battlefield.coverPenaltyAt(pos(locked), here);
            return {target: locked, aimed: bestNet(self, locked, dist, cover).aimed, label: "deadeye"};
        }
        // best expected-damage target from where we stand
        let mark: Actor | undefined;
        let best = -1;
        for (const foe of foes) {
            const v = expectedNet(self, foe, Battlefield.gap(here, pos(foe)),
                Battlefield.coverPenaltyAt(pos(foe), here), false);
            if (v > best) { best = v; mark = foe; }
        }
        if (!mark) { return null; }
        // settle into nearby cover while painting (a nest, not a road trip)
        let moveTo: Point | undefined;
        if (!Battlefield.nearCover(here)) {
            const near = Battlefield.COVER.slice()
                .sort((a, b) => Battlefield.gap(here, a) - Battlefield.gap(here, b))[0];
            if (near && Battlefield.gap(here, near) <= self.runMeters() + 2) {
                const d = Battlefield.gap(near, pos(mark)) || 1;
                moveTo = pointToward(here, {x: near.x + (near.x - mark.position.x) / d * 2.0,
                    y: near.y + (near.y - mark.position.y) / d * 2.0}, self.runMeters());
            }
        }
        return {moveTo, markTarget: mark, label: "mark"};
    }

    /**
     * Frag check: find a blast point that catches 2+ hostiles while every
     * friendly (thrower included) stays a safety margin outside the radius.
     */
    private static grenadePlan(self: Actor, allies: Actor[], foes: Actor[]): Plan | null {
        if ((self.grenades || 0) <= 0) { return null; }
        const here = pos(self);
        // candidate blast points: each foe, and midpoints of foe pairs
        const points: Point[] = foes.map(pos);
        for (let i = 0; i < foes.length; i++) {
            for (let j = i + 1; j < foes.length; j++) {
                const a = pos(foes[i]!), b = pos(foes[j]!);
                if (Battlefield.gap(a, b) <= BLAST_RADIUS * 1.8) {
                    points.push({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
                }
            }
        }
        let best: Point | null = null;
        let bestCaught = 1;   // require 2+ — a frag on a lone target wastes it
        for (const p of points) {
            if (Battlefield.gap(here, p) > GRENADE_RANGE) { continue; }
            const friendlyClose = [self, ...allies].some((a) =>
                a.canFight() && Battlefield.gap(pos(a), p) <= BLAST_RADIUS + 2);
            if (friendlyClose) { continue; }
            const caught = foes.filter((f) => Battlefield.gap(pos(f), p) <= BLAST_RADIUS).length;
            if (caught > bestCaught) { bestCaught = caught; best = p; }
        }
        return best ? {grenadeAt: best, label: "frag"} : null;
    }

    /** Candidate destinations reachable this turn. */
    private static candidates(self: Actor, here: Point, primary: Point, foes: Actor[], run: number): Point[] {
        const want = preferredGap(self.weapon);
        const gapToPrimary = Battlefield.gap(here, primary);

        // advance/retreat to the weapon's preferred range along the current bearing
        const targetGap = Math.max(want, gapToPrimary - run);
        const dir = gapToPrimary > 0
            ? {x: (here.x - primary.x) / gapToPrimary, y: (here.y - primary.y) / gapToPrimary}
            : {x: 0, y: 1};
        const advance: Point = {x: primary.x + dir.x * targetGap, y: primary.y + dir.y * targetGap};

        // lateral flanks off the advance point
        const perp = {x: -dir.y, y: dir.x};
        const flankL: Point = {x: advance.x + perp.x * 6, y: advance.y + perp.y * 6};
        const flankR: Point = {x: advance.x - perp.x * 6, y: advance.y - perp.y * 6};

        // the three nearest covers, each approached on the side AWAY from the
        // closest foe — hug the safe face, don't stand on the object
        const hugs = Battlefield.COVER.slice()
            .sort((a, b) => Battlefield.gap(here, a) - Battlefield.gap(here, b))
            .slice(0, 3)
            .map((c) => {
                const d = Battlefield.gap(c, primary) || 1;
                const hug: Point = {x: c.x + (c.x - primary.x) / d * 2.0, y: c.y + (c.y - primary.y) / d * 2.0};
                return pointToward(here, hug, run);
            });

        // retreat away from the foe centroid (matters most when hurt)
        const cx = foes.reduce((s, f) => s + f.position.x, 0) / foes.length;
        const cy = foes.reduce((s, f) => s + f.position.y, 0) / foes.length;
        const away = Battlefield.gap(here, {x: cx, y: cy});
        const retreat: Point = away > 0
            ? {x: here.x + (here.x - cx) / away * run, y: here.y + (here.y - cy) / away * run}
            : here;

        return [here, advance, flankL, flankR, ...hugs, retreat].map((p) => Battlefield.clamp(p));
    }

    /** Score a destination: expected damage dealt minus damage taken, plus positional value. */
    private static score(self: Actor, spot: Point, foes: Actor[], prof: Profile): { score: number; target?: Actor | undefined; aimed: boolean } {
        // best target reachable from this spot (normal vs aimed head shot chosen by EV)
        let offense = 0;
        let target: Actor | undefined;
        let aimed = false;
        let killBonus = 0;
        for (const foe of foes) {
            const dist = Battlefield.gap(spot, pos(foe));
            const cover = Battlefield.coverPenaltyAt(pos(foe), spot);
            const shot = bestNet(self, foe, dist, cover);
            if (shot.value > offense) {
                offense = shot.value;
                target = foe;
                aimed = shot.aimed;
                killBonus = shot.value * 1.3 >= foe.health ? 1 : 0;
            }
        }

        // incoming threat from every foe if we stand here. Use their *normal* shot: an
        // aimed shot is a gamble a foe may not take, and assuming it makes everyone turtle.
        let threat = 0;
        for (const foe of foes) {
            const dist = Battlefield.gap(spot, pos(foe));
            const cover = Battlefield.coverPenaltyAt(spot, pos(foe));
            threat += expectedNet(foe, self, dist, cover, false);
        }

        const hpFrac = self.health / Math.max(1, self.maxHealth);
        const inCover = Battlefield.nearCover(spot) ? 1 : 0;
        const nearestGap = foes.reduce((m, f) => Math.min(m, Battlefield.gap(spot, pos(f))), Infinity);
        const moveDist = Battlefield.gap(pos(self), spot);

        // anti-camp: sitting still without a real shot is penalised (scaled by temperament).
        const stationary = moveDist < 1 ? 1 : 0;
        const campPenalty = prof.camp * stationary * Math.max(0, 1 - offense / 3);

        // gunfighters keep their distance: crowding well inside the weapon's
        // preferred band is penalised, so fights hold shape instead of
        // collapsing into a point-blank knot around one crate.
        const crowding = self.weapon.weaponClass === "melee" ? 0
            : Math.max(0, preferredGap(self.weapon) * 0.6 - nearestGap) * 0.45;

        const score =
            prof.off * offense
            + prof.kill * killBonus
            + prof.cover * inCover
            - prof.def * threat * (1 + (1 - hpFrac) * prof.risk)
            - prof.progress * nearestGap
            - campPenalty
            - crowding
            - W_MOVE * moveDist;

        return {score, target, aimed};
    }
}
