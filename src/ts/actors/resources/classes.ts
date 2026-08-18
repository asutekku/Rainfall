import type {StatusKey} from "../../interact/statuses";

/**
 * The nine combat classes — what a body is *for* on a street.
 *
 * This replaces the nine Cyberpunk 2020 roles, which were a character-sheet
 * vocabulary rather than a battlefield one. Solo, Fixer, Media and Corporate
 * described what someone did for a living; nothing about them said where to
 * stand or what to shoot, so nine roles produced exactly one behaviour and a
 * Solo and a Corporate were the same unit with different portraits.
 *
 * A class answers three questions the fight actually asks:
 *
 *   line     — where they want to be standing. The range bands already price
 *              this: a shotgun's sweet spot is band 0-1 and a sniper's is 3-6,
 *              so a Marksman on point is a real mistake the damage model will
 *              punish without any new arithmetic.
 *
 *   rider    — what a landed hit leaves behind. Every one of these statuses
 *              already exists with its own grammar; the classes are what
 *              finally make them reachable from a player decision.
 *
 *   passives — the out-of-combat edge, re-homed from the old role abilities so
 *              nothing that worked was thrown away in the move.
 *
 * Note what a class does NOT decide: how hard you are to kill. That comes from
 * your faction's gear and chrome — see `profile.ts`. Class is what you counter;
 * faction is what counters you. Keeping them on separate axes is what stops the
 * roster collapsing into "one class per profile" the way an earlier draft did.
 */

export type Line = "point" | "mid" | "overwatch";

export interface ClassSpec {
    /** Display name. */
    name: string;
    /** One line: what this class is for. */
    role: string;
    /** Where they want to stand. */
    line: Line;
    /** Weapon classes the market draws their loadout from. */
    weapons: string[];
    /** Team colour on the roster and the character sheet. */
    color: string;
    portrait: string;
    /**
     * What a landed hit leaves behind, and how often an ordinary hit leaves it
     * (a crit always does — see Combat.classProc). Null for the classes whose
     * edge is not a status.
     */
    rider?: { key: StatusKey; stacks: number; chance: number };
    /** The line the character sheet prints for this class. */
    edge: string;
}

/**
 * Portraits are the nine that already exist, reassigned by silhouette rather
 * than by name. Unique art per class is a later problem — the faction accent
 * and the profile badge are already doing most of the work of telling two
 * bodies apart on a roster.
 */
export const CLASSES: { [id: string]: ClassSpec } = {
    bulwark: {
        name: "Bulwark", role: "Tank — soaks the street so the others can work",
        line: "point", weapons: ["shotgun", "smg"], color: "#5a86c4", portrait: "cop",
        edge: "Dug In: opens every fight with four points of extra plate, shed one hit at a time.",
    },
    enforcer: {
        name: "Enforcer", role: "Bruiser — closes the distance and breaks the line",
        line: "point", weapons: ["melee", "shotgun"], color: "#c4553f", portrait: "nomad",
        rider: {key: "staggered", stacks: 1, chance: 1},
        edge: "Bad Reputation: hits leave them reeling, and some crews stand down on sight.",
    },
    breacher: {
        name: "Breacher", role: "Damage — takes armour off people",
        line: "point", weapons: ["shotgun", "smg"], color: "#d08a3a", portrait: "fixer",
        rider: {key: "shred", stacks: 1, chance: 0.45},
        edge: "Can Opener: tears plate off for good, and walks in carrying an extra frag.",
    },
    gunner: {
        name: "Gunner", role: "Damage — area denial, keeps heads down",
        line: "mid", weapons: ["smg", "rifle"], color: "#b8a03a", portrait: "corporate",
        rider: {key: "suppressed", stacks: 1, chance: 0.4},
        edge: "Covering Fire: everything they hit shoots back softer, and they add weight to the crew's fire.",
    },
    marksman: {
        name: "Marksman", role: "Damage — one shot, picked and paid for",
        line: "overwatch", weapons: ["sniper", "rifle"], color: "#4fae7a", portrait: "solo",
        edge: "Glassing: strikes first, the round's opening hit lands harder, and their optics read one street further.",
    },
    netrunner: {
        name: "Netrunner", role: "Control — the only answer to chrome",
        line: "mid", weapons: ["pistol", "smg"], color: "#2E86C1", portrait: "netrunner",
        edge: "Interface: quickhacks fry chrome outright — subdermal armour, reflexes and aim, all offline.",
    },
    cooker: {
        name: "Cooker", role: "Control — attrition that armour cannot stop",
        line: "mid", weapons: ["smg", "pistol"], color: "#8f5adf", portrait: "rockerboy",
        rider: {key: "burn", stacks: 2, chance: 0.35},
        edge: "Hot Loads: incendiary rounds burn through plate rather than at it.",
    },
    medtech: {
        name: "Medtech", role: "Support — keeps the crew on its feet",
        line: "mid", weapons: ["pistol", "smg"], color: "#c9d3da", portrait: "media",
        edge: "Field Surgery: drags the dying back up mid-fight, and patches harder than anyone.",
    },
    rigger: {
        name: "Rigger", role: "Support — armour, upkeep, and the long fight",
        line: "overwatch", weapons: ["smg", "rifle"], color: "#A2D9CE", portrait: "techie",
        edge: "Maker: services the squad's armour between stops, putting half the lost plate back on.",
    },
};

export const CLASS_IDS: string[] = Object.keys(CLASSES);

/** Safe lookup — a save file from before the rework can name a class that's gone. */
export function classSpec(id: string | undefined): ClassSpec {
    return (id && CLASSES[id]) || CLASSES["gunner"]!;
}

/**
 * Where a save file's old CP:RED role lands.
 *
 * Nine roles, nine classes, mapped by what the role actually did in a fight
 * rather than by name: the Solo's alpha strike is the Marksman's, the Techie's
 * armour work is the Rigger's, the Cop's supporting fire is the Gunner's. The
 * four roles that had no combat job at all (Fixer, Corporate, Media, Nomad)
 * land on the class nearest their kit, and the economy perks they carried moved
 * to factions, which is where a discount belonged in the first place.
 */
const FROM_ROLE: { [old: string]: string } = {
    solo: "marksman",
    cop: "gunner",
    techie: "rigger",
    netrunner: "netrunner",
    rockerboy: "enforcer",
    nomad: "enforcer",
    fixer: "breacher",
    corporate: "gunner",
    media: "medtech",
};

export function classFromLegacyRole(role: string | undefined): string {
    return (role && (CLASSES[role] ? role : FROM_ROLE[role])) || "gunner";
}
