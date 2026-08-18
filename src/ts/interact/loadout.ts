import {Actor} from "../actors/Actor";

/**
 * What the player decides now that they no longer aim the guns.
 *
 * Combat plays itself, so every auto battler worth the name moves the whole
 * decision into the minute before the shooting: Super Auto Pets is bought and
 * arranged and then watched, Slice & Dice shows the enemy's intent before you
 * commit, Backpack Battles *is* the packing. The fight is where you find out
 * whether you were right, not where you get to change your mind.
 *
 * Two dials, both spent before the first round:
 *
 *   stance — how each of the crew fights. This is not new machinery; the
 *            tactical AI has always run on temperament profiles, and every
 *            hostile on the street has one. The crew's were rolled and never
 *            shown. Now you set them.
 *
 *   kit    — up to two pieces of ordnance out of the crew's crate, each handed
 *            to a named body. The engine already knows how to use all four:
 *            frags into a cluster, flashbangs to stun one, EMP onto a chromed
 *            heavy, smoke when someone is hurt and caught in the open. What was
 *            missing was any way for the player to decide which of those the
 *            squad walks in carrying.
 *
 * Deliberately no mid-fight buttons. The point is a plan you commit to, not a
 * fight you micromanage from the sideline.
 */

// -------------------------------------------------------------- the crew --

/**
 * How many bodies walk onto a street. Four is what the encounter tables, the
 * field cap and the battle HUD are all built around, and it stays four.
 */
export const SQUAD_CAP = 4;

/**
 * How many the crew can carry on the payroll.
 *
 * This used to be the same number as SQUAD_CAP, which meant the roster was
 * never a decision: whoever you owned, you deployed. Two more slots than seats
 * is the smallest change that makes staging ask a question — the hurt Veteran
 * or the untouched Rookie — and it is a question the forecast is already
 * equipped to answer, since the odds readout moves the moment you bench
 * somebody.
 *
 * Six rather than eight on purpose. The payroll is paid out of the same purse
 * as guns and armour, so every slot past four is a body you are feeding
 * instead of a weapon you are buying; at six that trade still stings, which is
 * what keeps it a choice.
 */
export const ROSTER_CAP = 6;

// ------------------------------------------------------------------ stance --

export type Stance = "push" | "steady" | "hold";

export interface StanceSpec {
    label: string;
    /** the tactical-AI profile it selects (see tacticalAI.PROFILES) */
    temperament: string;
    /** damage this unit deals, multiplied */
    out: number;
    /** damage this unit takes, multiplied */
    incoming: number;
    /** one line, in the language of the street, for the button */
    blurb: string;
    /** the trade in numbers, printed on the chip: damage out, then damage in */
    trade: [string, string];
}

/**
 * The three sets of orders, and what each one costs.
 *
 * The temperament alone was not enough. Forcing a whole crew onto one AI
 * profile and running 500 fights per cell moved the win rate by 2-6pp with no
 * consistent sign — inside the noise at that sample size. Positioning weights
 * matter at the margins in an engine where everyone shoots every round anyway,
 * so a stance picker built on temperament alone would have been a screen full
 * of buttons that did nothing: worse than not asking.
 *
 * So each stance carries a real trade on top of the profile, in the same
 * multipliers the statuses already run through. The trades are symmetric, which
 * is what stops any one of them being simply correct: what decides the answer
 * is the objective. Measured over 600 fights a cell —
 *
 *                        push   steady   hold
 *     firefight, crew 2   28%     26%     28%
 *     firefight, crew 4   80%     75%     72%
 *     elite, crew 4       50%     44%     42%
 *     boss, crew 3        88%     85%     79%
 *     holdout 4, crew 2   31%     42%     59%
 *     holdout 4, crew 3   42%     55%     72%
 *
 * — sweeping a street rewards Push, and rewards it more the more bodies you
 * have to sweep with; surviving a clock rewards Hold, by thirty points. The
 * staging screen already says which of the two this fight is, so the read is
 * there to be made. Steady is the hedge: never the best answer, never a
 * disaster, and the right pick when you do not trust the read.
 */
export const STANCES: { [k in Stance]: StanceSpec } = {
    push: {label: "Push", temperament: "aggressive", out: 1.3, incoming: 1.3,
           blurb: "close the gap and end it fast — best when you have the bodies",
           trade: ["+30% out", "+30% in"]},
    steady: {label: "Steady", temperament: "balanced", out: 1, incoming: 1,
             blurb: "work the range, use cover when it's on the way",
             trade: ["even out", "even in"]},
    hold: {label: "Hold", temperament: "camper", out: 0.75, incoming: 0.75,
           blurb: "dig in and let them come — best against a clock",
           trade: ["−25% out", "−25% in"]},
};

