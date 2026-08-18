/**
 * Faction visual identity + battlefield character, data-driven the same way
 * archetypes.ts drives stats. The 3D scene consumes `styleFor` to dress a
 * hostile (colors + silhouette kit), the battlefield consumes `formationFor`
 * to shape how a faction opens a fight. Team readability stays sacred: the
 * ground ring is always team-colored — faction shows in the body, never the IFF.
 */

/** Modular silhouette add-ons the battle scene knows how to build. */
export type KitPart =
    | "mohawk"      // punk hair blade
    | "nose"        // Bozos clown nose
    | "rags"        // scav asymmetric junk plating
    | "bulkArms"    // Animals oversized arms
    | "crest"       // helmet blade crest
    | "optics"      // glowing face optics cluster (Maelstrom trio)
    | "spikes"      // shoulder spikes
    | "mask"        // pale ghost faceplate
    | "cap"         // militia cap
    | "pauldrons"   // corporate hard-shell shoulders
    | "visorFull"   // full-face visor
    | "antenna"     // comms whip
    | "backpack"    // med/assault pack
    | "cross"       // medic chest cross
    | "coat"        // longcoat panels
    | "chrome"      // exposed chrome limbs + emissive seams
    | "bandolier";  // grenade bandolier across the chest

export const KIT_PARTS: KitPart[] = [
    "mohawk", "nose", "rags", "bulkArms", "crest", "optics", "spikes", "mask", "cap",
    "pauldrons", "visorFull", "antenna", "backpack", "cross", "coat", "chrome", "bandolier",
];

/** How a faction likes to open an engagement (Battlefield formation styles). */
export type Formation = "line" | "flank" | "scatter" | "close";

export interface FactionStyle {
    accent: number;       // trim / visor / emblem color (also tints their tracers)
    body: number;         // torso + leg color
    head: number;         // bare head color
    parts: KitPart[];     // silhouette kit
    formation: Formation; // preferred opening deployment
}

const DEFAULT_STYLE: FactionStyle = {
    accent: 0xe0533f, body: 0x2c2126, head: 0x1a1f28, parts: [], formation: "line",
};

const STYLES: { [faction: string]: FactionStyle } = {
    "Street":      {accent: 0xd94f8a, body: 0x28303c, head: 0x1a1f28, parts: ["mohawk"], formation: "scatter"},
    "Scav":        {accent: 0x9aa832, body: 0x3a3026, head: 0x241f1a, parts: ["rags"], formation: "scatter"},
    "Bozos":       {accent: 0x8f5adf, body: 0x33283e, head: 0x1a1f28, parts: ["nose", "mohawk"], formation: "close"},
    "Animals":     {accent: 0xd9a441, body: 0x8a5c40, head: 0x6e4632, parts: ["bulkArms"], formation: "close"},
    "Tyger Claws": {accent: 0xff3b30, body: 0x241f33, head: 0x14121e, parts: ["crest"], formation: "flank"},
    "Maelstrom":   {accent: 0xff2222, body: 0x131318, head: 0x0d0d11, parts: ["optics", "spikes"], formation: "scatter"},
    "Wraiths":     {accent: 0xbfc9d4, body: 0x353b44, head: 0x232830, parts: ["mask"], formation: "line"},
    "6th Street":  {accent: 0x4f8fd9, body: 0x3f4a41, head: 0x1a1f28, parts: ["cap"], formation: "line"},
    "Arasaka":     {accent: 0xd7263d, body: 0x22252d, head: 0x14161c, parts: ["pauldrons", "visorFull"], formation: "line"},
    "Militech":    {accent: 0xf0a830, body: 0x40452f, head: 0x272b1e, parts: ["pauldrons", "antenna"], formation: "line"},
    "Trauma Team": {accent: 0xff3b30, body: 0xd8dde3, head: 0xc7ccd4, parts: ["backpack", "cross", "visorFull"], formation: "flank"},
    "Cyberpsycho": {accent: 0x66ffc2, body: 0x2a2d33, head: 0x1a1f28, parts: ["chrome", "optics"], formation: "close"},
    "MaxTac":      {accent: 0x3fa0ff, body: 0x14161c, head: 0x0e1015, parts: ["pauldrons", "visorFull", "coat"], formation: "flank"},
    "Chrome":      {accent: 0x8ff7ff, body: 0x525a63, head: 0x3d444d, parts: ["chrome", "optics", "pauldrons"], formation: "close"},
};

