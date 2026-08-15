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
    ref: number; dex: number; body: number; will: number;
    skill: number; luck: number;
    bodySP: number; headSP: number;
    weapons: string[];    // weaponClass pool to draw from
    minDice: number;      // floor on the weapon's d6 count (0 = any)
    temperament: string;  // "roll" = derive from the drawn weapon
    portrait: string;     // role key used for the portrait
    reward: number;       // eddies / XP multiplier
}

export const ARCHETYPES: Archetype[] = [
    // ---- Rank 1: street mooks (SP 0-7, HP ~30-35) ----
    {faction: "Street", title: "Punk", rank: 1, ref: 4, dex: 4, body: 5, will: 4, skill: 2, luck: 2,
        bodySP: 4, headSP: 0, weapons: ["pistol", "melee"], minDice: 0, temperament: "roll", portrait: "fixer", reward: 1},
    {faction: "Scav", title: "Harvester", rank: 1, ref: 4, dex: 5, body: 4, will: 3, skill: 2, luck: 2,
        bodySP: 0, headSP: 0, weapons: ["melee", "pistol"], minDice: 0, temperament: "aggressive", portrait: "nomad", reward: 1},
    {faction: "Bozos", title: "Booster", rank: 1, ref: 5, dex: 5, body: 5, will: 4, skill: 3, luck: 3,
        bodySP: 7, headSP: 0, weapons: ["pistol", "smg"], minDice: 0, temperament: "aggressive", portrait: "rockerboy", reward: 1},

    // ---- Rank 2: gangers (SP 0-12, HP ~40-45) ----
    {faction: "Animals", title: "Bruiser", rank: 2, ref: 5, dex: 6, body: 8, will: 6, skill: 4, luck: 2,
        bodySP: 0, headSP: 0, weapons: ["melee"], minDice: 3, temperament: "berserker", portrait: "nomad", reward: 2},
    {faction: "Tyger Claws", title: "Enforcer", rank: 2, ref: 7, dex: 7, body: 5, will: 5, skill: 5, luck: 3,
        bodySP: 11, headSP: 0, weapons: ["melee"], minDice: 2, temperament: "flanker", portrait: "solo", reward: 2},
    {faction: "Maelstrom", title: "Raider", rank: 2, ref: 5, dex: 5, body: 7, will: 6, skill: 4, luck: 3,
        bodySP: 12, headSP: 0, weapons: ["smg", "pistol"], minDice: 0, temperament: "aggressive", portrait: "solo", reward: 2},
    {faction: "Wraiths", title: "Raider", rank: 2, ref: 5, dex: 5, body: 6, will: 5, skill: 4, luck: 3,
        bodySP: 7, headSP: 4, weapons: ["shotgun", "rifle"], minDice: 0, temperament: "aggressive", portrait: "nomad", reward: 2},

    // ---- Rank 3: elites (SP 11-13, HP ~40-45) ----
    {faction: "6th Street", title: "Veteran", rank: 3, ref: 6, dex: 6, body: 6, will: 6, skill: 6, luck: 4,
        bodySP: 11, headSP: 7, weapons: ["rifle", "smg"], minDice: 0, temperament: "flanker", portrait: "cop", reward: 3},
    {faction: "Tyger Claws", title: "Blademaster", rank: 3, ref: 8, dex: 8, body: 6, will: 6, skill: 7, luck: 4,
        bodySP: 11, headSP: 0, weapons: ["melee"], minDice: 3, temperament: "berserker", portrait: "solo", reward: 3},
    {faction: "Maelstrom", title: "Reaver", rank: 3, ref: 6, dex: 6, body: 8, will: 7, skill: 6, luck: 3,
        bodySP: 13, headSP: 0, weapons: ["smg", "rifle", "melee"], minDice: 0, temperament: "berserker", portrait: "solo", reward: 3},
    {faction: "Arasaka", title: "Lanceman", rank: 3, ref: 7, dex: 6, body: 6, will: 7, skill: 7, luck: 4,
        bodySP: 12, headSP: 11, weapons: ["rifle", "smg"], minDice: 0, temperament: "flanker", portrait: "corporate", reward: 4},

    // ---- Rank 4: heavies (SP 13-15, HP ~45-55) ----
    {faction: "Militech", title: "Trooper", rank: 4, ref: 7, dex: 7, body: 7, will: 7, skill: 8, luck: 5,
        bodySP: 15, headSP: 11, weapons: ["rifle"], minDice: 4, temperament: "flanker", portrait: "corporate", reward: 6},
    {faction: "Trauma Team", title: "Operator", rank: 4, ref: 7, dex: 7, body: 7, will: 7, skill: 7, luck: 5,
        bodySP: 15, headSP: 11, weapons: ["smg", "rifle"], minDice: 0, temperament: "flanker", portrait: "cop", reward: 6},
    {faction: "Cyberpsycho", title: "Rampage", rank: 4, ref: 7, dex: 7, body: 9, will: 8, skill: 6, luck: 3,
        bodySP: 13, headSP: 0, weapons: ["melee", "rifle"], minDice: 3, temperament: "berserker", portrait: "solo", reward: 7},

    // ---- Rank 5: bosses (SP 15-18, HP ~55-60) ----
    {faction: "MaxTac", title: "Officer", rank: 5, ref: 8, dex: 8, body: 8, will: 8, skill: 9, luck: 6,
        bodySP: 15, headSP: 13, weapons: ["rifle", "smg"], minDice: 0, temperament: "flanker", portrait: "cop", reward: 10},
    {faction: "Cyberpsycho", title: "Terror", rank: 5, ref: 8, dex: 8, body: 10, will: 9, skill: 8, luck: 4,
        bodySP: 15, headSP: 0, weapons: ["melee", "rifle"], minDice: 4, temperament: "berserker", portrait: "solo", reward: 12},
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
    return pool[(Math.random() * pool.length) << 0];
}
