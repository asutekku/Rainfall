import {Actor} from "../actors/Actor";
import {Weapon} from "../items/Weapon";
import {BLAST_RADIUS, Battlefield, GRENADE_RANGE, Point} from "./battlefield";
import {QUALITY_MULT, applySoak, AIMED_EDGE, AIMED_MULT, aimedSP, coverEdge, expectedMult, outOfRange, rangeEdge, rollQuality} from "./damageModel";
import {BURN_TICK, SUPPRESS_CUT, applyStatus, clearStatus, hasStatus, incomingMult, outgoingMult,
    spDelta, stacksOf, statusEdge} from "./statuses";
import {lineGap, lineThreat} from "./loadout";
import {traitHas} from "../actors/resources/traits";

/**
 * Tactical combat AI.
 *
 * Each turn the acting unit enumerates a handful of candidate destinations
 * (hold, advance to its weapon's best range, duck to cover, flank, retreat),
 * then scores each one with a small Monte-Carlo rollout: it samples the real
 * resolution — the graze/hit/crit quality bands against the range/cover edge,
 * d6 damage, autofire multipliers, the armour soak curve — to estimate the damage
 * it would deal from there and the damage it would take in return. It picks the
 * position with the best expected trade, weighting survival higher as its own
 * HP drops. This is deliberately a "mini Monte Carlo": cheap, stochastic, and
 * good enough to play smart without a full game-tree search.
 */

export interface Plan {
    moveTo?: Point | undefined;
    target?: Actor | undefined;
    aimed?: boolean | undefined;
    /** throw ordnance at this point instead of shooting */
    grenadeAt?: Point | undefined;
    /** which grenade leaves the belt (defaults to frag) */
    grenadeType?: "frag" | "smoke" | "flash" | "emp" | undefined;
    /** all-out double move that forfeits the attack (melee closing distance) */
    sprint?: boolean | undefined;
    /** sniper telegraph: paint this target now, fire the steadied shot next turn */
    markTarget?: Actor | undefined;
    /** spend the turn patching this ally up (adjacent) */
    stabilizeTarget?: Actor | undefined;
    /** spend the turn laying plate on this ally (adjacent) */
    bolsterTarget?: Actor | undefined;
    /** netrunner quickhack on a chromed target */
    hackTarget?: Actor | undefined;
    /** hose a dug-in target with autofire to pin them */
    suppressTarget?: Actor | undefined;
    label: string;
}

const SAMPLES = 20;        // rollouts per (attacker,target) estimate
const MELEE_BASE = 12;
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

/** Body stopping power: the better of worn and subdermal. AP is applySoak's job. */
function effectiveSP(target: Actor): number {
    const worn = target.equipment.upper ? target.equipment.upper.stoppingPower : 0;
    return Math.max(0, Math.max(worn, target.cyberSP()) + spDelta(target));
}

