/**
 * Enemy archetypes — Cyberpunk RED factions across a difficulty ladder (rank 1-5).
 *
 * Stats follow RED conventions: attributes 2-8 (peak human 8), skill levels
 * 2 novice / 4 competent / 6 professional / 8 expert / 10 master; HP derives
 * from BODY+WILL. Armour SP uses the RED ladder (Leather 4, Kevlar 7, Light
 * Armorjack 11, Medium 12, Heavy 13, Flak 15, MetalGear 18). `headSP` of 0
 * means no helmet — an Aimed head shot bypasses body/subdermal armour, which
 * is how you crack the heavily-armoured factions.
 */
export interface Archetype {
    faction: string;
    title: string;        // archetype role within the faction
    rank: number;         // 1 mook .. 5 boss
    cls: string;          // combat class id — what they do on a street (see classes.ts)
    ref: number; dex: number; body: number; will: number;
    skill: number; luck: number;
    bodySP: number; headSP: number;
    weapons: string[];    // weaponClass pool to draw from
    minDice: number;      // floor on the weapon's d6 count (0 = any)
    temperament: string;  // "roll" = derive from the drawn weapon
    reward: number;       // eddies / XP multiplier
    frags?: number;       // guaranteed grenades on deploy (grenadier kit)
    smokes?: number;      // smoke grenades on deploy
    flashes?: number;     // flashbangs on deploy
    emps?: number;        // EMP charges on deploy (chrome-killers)
    parts?: string[];     // extra silhouette parts on top of the faction kit
    ability?: string;     // rank-5 signature move ("leap" | "volley")
}

