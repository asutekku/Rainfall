import type {Actor} from "../actors/Actor";

/**
 * The health the board is currently showing, as opposed to the health the
 * engine has already worked out.
 *
 * A turn resolves in one synchronous burst — every shot, every point of damage
 * — and only then is the event script handed to the 3D scene, which replays it
 * over the next second or two. The HUD read straight off the live actors, so it
 * painted the finished result at the turn boundary and the arena spent the
 * following second showing you how it got there. Measured in a real fight:
 *
 *     t=12864  floater "14" on screen   row reads 21
 *     t=13889  floater "14" on screen   row reads 19   <- a different event
 *     t=14151  floater "2"  on screen   row reads 19
 *
 * The number on the board and the number in the row were never about the same
 * shot. That is what made a graze look like it did nothing, and what made the
 * killing round look like it was fired into a corpse — the row had said DYING
 * a second before the body fell.
 *
 * So the board keeps its own copy of everyone's health and the playback walks
 * it forward as each impact lands. The engine stays authoritative and stays
 * synchronous — nothing waits on a frame, and a backgrounded tab cannot stall a
 * fight — but what you watch is honest: the bar moves when the round hits.
 */
export class ShownState {
    private hp: Map<Actor, number> = new Map();

    /** Catch up to the truth. Called when a playback finishes and on every new fight. */
    public sync(actors: Actor[]): void {
        for (const a of actors) { this.hp.set(a, a.health); }
        // drop anyone no longer on the street so the map cannot grow forever
        for (const key of [...this.hp.keys()]) {
            if (actors.indexOf(key) < 0) { this.hp.delete(key); }
        }
    }

    /** What the board should draw for this unit right now. */
    public of(a: Actor): number {
        const v = this.hp.get(a);
        return v === undefined ? a.health : v;
    }

    /** True while the board still shows them standing, whatever the engine knows. */
    public up(a: Actor): boolean {
        return this.of(a) > 0 && a.alive && !a.routed;
    }

    /**
     * A round landed. Walk the shown health down by what it took.
     *
     * Reinforcements arrive mid-fight and have no entry yet, so an unknown unit
     * seeds itself from its live health first — otherwise the first hit on a
     * latecomer would be drawn against nothing.
     */
    public hit(a: Actor, damage: number): void {
        if (damage <= 0) { return; }
        const now = this.hp.has(a) ? this.hp.get(a)! : a.health + damage;
        this.hp.set(a, Math.max(0, now - damage));
    }

    /**
     * Someone was patched up. Health going the other way needs the same
     * treatment as health coming off — a medic dragging a downed merc back to
     * their feet is the one thing that moves the bar without a round landing.
     */
    public mend(a: Actor, to: number): void {
        this.hp.set(a, Math.max(this.of(a), to));
    }
}
