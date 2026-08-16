import {Medical, Scrap} from "./Scrap";
import items from "./items";

/**
 * The consumable economy: meds you actually use (from the Gear tab, between
 * fights) and street junk that exists to be fenced. Both enter play through
 * scavenging and Black Market stock — nothing here is a stat-stick.
 */

/** restorePoints is the heal amount; 999 reads as "a full patch-up". */
export const MEDS: Array<() => Medical> = [
    () => new Medical("Bandage Kit", 25, 12, "Gauze, tape, no questions asked. Heals 12 HP."),
    () => new Medical("Medi-X Injector", 60, 25, "Combat pharma in a slap-patch. Heals 25 HP."),
    () => new Medical("MaxDoc Mk.I", 160, 999, "Trauma Team's over-the-counter miracle. Full heal."),
];

/** Street-tier weighting: mostly bandages, rarely the good stuff. */
export function randomMed(): Medical {
    const r = Math.random();
    return MEDS[r < 0.6 ? 0 : r < 0.9 ? 1 : 2]!();
}

/** Pocket junk off a body — fence fodder, nothing more. */
export function randomJunk(): Scrap {
    const pool = items.filter((i) => i instanceof Scrap && i.cost > 0) as Scrap[];
    const j = pool[(Math.random() * pool.length) << 0]!;
    return new Scrap(j.name, j.cost, j.description);
}
