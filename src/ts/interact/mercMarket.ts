import {CharacterCreation, CharacterSpec} from "../actors/resources/CharacterCreation";
import {Utils} from "../utils/utils";

/**
 * The merc market: who's for hire, and what they cost.
 *
 * Candidates are rolled rather than authored — a tier sets how good they are
 * (level, weapon skill, kit) and the sector sets the going rate, so hiring
 * competes with gear for the same crew purse. Both the between-sector board and
 * the fixer's table on the map draw from here; they differ only in how many
 * candidates they put up and how steep the prices are.
 */

export type StatBlock = Required<NonNullable<CharacterSpec["stats"]>>;

export interface MercOffer {
    id: string;
    name: string;
    role: string;
    tier: string;
    trait: string;
    level: number;
    price: number;
    skill: number;        // weapon skill level
    roleRank: number;
    stats: StatBlock;
    weapons: string[];    // weapon-class pool to draw the loadout from
    minDice: number;
    maxDice: number;
    armorName: string;
    armorSP: number;
}

interface Tier {
    name: string;
    weight: number;       // draw weight at sector 1
    levelOver: number;    // levels above the sector floor
    skill: number;
    roleRank: number;
    minDice: number;
    maxDice: number;
    armorName: string;
    armorSP: number;
    price: number;        // sector-1 asking price
    bump: number;         // points added to their best stats
}

const TIERS: Tier[] = [
    {name: "Rookie", weight: 46, levelOver: 0, skill: 3, roleRank: 2, minDice: 0, maxDice: 4,
        armorName: "Kevlar", armorSP: 7, price: 250, bump: 0},
    {name: "Pro", weight: 34, levelOver: 1, skill: 5, roleRank: 4, minDice: 2, maxDice: 5,
        armorName: "Light Armorjack", armorSP: 11, price: 700, bump: 1},
    {name: "Veteran", weight: 15, levelOver: 2, skill: 7, roleRank: 6, minDice: 3, maxDice: 6,
        armorName: "Medium Armorjack", armorSP: 12, price: 1600, bump: 2},
    {name: "Legend", weight: 5, levelOver: 3, skill: 9, roleRank: 8, minDice: 4, maxDice: 6,
        armorName: "Heavy Armorjack", armorSP: 13, price: 3200, bump: 3},
];

// What each trade tends to bring to a firefight.
const ROLE_WEAPONS: { [role: string]: string[] } = {
    solo: ["rifle", "smg", "shotgun"],
    cop: ["shotgun", "pistol", "smg"],
    nomad: ["shotgun", "rifle", "melee"],
    fixer: ["pistol", "smg"],
    netrunner: ["pistol", "smg"],
    techie: ["smg", "pistol"],
    media: ["pistol", "smg"],
    corporate: ["pistol", "rifle"],
    rockerboy: ["smg", "pistol", "melee"],
};

const TRAITS: string[] = [
    "Owes money to the wrong people", "Says nothing, hits everything", "Ex-corp, no references",
    "Drinks through the after-action", "Wanted in three districts", "Talks to their gun",
    "Clean record, suspiciously so", "Came back from a job nobody else did",
    "Cheap because they're impatient", "Won't work weekends, negotiable",
    "Still wearing the last crew's colours", "Has a plan for everything, mostly bad",
];

/** Stat keys ordered by how much they matter to a shooter, for tier bumps. */
const COMBAT_ORDER: string[] = ["ref", "dex", "body", "will", "move"];

export class MercMarket {

    private static seq = 0;

    /** Weighted tier draw — the deeper the sector, the better the talent on offer. */
    private static rollTier(sector: number): Tier {
        const weights = TIERS.map((t, i) => Math.max(1, t.weight + (i - 1) * (sector - 1) * 3));
        const total = weights.reduce((n, w) => n + w, 0);
        let roll = Math.random() * total;
        for (let i = 0; i < TIERS.length; i++) {
            roll -= weights[i]!;
            if (roll <= 0) { return TIERS[i]!; }
        }
        return TIERS[0]!;
    }