/** The visual identity for a faction (safe default for factionless legacy goons). */
export function styleFor(faction: string | undefined): FactionStyle {
    return (faction && STYLES[faction]) || DEFAULT_STYLE;
}

/** The faction's preferred opening formation. */
export function formationFor(faction: string | undefined): Formation {
    return styleFor(faction).formation;
}

/** CSS hex string of a faction's accent, for the 2D UI (strips, banners). */
export function accentCss(faction: string | undefined): string {
    return "#" + styleFor(faction).accent.toString(16).padStart(6, "0");
}

// ------------------------------------------------------- crews for hire --

/**
 * The eight factions that take money.
 *
 * Faction is the second axis of a hire's identity: the class says what they do
 * on a street, the faction says what they are made of. Their kit decides their
 * Plate / Chrome / Ghost profile (see profile.ts), which is what makes the
 * triangle point both ways — your crew is counterable too, and a Chrome-heavy
 * squad walking into an EMP is a bad night.
 *
 * The perks here are the three role abilities that had no business being combat
 * classes: the Fixer's cut, the Corporate's discount and the Nomad's
 * scavenging. They were always economy perks wearing a class costume, and a
 * faction is where an economy perk belongs.
 *
 * MaxTac, Cyberpsycho, Arasaka, Militech and Trauma Team stay hostile-only —
 * the ones you can put on a payroll are the ones you can pay.
 */
export type CrewProfile = "plate" | "chrome" | "ghost";

export interface CrewFaction {
    /** How their kit reads, and therefore which side of the triangle they sit on. */
    armour: CrewProfile;
    /** Fee multiplier on the hire board — the price ladder does the balancing. */
    fee: number;
    /** One line for the hire board: who these people are. */
    reads: string;
    /** One line: what signing them actually buys. */
    perk: string;
    /** Every eddie through their hands is this much bigger. */
    cut?: number;
    /** Fraction off every market bill. */
    discount?: number;
    /** Extra chance to strip something off a body. */
    scav?: number;
    /** Edge behind the wheel. */
    moto?: number;
    /** Nothing to switch off: immune to `fried`. */
    noChrome?: boolean;
    /** Smoke on the belt at every deployment. */
    smoke?: number;
    /** Stacks of `adrenaline` they open a fight with. */
    opener?: number;
}

export const CREW_FACTIONS: { [id: string]: CrewFaction } = {
    "Street": {
        armour: "ghost", fee: 0.8, cut: 0.2,
        reads: "local kids with pistols and nerve",
        perk: "Knows who fences what — every payday 20% bigger",
    },
    "Scav": {
        armour: "ghost", fee: 0.7, scav: 0.15,
        reads: "no armour, all desperation",
        perk: "Strips the bodies everyone else walks past",
    },
    "Wraiths": {
        armour: "ghost", fee: 1, moto: 3, smoke: 1,
        reads: "badlands raiders, smoke and knives",
        perk: "Runs every fight with smoke on the belt",
    },
    "6th Street": {
        armour: "plate", fee: 1, discount: 0.1,
        reads: "neighbourhood militia, flak and discipline",
        perk: "Militia quartermaster — 10% off every market bill",
    },
    "Animals": {
        armour: "plate", fee: 1.1, noChrome: true,
        reads: "no chrome, just meat and mass",
        perk: "Nothing to switch off — EMP and quickhacks do nothing",
    },
    "Tyger Claws": {
        armour: "chrome", fee: 1.35, opener: 2,
        reads: "wired reflexes, monowire, blades",
        perk: "Strikes first and strikes hot — opens every fight on adrenaline",
    },
    "Maelstrom": {
        armour: "chrome", fee: 1.3, opener: 3,
        reads: "too much chrome, not enough left",
        perk: "Does not stop — opens hard and keeps going",
    },
    "Chrome": {
        armour: "chrome", fee: 1.5,
        reads: "full-conversion, barely people",
        perk: "The heaviest subdermals money buys — and an EMP undoes all of it",
    },
};

export const HIREABLE_FACTIONS: string[] = Object.keys(CREW_FACTIONS);

/** The crew perks for a faction (empty for hostiles and for the factionless). */
export function crewFaction(faction: string | undefined): CrewFaction | null {
    return (faction && CREW_FACTIONS[faction]) || null;
}

/** One numeric perk, defaulting to nothing. */
export function factionPerk(faction: string | undefined, key: "cut" | "discount" | "scav" | "moto"): number {
    const f = crewFaction(faction);
    return (f && f[key]) || 0;
}