/** Damage this unit deals, scaled by its standing orders. */
export function stanceOut(a: Actor): number {
    const s = a.stance ? (STANCES as { [k: string]: StanceSpec })[a.stance] : null;
    return s ? s.out : 1;
}

/** Damage this unit takes, scaled by its standing orders. */
export function stanceIn(a: Actor): number {
    const s = a.stance ? (STANCES as { [k: string]: StanceSpec })[a.stance] : null;
    return s ? s.incoming : 1;
}

export const STANCE_ORDER: Stance[] = ["push", "steady", "hold"];

/** Which button should already be lit when the screen opens. */
export function stanceOf(a: Actor): Stance {
    const t = a.temperament;
    if (t === "aggressive" || t === "berserker") { return "push"; }
    if (t === "camper") { return "hold"; }
    return "steady";
}

// -------------------------------------------------------------- the line --

/**
 * Where a body is told to stand.
 *
 * Stance says how hard they fight; the line says from how far. The two are
 * separate because they trade against different things: stance buys damage
 * with damage, and the line buys accuracy with exposure — and the range bands
 * already price the second one without any new arithmetic. A shotgun's sweet
 * spot is 0-12m and a sniper's starts at 25m, so a Marksman sent to point and a
 * Breacher sent to overwatch are both making a mistake the damage model can
 * see, which is exactly the kind of mistake worth letting a player make.
 *
 * Distance alone was not enough — the same lesson the stance dial had to learn.
 * Scaling the standoff and nothing else moved win rates 4-5pp with no consistent
 * sign, because a squad's incoming damage per round is roughly fixed: everybody
 * shoots, so standing further back only means somebody else gets shot.
 *
 * So the line also decides *who they shoot* (see `threat`). That makes it a real
 * trade, and it only pays when the bodies absorb differently — which is exactly
 * what factions now guarantee. Measured over 800 fights a cell, with a plate
 * Bulwark (SP 12), a ghost Marksman (SP 5) and a Gunner (SP 11) —
 *
 *                              bulwark   all    marksman
 *                              on point  mid    on point
 *     crew 3 v 3 rank-3           29%    19%      22%
 *     crew 3 v 3 rank-2           89%    81%      79%
 *     crew 3 v 2 rank-3           94%    93%      93%
 *
 * — ten points for putting the right body out front in a fight that is actually
 * in doubt, and nothing at all in one that isn't, which is how a dial should
 * behave. Note the first column is only available to a crew that HAS a plate
 * body to put there: the line dial and faction kit are one feature in two
 * halves, and neither is worth much alone.
 *
 * Defaults come from the class, so the screen opens on orders that already make
 * sense and the dial is there for the fights where they don't.
 */
export type Line = "point" | "mid" | "overwatch";

export interface LineSpec {
    label: string;
    /** multiplier on the weapon's preferred standoff distance */
    gap: number;
    /**
     * How much the enemy AI wants to shoot this one.
     *
     * This is the half that makes the dial a decision rather than a nudge.
     * Distance alone moved win rates 4-5pp — the same "inside the noise" trap
     * the stance dial fell into before it was given a real trade. Drawing fire
     * is the trade the line was always about: the body at the front is the body
     * they shoot, and the one hanging back is the one they don't.
     *
     * It is also the tank, arriving for free. A Bulwark on point with four
     * points of plate is not asserted to be a tank by a stat — the enemy
     * targeting genuinely prefers them, and the plate is what makes that a good
     * trade for you rather than a bad one.
     */
    threat: number;
    blurb: string;
    /** the trade, printed on the chip */
    trade: [string, string];
}

export const LINES: { [k in Line]: LineSpec } = {
    point: {label: "Point", gap: 0.55, threat: 1.6,
            blurb: "walk it in and draw the fire — they will shoot you first",
            trade: ["close", "shot at"]},
    mid: {label: "Mid", gap: 1, threat: 1,
          blurb: "the range the weapon was built for",
          trade: ["sweet spot", "even"]},
    overwatch: {label: "Overwatch", gap: 1.7, threat: 0.6,
                blurb: "hang back — harder to reach, and further out than the gun likes",
                trade: ["far", "ignored"]},
};

export const LINE_ORDER: Line[] = ["point", "mid", "overwatch"];

/** Which line button should already be lit: the one this class fights on. */
export function lineOf(a: Actor): Line {
    if (a.line && (LINES as { [k: string]: LineSpec })[a.line]) { return a.line as Line; }
    return (a.role && a.role.line) || "mid";
}

/** How much enemy targeting wants this body: >1 draws fire, <1 deflects it. */
export function lineThreat(a: Actor): number {
    const spec = a.line ? (LINES as { [k: string]: LineSpec })[a.line] : null;
    return spec ? spec.threat : LINES[(a.role && a.role.line) || "mid"].threat;
}