    /** A tier's stat line for a role: the role's own spread, sharpened by tier. */
    private static statsFor(role: string, tier: Tier): StatBlock {
        const stats: any = CharacterCreation.statsForRole(role);
        for (let i = 0; i < tier.bump; i++) {
            const key = COMBAT_ORDER[i % COMBAT_ORDER.length]!;
            stats[key] = Math.min(8, stats[key] + 1);
        }
        return stats;
    }

    /** One candidate for hire at this sector's going rate. */
    public static offer(sector: number, markup: number = 1): MercOffer {
        const tier = this.rollTier(sector);
        const role = Utils.pickRandom(CharacterCreation.roles());
        const rate = tier.price * (1 + 0.35 * (sector - 1)) * markup;
        return {
            id: "m" + (this.seq++),
            name: CharacterCreation.randomName(),
            role,
            tier: tier.name,
            trait: Utils.pickRandom(TRAITS),
            level: Math.max(1, sector + tier.levelOver),
            price: Math.round(rate / 10) * 10,
            skill: tier.skill,
            roleRank: tier.roleRank,
            stats: this.statsFor(role, tier),
            weapons: ROLE_WEAPONS[role] || ["pistol", "smg"],
            minDice: tier.minDice,
            maxDice: tier.maxDice,
            armorName: tier.armorName,
            armorSP: tier.armorSP,
        };
    }

    /**
     * The body the fixer throws in with the job. A run that opens solo is a run
     * where the first elite node ends it before you've seen a hire board, so the
     * crew always starts two strong — and the freebie is always the bottom tier,
     * which is its own argument for spending the payday on someone better.
     */
    public static starter(sector: number): MercOffer {
        const tier = TIERS[0]!;
        const role = Utils.pickRandom(CharacterCreation.roles());
        return {
            id: "m" + (this.seq++),
            name: CharacterCreation.randomName(),
            role,
            tier: tier.name,
            trait: "Owed the fixer a favour, and now you're it",
            level: Math.max(1, sector),
            price: 0,
            skill: tier.skill,
            roleRank: tier.roleRank,
            stats: this.statsFor(role, tier),
            weapons: ROLE_WEAPONS[role] || ["pistol", "smg"],
            minDice: tier.minDice,
            maxDice: tier.maxDice,
            armorName: tier.armorName,
            armorSP: tier.armorSP,
        };
    }

    /**
     * Command Uplink Mk.III: the freebie waiting after a wipe is a Veteran.
     * Same shape as `starter`, drawn from the third tier instead of the floor.
     */
    public static starterVeteran(sector: number): MercOffer {
        const tier = TIERS[2]!;
        const role = Utils.pickRandom(CharacterCreation.roles());
        return {
            id: "m" + (this.seq++),
            name: CharacterCreation.randomName(),
            role,
            tier: tier.name,
            trait: "Your requisition codes still open doors",
            level: Math.max(1, sector + tier.levelOver),
            price: 0,
            skill: tier.skill,
            roleRank: tier.roleRank,
            stats: this.statsFor(role, tier),
            weapons: ROLE_WEAPONS[role] || ["pistol", "smg"],
            minDice: tier.minDice,
            maxDice: tier.maxDice,
            armorName: tier.armorName,
            armorSP: tier.armorSP,
        };
    }

    /**
     * A board of candidates. The between-sector board is broad and sells at the
     * going rate; the fixer's table mid-sector is short and takes a cut, which
     * is the price of not having to wait for the next sector.
     */
    public static board(sector: number, count: number = 4, markup: number = 1): MercOffer[] {
        const offers: MercOffer[] = [];
        for (let i = 0; i < count; i++) { offers.push(this.offer(sector, markup)); }
        return offers;
    }
}