export const ARCHETYPES: Archetype[] = [
    // ---- Rank 1: street mooks (SP 0-7, HP ~30-35) ----
    {faction: "Street", title: "Punk", cls: "enforcer", rank: 1, ref: 4, dex: 4, body: 5, will: 4, skill: 2, luck: 2,
        bodySP: 4, headSP: 0, weapons: ["pistol", "melee"], minDice: 0, temperament: "roll", reward: 1},
    {faction: "Scav", title: "Harvester", cls: "enforcer", rank: 1, ref: 4, dex: 5, body: 4, will: 3, skill: 2, luck: 2,
        bodySP: 0, headSP: 0, weapons: ["melee", "pistol"], minDice: 0, temperament: "aggressive", reward: 1},
    {faction: "Bozos", title: "Booster", cls: "gunner", rank: 1, ref: 5, dex: 5, body: 5, will: 4, skill: 3, luck: 3,
        bodySP: 7, headSP: 0, weapons: ["pistol", "smg"], minDice: 0, temperament: "aggressive", reward: 1},

    // ---- Rank 2: gangers (SP 0-10, HP ~35-45) ----
    {faction: "Animals", title: "Bruiser", cls: "enforcer", rank: 2, ref: 5, dex: 6, body: 8, will: 6, skill: 4, luck: 2,
        bodySP: 0, headSP: 0, weapons: ["melee"], minDice: 3, temperament: "berserker", reward: 2},
    // SP 9, not 11. Armour is a damage multiplier, not a subtraction, so a point
    // of it is worth far more than the ladder in the header suggests: SP 11
    // nearly triples a body's effective health where SP 4 adds two thirds. These
    // two wore rank 3's plate on rank 2's pay, and it showed — a themed Tyger
    // Claws or Maelstrom wave was a 56-64% fight for a crew of three where the
    // rest of the rank ran 86-100%.
    {faction: "Tyger Claws", title: "Enforcer", cls: "enforcer", rank: 2, ref: 7, dex: 7, body: 5, will: 5, skill: 5, luck: 3,
        bodySP: 9, headSP: 0, weapons: ["melee"], minDice: 2, temperament: "flanker", reward: 2},
    {faction: "Maelstrom", title: "Raider", cls: "gunner", rank: 2, ref: 5, dex: 5, body: 7, will: 6, skill: 4, luck: 3,
        bodySP: 10, headSP: 0, weapons: ["smg", "pistol"], minDice: 0, temperament: "aggressive", reward: 2},
    {faction: "Wraiths", title: "Raider", cls: "breacher", rank: 2, ref: 5, dex: 5, body: 6, will: 5, skill: 4, luck: 3,
        bodySP: 7, headSP: 4, weapons: ["shotgun", "rifle"], minDice: 0, temperament: "aggressive",
        reward: 2, smokes: 1},

    // ---- Rank 3: elites (SP 11-13, HP ~40-45) ----
    // The Ghoul was filed under rank 2 while being paid rank-3 money — and it
    // fought like the money: 45 HP behind SP 11, closing to melee, in a rank
    // whose other members average 39 HP. A themed Chrome wave was a 5% fight for
    // an opening squad and a 38% one for a crew of three, against 71-95% for the
    // rest of rank 2. It is a rank-3 body; this is where it goes.
    {faction: "Chrome", title: "Ghoul", cls: "enforcer", rank: 3, ref: 6, dex: 7, body: 7, will: 6, skill: 4, luck: 1,
        bodySP: 11, headSP: 0, weapons: ["melee"], minDice: 2, temperament: "berserker", reward: 3},
    {faction: "6th Street", title: "Veteran", cls: "gunner", rank: 3, ref: 6, dex: 6, body: 6, will: 6, skill: 6, luck: 4,
        bodySP: 11, headSP: 7, weapons: ["rifle", "smg"], minDice: 0, temperament: "flanker",
        reward: 3, smokes: 1},
    {faction: "Maelstrom", title: "Bombardier", cls: "breacher", rank: 3, ref: 6, dex: 6, body: 7, will: 6, skill: 5, luck: 3,
        bodySP: 12, headSP: 0, weapons: ["smg", "shotgun"], minDice: 0, temperament: "aggressive",
        reward: 4, frags: 2, parts: ["bandolier"]},
    {faction: "Tyger Claws", title: "Blademaster", cls: "enforcer", rank: 3, ref: 8, dex: 8, body: 6, will: 6, skill: 7, luck: 4,
        bodySP: 11, headSP: 0, weapons: ["melee"], minDice: 3, temperament: "berserker", reward: 3},
    {faction: "Maelstrom", title: "Reaver", cls: "gunner", rank: 3, ref: 6, dex: 6, body: 8, will: 7, skill: 6, luck: 3,
        bodySP: 13, headSP: 0, weapons: ["smg", "rifle", "melee"], minDice: 0, temperament: "berserker", reward: 3},
    {faction: "Arasaka", title: "Lanceman", cls: "gunner", rank: 3, ref: 7, dex: 6, body: 6, will: 7, skill: 7, luck: 4,
        bodySP: 12, headSP: 11, weapons: ["rifle", "smg"], minDice: 0, temperament: "flanker",
        reward: 4, flashes: 1},
    {faction: "Wraiths", title: "Deadeye", cls: "marksman", rank: 3, ref: 8, dex: 6, body: 5, will: 6, skill: 6, luck: 3,
        bodySP: 7, headSP: 4, weapons: ["sniper"], minDice: 4, temperament: "camper",
        reward: 4, smokes: 1},

    // ---- Rank 4: heavies (SP 13-15, HP ~45-55) ----
    {faction: "Militech", title: "Trooper", cls: "gunner", rank: 4, ref: 7, dex: 7, body: 7, will: 7, skill: 8, luck: 5,
        bodySP: 15, headSP: 11, weapons: ["rifle"], minDice: 4, temperament: "flanker", reward: 6},
    {faction: "Trauma Team", title: "Operator", cls: "medtech", rank: 4, ref: 7, dex: 7, body: 7, will: 7, skill: 7, luck: 5,
        bodySP: 15, headSP: 11, weapons: ["smg", "rifle"], minDice: 0, temperament: "flanker",
        reward: 6, flashes: 1},
    {faction: "Chrome", title: "Juggernaut", cls: "bulwark", rank: 4, ref: 6, dex: 6, body: 9, will: 7, skill: 6, luck: 2,
        bodySP: 15, headSP: 0, weapons: ["shotgun", "rifle"], minDice: 3, temperament: "aggressive", reward: 8},
    {faction: "Cyberpsycho", title: "Rampage", cls: "enforcer", rank: 4, ref: 7, dex: 7, body: 9, will: 8, skill: 6, luck: 3,
        bodySP: 13, headSP: 0, weapons: ["melee", "rifle"], minDice: 3, temperament: "berserker", reward: 7},
    {faction: "Arasaka", title: "Marksman", cls: "marksman", rank: 4, ref: 8, dex: 7, body: 6, will: 7, skill: 8, luck: 4,
        bodySP: 12, headSP: 11, weapons: ["sniper"], minDice: 4, temperament: "camper", reward: 7},
    {faction: "Militech", title: "Grenadier", cls: "breacher", rank: 4, ref: 7, dex: 6, body: 8, will: 7, skill: 7, luck: 4,
        bodySP: 15, headSP: 11, weapons: ["shotgun", "rifle"], minDice: 0, temperament: "aggressive",
        reward: 7, frags: 2, parts: ["bandolier"]},

    // ---- Rank 5: bosses (SP 15-18, HP ~55-60) ----
    {faction: "MaxTac", title: "Officer", cls: "gunner", rank: 5, ref: 8, dex: 8, body: 8, will: 8, skill: 9, luck: 6,
        bodySP: 15, headSP: 13, weapons: ["rifle", "smg"], minDice: 0, temperament: "flanker",
        reward: 10, flashes: 1, emps: 1, ability: "volley"},
    {faction: "Cyberpsycho", title: "Terror", cls: "enforcer", rank: 5, ref: 8, dex: 8, body: 10, will: 9, skill: 8, luck: 4,
        bodySP: 15, headSP: 0, weapons: ["melee", "rifle"], minDice: 4, temperament: "berserker",
        reward: 12, ability: "leap"},
    {faction: "Chrome", title: "Dragoon", cls: "bulwark", rank: 5, ref: 8, dex: 7, body: 10, will: 8, skill: 8, luck: 2,
        bodySP: 18, headSP: 13, weapons: ["rifle"], minDice: 4, temperament: "flanker",
        reward: 14, ability: "volley"},
];

