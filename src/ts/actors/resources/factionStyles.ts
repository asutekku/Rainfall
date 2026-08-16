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