/** The armour an aimed shot has to beat: the better of helmet and half the plate. */
function headSP(target: Actor): number {
    return aimedSP(target.equipment.headgear ? target.equipment.headgear.stoppingPower : 0,
                   effectiveSP(target));
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
function landedDamage(w: Weapon, target: Actor, aimed: boolean, mult: number,
                      attacker: Actor): number {
    const dmg = Math.round(sampleKineticDamage(w) * mult
        * outgoingMult(attacker) * incomingMult(target) * attacker.damageFactor(w));
    return aimed
        ? Math.round(applySoak(dmg, headSP(target), w.ap) * AIMED_MULT)
        : applySoak(dmg, effectiveSP(target), w.ap);
}

/** The accuracy edge a shot from `distance` through `coverDV` would carry. */
function edgeAt(attacker: Actor, target: Actor, distance: number, coverDV: number, aimed: boolean): number {
    const w = attacker.weapon;
    const base = attacker.attackBonus(w) + (aimed ? AIMED_EDGE : 0) + statusEdge(attacker);
    return w.weaponClass === "melee"
        ? base + MELEE_BASE - target.evasion()
        : base + rangeEdge(w.weaponClass, distance) + coverEdge(coverDV);
}

/** One simulated attack: net HP damage dealt (0 on a fumble / out of range / non-kinetic). */
function sampleNet(attacker: Actor, target: Actor, distance: number, coverDV: number, aimed: boolean): number {
    const w = attacker.weapon;
    if (w.damageType !== "kinetic" || w.diceThrows <= 0) { return 0; }
    if (w.weaponClass === "melee" && distance > MELEE_REACH) { return 0; }
    if (w.weaponClass !== "melee" && outOfRange(w.weaponClass, distance)) { return 0; }

    const quality = rollQuality(edgeAt(attacker, target, distance, coverDV, aimed));
    if (quality === "miss") { return 0; }

    if (w.autofire) {   // autofire can't aim; the burst multiplier reads off the band
        const maxMult = w.weaponClass === "rifle" ? 4 : 3;
        const mult = Math.min(quality === "graze" ? 1 : quality === "hit" ? 2 : maxMult, maxMult);
        return applySoak(Math.round((d6() + d6()) * mult
            * outgoingMult(attacker) * incomingMult(target) * attacker.damageFactor(w)),
            effectiveSP(target), w.ap);
    }
    return landedDamage(w, target, aimed, QUALITY_MULT[quality], attacker);
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
    // Aiming is a specialist move, and under the soak curve the old test for it
    // ("does a normal shot already punch through?") no longer means anything —
    // a normal shot always punches through something. Decide it exactly instead:
    // the placed shot hits harder and against less armour, and pays for both in
    // accuracy. Multiply the two out and take whichever is worth more. No
    // threshold to recalibrate every time the curve moves.
    const w = attacker.weapon;
    if (!TacticalAI.allowAimed || w.autofire) { return {value: normal, aimed: false}; }
    const raw = w.averageDamage() * attacker.damageFactor(w);
    const bodyValue = applySoak(raw, effectiveSP(target), w.ap)
        * expectedMult(edgeAt(attacker, target, distance, coverDV, false));
    const headValue = applySoak(raw, headSP(target), w.ap) * AIMED_MULT
        * expectedMult(edgeAt(attacker, target, distance, coverDV, true));
    if (headValue <= bodyValue) { return {value: normal, aimed: false}; }
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

/**
 * The range this weapon wants to fight at (its low-DV band, kept off
 * point-blank), scaled by the standing orders on distance.
 *
 * The line is a real commitment, not a hint: a Breacher ordered to Overwatch
 * genuinely stands too far back for a shotgun and the range falloff bills them
 * for it. That is the point — the mistake has to be visible in the numbers or
 * the dial is decoration.
 */
function preferredGap(w: Weapon, scale: number = 1): number {
    if (w.weaponClass === "melee") { return 2.5; }   // adjacent cell, not on top of the target
    return baseGap(w) * scale;
}

function baseGap(w: Weapon): number {
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

/**
 * What a turn is worth if it is simply spent shooting.
 *
 * This is the bar. Every support action in this file used to be gated by a
 * hand-written rule — "only if I'm above 35% health", "only if they're within
 * 8 metres" — which meant a medic's turn was never actually compared against
 * anything. The one exception was suppression, which already did the honest
 * thing: measure what the tactic denies and take it only when that beats what
 * shooting deals. Everything below now follows that example.
 *
 * The currency is expected HP swing: damage dealt, damage prevented and damage
 * restored are all the same number pointed in different directions, so they can
 * be compared without a fudge factor.
 *
 * The effect on whether a support class is worth a seat, over 800 fights a cell
 * with a crew of three:
 *
 *                                   3 v 3      3 v 3      3 v 4
 *                                   rank-3     rank-2     rank-3
 *     Gunner + Breacher + Marksman    41%        95%         4%
 *     Gunner + Breacher + Medtech     41%        98%         5%
 *     Gunner + Breacher + Rigger      34%        98%         4%
 *
 * A Medtech now holds a seat against a damage class outright, and beats one in
 * a fight that is actually winnable — where before this they were a Gunner with
 * worse numbers and a heal that did not exist. The Rigger still trails in the
 * hardest cell, and honestly should: plate that sheds a stack per hit is worth
 * little against damage that was going to overwhelm you anyway. Neither is a
 * trap pick any more, which was the bar.
 */
function shootingValue(self: Actor, foes: Actor[]): number {
    const here = pos(self);
    let best = 0;
    for (const f of foes) {
        const d = Battlefield.gap(here, pos(f));
        best = Math.max(best, bestNet(self, f, d, Battlefield.coverPenaltyAt(pos(f), here)).value);
    }
    return best;
}

/** Expected damage landing on this body next round, from everyone still up. */
function incomingOn(who: Actor, foes: Actor[]): number {
    const at = pos(who);
    return foes.reduce((n, f) => {
        const d = Battlefield.gap(at, pos(f));
        return n + expectedNet(f, who, d, Battlefield.coverPenaltyAt(at, pos(f)), false);
    }, 0);
}

/** Stacks of plate a bolster lays on. */
const BOLSTER_STACKS = 4;

/**
 * What plating an ally is worth, measured rather than guessed: run the same
 * incoming-damage rollout against the modified state and take the difference.
 *
 * Applying and then removing exactly the stacks we added leaves whatever they
 * already had intact, so this is a genuine what-if and not a side effect.
 */
function bolsterValue(ally: Actor, foes: Actor[]): number {
    const before = incomingOn(ally, foes);
    applyStatus(ally, "hardened", BOLSTER_STACKS);
    const after = incomingOn(ally, foes);
    clearStatus(ally, "hardened", BOLSTER_STACKS);
    return Math.max(0, before - after);
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

        // a teammate bleeding out on the pavement outranks every gunfight
        const medic = this.stabilizePlan(self, _allies, foes);
        if (medic) { return medic; }

        // a netrunner with a clear head shorts the biggest chrome in view
        const hack = this.hackPlan(self, foes);
        if (hack) { return hack; }

        // ordnance: frags on clusters, EMP on chrome, flash on knots, smoke to survive
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

        // Plating on whoever is about to need it, when that beats shooting.
        // Sits below the melee sprint on purpose: a brawler out of reach has one
        // job this turn and it is closing the distance.
        const brace = this.bolsterPlan(self, _allies, foes);
        if (brace) { return brace; }

        // snipers play their own game: paint, then fire the steadied shot
        if (self.weapon.weaponClass === "sniper") {
            const sniper = this.sniperPlan(self, foes);
            if (sniper) { return sniper; }
        }

        // A magazine of noise costs a dug-in target a third of its damage for two
        // turns. The old gate only fired when shooting was mathematically futile
        // — which nothing is any more, so the tactic had quietly become
        // unreachable. Compare the trade instead: damage denied against damage
        // dealt, and take whichever is worth more.
        if (self.weapon.autofire && self.mag >= 10) {
            const dist = Battlefield.gap(here, primary);
            const coverDV = Battlefield.coverPenaltyAt(primary, here);
            // Symmetric arithmetic: what suppressing denies them, against what
            // shooting deals. Both sides use the same rollout, so a heavy hitter
            // is worth silencing and a peashooter is worth simply shooting.
            const mine = expectedNet(self, nearest, dist, coverDV, false);
            const theirCover = Battlefield.coverPenaltyAt(here, primary);
            const denied = expectedNet(nearest, self, dist, theirCover, false) * SUPPRESS_CUT * 2;
            if (coverDV > 0 && !hasStatus(nearest, "suppressed")
                && denied > mine && Math.random() < 0.6) {
                return {suppressTarget: nearest, label: "suppress"};
            }
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
     * Field medicine: an ally is mortally wounded (or bleeding) within reach
     * and we're healthy enough to break contact — go pull them back.
     */
    private static stabilizePlan(self: Actor, allies: Actor[], foes: Actor[]): Plan | null {
        const here = pos(self);
        const hurt = allies.filter((a) => a !== self && a.alive
                && ((a.mortallyWounded && !a.routed) || (a.canFight() && a.bleeding > 0)))
            .sort((a, b) => Battlefield.gap(here, pos(a)) - Battlefield.gap(here, pos(b)))[0];
        if (!hurt) { return null; }
        const gap = Battlefield.gap(here, pos(hurt));
        if (gap > self.runMeters() + 3) { return null; }   // out of reach this turn

        // What the trip is worth: a body pulled off the pavement shoots again,
        // and a bleed stopped is damage that never lands. Both priced in the
        // same currency as the shot being given up.
        const revived = hurt.mortallyWounded ? shootingValue(hurt, foes) * 2 : 0;
        const bleedStopped = hurt.bleeding * BURN_TICK;
        const worth = revived + bleedStopped + self.healPower();
        if (worth < shootingValue(self, foes)) { return null; }

        const moveTo = gap > 3 ? pointToward(here, pos(hurt), self.runMeters()) : undefined;
        return {moveTo, stabilizeTarget: hurt, label: "medic"};
    }

    /**
     * Riggers and medics plate up whoever is about to get hit.
     *
     * The Rigger had no in-fight job at all: their armour work happened between
     * nodes, so on a street they were a Gunner with worse numbers. This is the
     * job — and it is chosen the same way suppression is, by measuring what the
     * plating actually saves against what the shot would have dealt.
     */
    private static bolsterPlan(self: Actor, allies: Actor[], foes: Actor[]): Plan | null {
        if (!self.canBolster()) { return null; }
        const here = pos(self);
        const reach = self.runMeters() + 3;
        let best: Actor | undefined;
        let bestWorth = shootingValue(self, foes);
        for (const a of allies) {
            if (a === self) { continue; }   // this is a thing you do for somebody else
            if (!a.canFight() || Battlefield.gap(here, pos(a)) > reach) { continue; }
            if (stacksOf(a, "hardened") > 0) { continue; }   // don't paint over wet paint
            const worth = bolsterValue(a, foes);
            if (worth > bestWorth) { bestWorth = worth; best = a; }
        }
        if (!best) { return null; }
        const gap = Battlefield.gap(here, pos(best));
        const moveTo = gap > 3 ? pointToward(here, pos(best), self.runMeters()) : undefined;
        return {moveTo, bolsterTarget: best, label: "brace"};
    }

    /** Netrunner Short Circuit: cooldown up, chromed target in range → burn it. */
    private static hackPlan(self: Actor, foes: Actor[]): Plan | null {
        if (!self.isNetrunner() || self.hackCooldown > 0) { return null; }
        const here = pos(self);
        const chromed = foes.filter((f) => f.chromed() && Battlefield.gap(here, pos(f)) <= 25)
            .sort((a, b) => (b.rank || 1) - (a.rank || 1))[0];
        if (!chromed) { return null; }
        return {hackTarget: chromed, label: "hack"};
    }

    /**
     * Sniper doctrine: fire the steadied shot at a live laser lock, otherwise
     * pick the juiciest target, settle into cover if there's some close by,
     * and paint it — the visible telegraph IS the counterplay window.
     */
    private static sniperPlan(self: Actor, foes: Actor[]): Plan | null {
        const here = pos(self);
        const locked = self.marking && self.marking.canFight()
            && !Battlefield.inSmoke(pos(self.marking)) ? self.marking : null;
        if (locked) {
            const dist = Battlefield.gap(here, pos(locked));
            const cover = Battlefield.coverPenaltyAt(pos(locked), here);
            return {target: locked, aimed: bestNet(self, locked, dist, cover).aimed, label: "deadeye"};
        }
        // best expected-damage target from where we stand — a laser can't paint
        // through a smoke cloud, so smoked targets are off the menu
        let mark: Actor | undefined;
        let best = -1;
        for (const foe of foes) {
            if (Battlefield.inSmoke(pos(foe))) { continue; }
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

    /** The best cluster point for a blast of `radius`, with friendlies kept clear. */
    private static clusterPoint(self: Actor, allies: Actor[], foes: Actor[],
                                radius: number, minCaught: number,
                                eligible: (f: Actor) => boolean = () => true): Point | null {
        const here = pos(self);
        const pool = foes.filter(eligible);
        const points: Point[] = pool.map(pos);
        for (let i = 0; i < pool.length; i++) {
            for (let j = i + 1; j < pool.length; j++) {
                const a = pos(pool[i]!), b = pos(pool[j]!);
                if (Battlefield.gap(a, b) <= radius * 1.8) {
                    points.push({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
                }
            }
        }
        let best: Point | null = null;
        let bestCaught = minCaught - 1;
        for (const p of points) {
            if (Battlefield.gap(here, p) > GRENADE_RANGE) { continue; }
            const friendlyClose = [self, ...allies].some((a) =>
                a.canFight() && Battlefield.gap(pos(a), p) <= radius + 2);
            if (friendlyClose) { continue; }
            const caught = pool.filter((f) => Battlefield.gap(pos(f), p) <= radius).length;
            if (caught > bestCaught) { bestCaught = caught; best = p; }
        }
        return best;
    }

    /**
     * Ordnance doctrine, in priority order: EMP a chromed knot (or one big
     * borg), frag a cluster, flashbang a cluster when frags are out, and pop
     * defensive smoke when hurt in the open.
     */
    private static grenadePlan(self: Actor, allies: Actor[], foes: Actor[]): Plan | null {
        if ((self.emps || 0) > 0) {
            // EMP earns its slot on a single chromed heavy, not just clusters
            const emp = this.clusterPoint(self, allies, foes, BLAST_RADIUS - 1, 1,
                (f) => f.chromed() && ((f.rank || 1) >= 4 || foes.filter((o) => o.chromed()).length >= 2));
            if (emp) { return {grenadeAt: emp, grenadeType: "emp", label: "emp"}; }
        }
        if ((self.grenades || 0) > 0) {
            const frag = this.clusterPoint(self, allies, foes, BLAST_RADIUS, 2);
            if (frag) { return {grenadeAt: frag, grenadeType: "frag", label: "frag"}; }
        }
        if ((self.flashes || 0) > 0) {
            const flash = this.clusterPoint(self, allies, foes, BLAST_RADIUS - 1, 2);
            if (flash) { return {grenadeAt: flash, grenadeType: "flash", label: "flash"}; }
        }
        if ((self.smokes || 0) > 0) {
            // hurting and exposed: disappear behind a cloud where you stand
            const here = pos(self);
            if (self.health < self.maxHealth * 0.5
                && !Battlefield.nearCover(here) && !Battlefield.inSmoke(here)) {
                return {grenadeAt: {x: here.x, y: here.y}, grenadeType: "smoke", label: "smoke"};
            }
        }
        return null;
    }

    /** Candidate destinations reachable this turn. */
    private static candidates(self: Actor, here: Point, primary: Point, foes: Actor[], run: number): Point[] {
        const want = preferredGap(self.weapon, lineGap(self));
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
        // Target choice is weighted by how much each foe is *asking* to be shot:
        // whoever is holding the front line draws fire off the people behind
        // them. The score still uses the true expected damage — only the pick
        // between equally juicy targets is biased.
        let bestPick = 0;
        for (const foe of foes) {
            const dist = Battlefield.gap(spot, pos(foe));
            const cover = Battlefield.coverPenaltyAt(pos(foe), spot);
            const shot = bestNet(self, foe, dist, cover);
            // Tunnel Vision finishes what it started: the current target keeps a
            // thumb on the scale until it goes down.
            const stuck = traitHas(self.traits, "sticky") && self.marking === foe ? 1.6 : 1;
            const pick = shot.value * lineThreat(foe) * stuck;
            if (pick > bestPick) {
                bestPick = pick;
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
            - prof.def * self.caution() * threat * (1 + (1 - hpFrac) * prof.risk)
            - prof.progress * nearestGap
            - campPenalty
            - crowding
            - W_MOVE * moveDist;

        return {score, target, aimed};
    }
}
