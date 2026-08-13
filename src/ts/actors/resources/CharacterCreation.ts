import {Utils} from "../../utils/utils";

/** A partial description of a character; anything omitted is rolled randomly. */
export interface CharacterSpec {
    name?: string;
    role?: string;   // role key: solo | netrunner | fixer | ...
    roleRank?: number;
    stats?: {
        ref?: number; dex?: number; body?: number; will?: number;
        emp?: number; cool?: number; int?: number; tech?: number; luck?: number;
    };
    lifepath?: Lifepath;
}

export interface Lifepath {
    culturalOrigin: string;
    personality: string;
    clothingStyle: string;
    valueMost: string;
    familyBackground: string;
    lifeGoal: string;
}

const ROLES: string[] = ["rockerboy", "solo", "netrunner", "techie", "media", "cop", "corporate", "fixer", "nomad"];

// Cyberpunk RED Lifepath tables (core rulebook).
const CULTURAL_ORIGIN: string[] = [
    "North American", "South/Central American", "Western European", "Eastern European",
    "Middle Eastern / North African", "Sub-Saharan African", "South Asian", "South East Asian",
    "East Asian", "Oceania / Pacific Islander",
];
const PERSONALITY: string[] = [
    "Shy and secretive", "Rebellious and antisocial", "Arrogant and proud", "Moody and rash",
    "Picky and fussy", "Sneaky and deceptive", "Intellectual and detached", "Friendly and outgoing",
    "Aggressive and violent", "Nervous and paranoid",
];
const CLOTHING: string[] = [
    "Gennie Fashion", "Bag Lady chic", "Nomad leathers", "Asia Pop", "Urban Flash",
    "Businesswear", "High Fashion", "Bohemian", "Bag Lady", "Gangbanger",
];
const VALUE_MOST: string[] = [
    "Money", "Honor", "Your word", "Honesty", "Knowledge", "Vengeance",
    "Love", "Power", "Family", "Friendship",
];
const FAMILY_BACKGROUND: string[] = [
    "Corporate exec family", "Corporate techie family", "Nomad pack", "Ganger clan",
    "Combat zone poor", "Urban homeless", "Megastructure warren", "Reclaimer settlers",
    "Edgerunner legacy", "Old-money survivors",
];
const LIFE_GOAL: string[] = [
    "Get rich or die trying", "Avenge a wrong done to you", "Prove yourself the best",
    "Protect those who can't protect themselves", "Tear down a Corp", "Find someone you lost",
    "Leave a legacy on the Street", "Just survive one more night",
];

export class CharacterCreation {
    public static roles(): string[] {
        return ROLES.slice();
    }

    /** RED-ish random stat block: competent ranges so a rolled character is playable. */
    public static randomStats(): Required<NonNullable<CharacterSpec["stats"]>> {
        const roll = (min: number, max: number): number => Math.floor(Utils.range(min, max + 1));
        return {
            ref: roll(5, 8), dex: roll(5, 8), body: roll(5, 8), will: roll(4, 8),
            emp: roll(5, 8), cool: roll(4, 8), int: roll(4, 8), tech: roll(3, 7), luck: roll(4, 7),
        };
    }

    public static randomLifepath(): Lifepath {
        return {
            culturalOrigin: Utils.pickRandom(CULTURAL_ORIGIN),
            personality: Utils.pickRandom(PERSONALITY),
            clothingStyle: Utils.pickRandom(CLOTHING),
            valueMost: Utils.pickRandom(VALUE_MOST),
            familyBackground: Utils.pickRandom(FAMILY_BACKGROUND),
            lifeGoal: Utils.pickRandom(LIFE_GOAL),
        };
    }

    /** A fully randomized character spec (role, stats, lifepath). */
    public static random(): CharacterSpec {
        return {
            role: Utils.pickRandom(ROLES),
            roleRank: Math.floor(Utils.range(4, 9)),
            stats: CharacterCreation.randomStats(),
            lifepath: CharacterCreation.randomLifepath(),
        };
    }
}
