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
    stances: Array<{ actor: Actor; stance: Stance }>;
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