/** The rank spread appropriate to a given party level (weighted by frequency). */
function rankBand(level: number): number[] {
    if (level <= 2) { return [1, 1, 1, 2]; }
    if (level <= 4) { return [1, 1, 2, 2, 3]; }
    if (level <= 7) { return [1, 2, 2, 3, 3]; }
    if (level <= 10) { return [2, 2, 3, 3, 4]; }
    if (level <= 13) { return [2, 3, 3, 4, 4, 5]; }
    return [3, 3, 4, 4, 5, 5];
}

/** Pick a random archetype scaled to the party's level. */
export function pickArchetype(level: number): Archetype {
    const band = rankBand(level);
    const rank = band[(Math.random() * band.length) << 0];
    const pool = ARCHETYPES.filter((a) => a.rank === rank);
    return pool[(Math.random() * pool.length) << 0]!;
}

/** Pick a random archetype of an exact rank (for forced elites / bosses). */
export function pickArchetypeOfRank(rank: number): Archetype {
    const pool = ARCHETYPES.filter((a) => a.rank === rank);
    return (pool.length ? pool[(Math.random() * pool.length) << 0] : ARCHETYPES[0])!;
}

/**
 * Pick ONE faction for a themed encounter: a faction that fields at least one
 * archetype inside the level's rank band, so a whole wave can be drawn from it.
 * A Maelstrom fight should feel like Maelstrom, not a grab-bag.
 *
 * Weighted by how much of the band the faction can actually serve, which is the
 * only thing that keeps the band meaning what it says. Drawn flat, it did not:
 * a wave is themed, so the faction decides the ranks, and at level 1 — band
 * [1,1,1,2], nominally three mooks to one ganger — five of the eight eligible
 * factions field nothing but rank 2. Sixty-two percent of sector-1 waves came
 * out as full ganger squads: three Maelstrom Raiders on 45 HP behind SP 12,
 * against the two bodies a run opens with. The band asked for a quarter.
 */
export function pickFaction(level: number): string {
    const band = rankBand(level);
    const factions = [...new Set(ARCHETYPES.filter((a) => band.indexOf(a.rank) >= 0)
        .map((a) => a.faction))];
    if (!factions.length) { return ARCHETYPES[0]!.faction; }
    // a faction's weight is the number of band slots it can field a body for
    const weights = factions.map((f) => band.filter((r) =>
        ARCHETYPES.some((a) => a.faction === f && a.rank === r)).length);
    const total = weights.reduce((n, w) => n + w, 0);
    if (total <= 0) { return factions[(Math.random() * factions.length) << 0]!; }
    let roll = Math.random() * total;
    for (let i = 0; i < factions.length; i++) {
        roll -= weights[i]!;
        if (roll <= 0) { return factions[i]!; }
    }
    return factions[factions.length - 1]!;
}

/** Pick an archetype from a specific faction, weighted toward the level's rank band. */
export function pickArchetypeFrom(faction: string, level: number): Archetype {
    const band = rankBand(level);
    const pool = ARCHETYPES.filter((a) => a.faction === faction);
    if (!pool.length) { return pickArchetype(level); }
    // weight each archetype by how often its rank appears in the band
    const weighted: Archetype[] = [];
    for (const a of pool) {
        const w = band.filter((r) => r === a.rank).length;
        for (let i = 0; i < Math.max(0, w); i++) { weighted.push(a); }
    }
    const bag = weighted.length ? weighted : pool;
    return bag[(Math.random() * bag.length) << 0]!;
}

/** Factions that field an archetype of the exact rank (for themed elite waves). */
export function factionsOfRank(rank: number): string[] {
    return [...new Set(ARCHETYPES.filter((a) => a.rank === rank).map((a) => a.faction))];
}

/** An archetype of exactly `rank` from `faction` (any-rank fallback keeps spawns safe). */
export function pickRankedFrom(faction: string, rank: number): Archetype {
    const pool = ARCHETYPES.filter((a) => a.faction === faction && a.rank === rank);
    return pool.length ? pool[(Math.random() * pool.length) << 0]! : pickArchetypeOfRank(rank);
}