/** The multiplier the AI applies to its weapon's preferred standoff. */
export function lineGap(a: Actor): number {
    const spec = a.line ? (LINES as { [k: string]: LineSpec })[a.line] : null;
    return spec ? spec.gap : LINES[(a.role && a.role.line) || "mid"].gap;
}

// --------------------------------------------------------------------- kit --

export type KitId = "frag" | "smoke" | "flash" | "emp";

export interface Kit { frag: number; smoke: number; flash: number; emp: number; }

export interface KitSpec {
    label: string;
    glyph: string;
    /** what it does, in one line the player can act on */
    blurb: string;
    /** when the AI will actually spend it — the player is picking a trigger, not a button */
    when: string;
    cost: number;
}

export const KIT: { [k in KitId]: KitSpec } = {
    frag: {label: "Frag", glyph: "◉", cost: 120,
           blurb: "6d6 in a blast radius, armour halved",
           when: "thrown into two or more of them standing together"},
    flash: {label: "Flashbang", glyph: "✸", cost: 140,
            blurb: "stuns everyone caught in the burst — a lost turn each",
            when: "thrown into two or more of them standing together"},
    emp: {label: "EMP", glyph: "⌁", cost: 160,
          blurb: "burns chrome out: no cyber armour, no reflexes, no aim",
          when: "saved for a chromed heavy, or a street full of chrome"},
    smoke: {label: "Smoke", glyph: "☁", cost: 90,
            blurb: "a cloud that spoils shots and breaks every laser lock through it",
            when: "popped by whoever is hurt and caught in the open"},
};

export const KIT_ORDER: KitId[] = ["frag", "flash", "emp", "smoke"];

/**
 * How many pieces of ordnance go out on one job.
 *
 * Two is the number that makes it a choice. One is a formality — you bring the
 * frag every time — and four is the whole crate, which is not a decision at all,
 * just a chore. Two means an EMP for the chromed heavy costs you the frag.
 */
export const KIT_PICKS = 2;

export function emptyKit(): Kit {
    return {frag: 0, smoke: 0, flash: 0, emp: 0};
}

/** What a crew opens a career with: enough to matter, not enough to lean on. */
export function startingKit(): Kit {
    return {frag: 2, smoke: 1, flash: 0, emp: 0};
}

export function kitTotal(k: Kit): number {
    return k.frag + k.smoke + k.flash + k.emp;
}

/** A save written before the crate existed comes back without one. */
export function reviveKit(k: Partial<Kit> | undefined | null): Kit {
    return {frag: k && k.frag || 0, smoke: k && k.smoke || 0,
            flash: k && k.flash || 0, emp: k && k.emp || 0};
}

// -------------------------------------------------------------- the orders --

/** One piece of ordnance, and who is carrying it in. */
export interface KitPick { item: KitId; carrier: Actor; }

/** Everything the staging screen decides, handed to the engine in one go. */
export interface Deployment {
    /**
     * Who walks onto the street, in order, your character first.
     *
     * The payroll can hold more bodies than there are seats, so this is a
     * genuine subset and not a formality: the hurt Veteran or the fresh Rookie
     * is the first real question staging asks.
     */
    squad: Actor[];
    stances: Array<{ actor: Actor; stance: Stance }>;
    /** Standing orders on distance, per deploying body. */
    lines: Array<{ actor: Actor; line: Line }>;
    picks: KitPick[];
}

/**
 * Hand the orders to the squad: stances onto the AI profiles, ordnance onto
 * belts, and the crate debited for what walked out of it.
 */
export function issue(plan: Deployment, crate: Kit): void {
    plan.stances.forEach(({actor, stance}) => {
        const spec = STANCES[stance];
        if (!spec) { return; }
        actor.temperament = spec.temperament;
        actor.stance = stance;
    });
    plan.lines.forEach(({actor, line}) => {
        if (LINES[line]) { actor.line = line; }
    });
    plan.picks.forEach(({item, carrier}) => {
        if (crate[item] <= 0) { return; }
        crate[item] -= 1;
        if (item === "frag") { carrier.grenades += 1; }
        else if (item === "smoke") { carrier.smokes += 1; }
        else if (item === "flash") { carrier.flashes += 1; }
        else { carrier.emps += 1; }
    });
}

/**
 * The fight is over: whatever is still on a belt goes back in the crate.
 *
 * Ordnance is spent when it is thrown, not when it is picked, so bringing smoke
 * you never needed costs nothing. Anything a body was still carrying when they
 * went down is lost with them — the street keeps it.
 */
export function stow(party: Actor[], crate: Kit): void {
    party.forEach((a) => {
        if (a.canFight()) {
            crate.frag += a.grenades;
            crate.smoke += a.smokes;
            crate.flash += a.flashes;
            crate.emp += a.emps;
        }
        a.grenades = 0; a.smokes = 0; a.flashes = 0; a.emps = 0;
    });
}
