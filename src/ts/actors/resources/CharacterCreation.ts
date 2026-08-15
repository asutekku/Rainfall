import {Utils} from "../../utils/utils";
import {Name} from "./Name";

/** A partial description of a character; anything omitted is rolled randomly. */
export interface CharacterSpec {
    name?: string;
    role?: string;   // role key: solo | netrunner | fixer | ...
    roleRank?: number;
    stats?: {
        ref?: number; dex?: number; body?: number; will?: number; emp?: number;
        cool?: number; int?: number; tech?: number; luck?: number; move?: number;
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

// RED Complete Package point-buy: 62 points spread across the ten STATS, each 2-8.
export const STAT_KEYS: string[] = ["int", "ref", "dex", "tech", "cool", "will", "luck", "move", "body", "emp"];
export const STAT_BUDGET: number = 62;
export const STAT_MIN: number = 2;
export const STAT_MAX: number = 8;

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

    // Lifepath option tables, exposed so the creation screen can populate its pickers.
    public static origins(): string[] { return CULTURAL_ORIGIN.slice(); }
    public static personalities(): string[] { return PERSONALITY.slice(); }
    public static clothing(): string[] { return CLOTHING.slice(); }
    public static values(): string[] { return VALUE_MOST.slice(); }
    public static families(): string[] { return FAMILY_BACKGROUND.slice(); }
    public static lifeGoals(): string[] { return LIFE_GOAL.slice(); }

    /** A fresh random street name. */
    public static randomName(): string {
        const gender = Name.getGender();
        return `${Name.getFirstname(gender)} ${Name.getSurname()}`;
    }

    /** RED-ish random stat block: competent ranges so a rolled character is playable. */
    public static randomStats(): Required<NonNullable<CharacterSpec["stats"]>> {
        const roll = (min: number, max: number): number => Math.floor(Utils.range(min, max + 1));
        return {
            ref: roll(5, 8), dex: roll(5, 8), body: roll(5, 8), will: roll(4, 8), emp: roll(5, 8),
            cool: roll(4, 8), int: roll(4, 8), tech: roll(3, 7), luck: roll(4, 7), move: roll(5, 8),
        };
    }

    /**
     * A random STAT block that respects the RED Complete Package budget: every
     * stat starts at STAT_MIN, then the remaining points are scattered (capped at
     * STAT_MAX). The result always totals exactly STAT_BUDGET, so a "randomize"
     * in the creator never overspends.
     */
    public static budgetStats(): Required<NonNullable<CharacterSpec["stats"]>> {
        const v: any = {};
        STAT_KEYS.forEach((k) => v[k] = STAT_MIN);
        let pool = STAT_BUDGET - STAT_MIN * STAT_KEYS.length;
        while (pool > 0 && STAT_KEYS.some((k) => v[k] < STAT_MAX)) {
            const k = Utils.pickRandom(STAT_KEYS.filter((kk) => v[kk] < STAT_MAX));
            v[k] += 1; pool -= 1;
        }
        return v;
    }

    /** The classic "capable solo" starting build — the creator's default squad member. */
    public static defaultSpec(): CharacterSpec {
        return {
            name: CharacterCreation.randomName(),
            role: "solo",
            roleRank: 4,
            stats: {int: 5, ref: 7, dex: 6, tech: 5, cool: 6, will: 6, luck: 6, move: 6, body: 7, emp: 8},
            lifepath: CharacterCreation.randomLifepath(),
        };
    }

    /** A fully randomized, budget-legal spec with a rolled name — the creator's "randomize". */
    public static randomSpec(): CharacterSpec {
        return {
            name: CharacterCreation.randomName(),
            role: Utils.pickRandom(ROLES),
            roleRank: Math.floor(Utils.range(4, 7)),
            stats: CharacterCreation.budgetStats(),
            lifepath: CharacterCreation.randomLifepath(),
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
