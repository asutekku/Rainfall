import {traitSum} from "../actors/resources/traits";
import {Actor} from "../actors/Actor";
import {Kit, startingKit} from "./loadout";

/**
 * The crew's shared purse.
 *
 * Eddies used to sit in each actor's pocket, which stopped making sense once
 * the squad became "your character plus hired help": kills paid whoever landed
 * the shot, and a merc could be rich while the character who hired them was
 * broke. One pot instead — every payday lands in it, and hires, kit and
 * Trauma Team bills all come out of it.
 *
 * Hostiles keep their own `currency`, because for them it is only ever a drop
 * value waiting to be looted. `Purse` is the seam: it routes an actor to the
 * crew pot or to its own pocket, so callers don't have to know which side of
 * the fight they're on.
 */
export class Crew {

    /** The purse the running game is spending from (null before a crew exists). */
    public static active: Crew | null = null;

    /**
     * Eddies a fresh run starts with. Enough to arm the pair you open with *or*
     * put a Pro on the payroll — the first real decision of a run. Tuned up from
     * 500¥ after playtesting: a crew that can't afford a weapon that beats SP 7
     * turns every early firefight into a twenty-round grind.
     */
    public static readonly STARTING_FUNDS: number = 1200;

    public funds: number;

    /**
     * The ordnance crate. Grenades used to live permanently on belts, which
     * meant they were never a decision — whatever you were carrying went to
     * every fight. Held here instead, they are drawn at staging, two per job,
     * and what comes back goes in the crate. Shared like the purse, and for the
     * same reason: it belongs to the crew, not to whoever happened to buy it.
     */
    public kit: Kit;

    constructor(funds: number = Crew.STARTING_FUNDS, kit: Kit = startingKit()) {
        this.funds = Math.max(0, Math.floor(funds));
        this.kit = kit;
    }

    /** Make this the purse every static helper spends from. */
    public activate(): Crew {
        Crew.active = this;
        return this;
    }

    public canAfford(cost: number): boolean {
        return this.funds >= cost;
    }

    public earn(amount: number): number {
        const gain = Math.max(0, Math.floor(amount));
        this.funds += gain;
        return gain;
    }

    /** Spend if the pot covers it; returns false and spends nothing if it doesn't. */
    public spend(cost: number): boolean {
        if (!this.canAfford(cost)) { return false; }
        this.funds -= Math.max(0, Math.floor(cost));
        return true;
    }

    /** Take what's there up to `cost` (a bill that can't be refused). Returns what was taken. */
    public garnish(cost: number): number {
        const paid = Math.min(this.funds, Math.max(0, Math.floor(cost)));
        this.funds -= paid;
        return paid;
    }
}

/**
 * Where an actor's money lives: the crew pot for the player side, the actor's
 * own pocket for hostiles (and for the player side too if no crew is active,
 * which keeps the headless sim and any legacy path working).
 */
export class Purse {

    private static crewOf(actor: Actor): Crew | null {
        return actor.faction ? null : Crew.active;
    }

    public static balance(actor: Actor): number {
        const crew = this.crewOf(actor);
        return crew ? crew.funds : actor.currency;
    }

    public static earn(actor: Actor, amount: number): number {
        // "Owes the Wrong People": a slice of every payday goes somewhere else
        // before it reaches the crate. The discount on their fee is what pays
        // for it, so the trade is up front rather than a nasty surprise.
        const skim = traitSum(actor.traits, "payCut");
        if (skim > 0) { amount = amount * Math.max(0, 1 - skim); }
        const crew = this.crewOf(actor);
        if (crew) { return crew.earn(amount); }
        const gain = Math.max(0, Math.floor(amount));
        actor.currency += gain;
        return gain;
    }

    public static canAfford(actor: Actor, cost: number): boolean {
        return this.balance(actor) >= cost;
    }

    public static spend(actor: Actor, cost: number): boolean {
        const crew = this.crewOf(actor);
        if (crew) { return crew.spend(cost); }
        if (actor.currency < cost) { return false; }
        actor.currency -= Math.max(0, Math.floor(cost));
        return true;
    }

    /** Take what's available up to `cost`. Returns what was actually taken. */
    public static garnish(actor: Actor, cost: number): number {
        const crew = this.crewOf(actor);
        if (crew) { return crew.garnish(cost); }
        const paid = Math.min(actor.currency, Math.max(0, Math.floor(cost)));
        actor.currency -= paid;
        return paid;
    }
}
