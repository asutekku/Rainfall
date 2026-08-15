import {CoverSpot} from "./battlefield";

/**
 * Procedural streetscape for the battle arena — the fight happens on a rainy
 * Night City street. Same recipe as the run-map city generator: pure math in
 * here, no three.js; the battle scene turns this spec into meshes.
 *
 * Coordinates are battlefield metres: x runs across the street (squad's view),
 * y runs down it (near 0 → far 44). The scene maps x→world.x, y→world.z.
 * The playfield is x∈[-24,24], y∈[0,44]; the street itself extends past both
 * ends so the canyon reads as a city, not a diorama.
 */

export interface ScapeBuilding {
    x: number;       // centre x
    y: number;       // centre y (depth along the street)
    w: number;       // width across x
    d: number;       // depth along y
    h: number;       // height
    tone: number;    // palette index for the fill
}

export interface ScapeSign {
    x: number; y: number; h: number;   // world position (h = height off the ground)
    w: number; tall: number;           // face size
    color: number;
    text: string | null;               // null = plain glow slab
    vertical: boolean;                 // vertical banner vs horizontal box
    face: -1 | 1;                      // which street wall it hangs on (sign faces inward)
    flicker: boolean;
}

export interface ScapeLight { x: number; y: number; h: number; color: number; }

export interface ScapeCable { x0: number; x1: number; y: number; h: number; sag: number; }

export interface ScapeProp {
    x: number; y: number; rot: number;
    kind: "hydrant" | "trash" | "cone" | "vending" | "vent" | "planter";
}

export interface ScapePuddle { x: number; y: number; rx: number; ry: number; }

export interface Streetscape {
    roadHalf: number;                          // asphalt half-width
    walkHalf: number;                          // outer sidewalk edge (= building line)
    depth: [number, number];                   // street extent along y (past the field)
    buildings: ScapeBuilding[];
    backdrop: ScapeBuilding[];                 // far-end towers closing the canyon
    signs: ScapeSign[];
    lights: ScapeLight[];
    cables: ScapeCable[];
    props: ScapeProp[];
    puddles: ScapePuddle[];
    covers: Array<CoverSpot & {rot: number}>;
}

/** Deterministic RNG so a battle's street stays put across React re-mounts. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const NEON = [0x37e1e7, 0xe0533f, 0xf0a830, 0x7fd67f, 0xc44fd0, 0x8be0ff, 0xff7ab0];

const SIGN_TEXT = [
    "RAINFALL", "ヌードル", "NO FUTURE", "BAR", "ホテル", "AMMO", "クラブ 9", "NET//RUN",
    "XXX", "寿司", "CYBERDOC", "MOTEL", "薬局", "EDDIES", "PAWN", "危険", "GIRLS", "麺",
    "CHROME", "夜市", "LIVE", "БАР", "TATTOO", "雨", "DINER", "ドラッグ",
];

export function generateStreetscape(seed: number, covers: CoverSpot[]): Streetscape {
    const rng = mulberry32(seed || 1);
    const r = (a: number, b: number): number => a + rng() * (b - a);
    const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

    const roadHalf = 16;
    const walkHalf = 24.5;
    const depth: [number, number] = [-34, 86];

    // -- street walls: parcels marching down both sides of the canyon ---------
    const buildings: ScapeBuilding[] = [];
    const signs: ScapeSign[] = [];
    for (const side of [-1, 1] as Array<-1 | 1>) {
        let y = depth[0] + r(0, 6);
        while (y < depth[1]) {
            const w = r(10, 22);        // footprint across x (away from the street)
            const d = r(9, 18);         // frontage along the street
            const setback = r(0, 2.2);
            const midY = y + d / 2;
            const inField = midY > -6 && midY < 56;
            // towers rise where the fight is; the far ends taper off
            const h = inField ? r(10, 30) + (rng() < 0.22 ? r(8, 16) : 0) : r(6, 16);
            const x = side * (walkHalf + setback + w / 2);
            buildings.push({x, y: midY, w, d, h, tone: Math.floor(rng() * 3)});

            // neon on facades that face the fight
            const facade = side * (walkHalf + setback);
            if (inField && rng() < 0.85) {
                const vertical = rng() < 0.45;
                signs.push({
                    x: facade - side * 0.5,
                    y: midY + r(-d * 0.3, d * 0.3),
                    h: vertical ? r(4, Math.max(5, h - 6)) : r(3, Math.max(4, h - 4)),
                    w: vertical ? r(1.6, 2.4) : r(3.5, 7),
                    tall: vertical ? r(5, 9) : r(1.6, 2.6),
                    color: pick(NEON),
                    text: rng() < 0.75 ? pick(SIGN_TEXT) : null,
                    vertical,
                    face: side,
                    flicker: rng() < 0.3,
                });
            }
            // occasional second, smaller sign lower on the same frontage
            if (inField && rng() < 0.4) {
                signs.push({
                    x: facade - side * 0.4, y: midY + r(-d * 0.35, d * 0.35), h: r(2.2, 4),
                    w: r(2, 3.5), tall: r(1, 1.6), color: pick(NEON),
                    text: rng() < 0.5 ? pick(SIGN_TEXT) : null,
                    vertical: false, face: side, flicker: rng() < 0.35,
                });
            }
            y += d + r(0.5, 3);
        }
    }

    // -- far-end backdrop: a wall of towers so the street vanishes into city --
    const backdrop: ScapeBuilding[] = [];
    let bx = -46;
    while (bx < 46) {
        const w = r(10, 20);
        backdrop.push({x: bx + w / 2, y: r(66, 84), w, d: r(10, 20), h: r(18, 44), tone: Math.floor(rng() * 3)});
        bx += w * r(0.7, 1.0);
    }

    // -- street lights: staggered down both sidewalks -------------------------
    const lights: ScapeLight[] = [];
    for (let y = -8, i = 0; y < 58; y += r(10, 14), i++) {
        const side = i % 2 === 0 ? -1 : 1;
        lights.push({x: side * (roadHalf + 1.6), y, h: r(5.5, 6.5), color: rng() < 0.25 ? 0xe0533f : 0x8be0ff});
    }

    // -- power cables sagging across the canyon -------------------------------
    const cables: ScapeCable[] = [];
    for (let y = r(-4, 4); y < 54; y += r(9, 16)) {
        const h = r(9, 15);
        cables.push({x0: -walkHalf, x1: walkHalf, y, h, sag: r(1, 2.6)});
        if (rng() < 0.35) { cables.push({x0: -walkHalf, x1: walkHalf, y: y + r(0.5, 2), h: h + r(0.8, 2), sag: r(1, 2.6)}); }
    }

    // -- sidewalk clutter (visual only, off the playable road) ----------------
    const props: ScapeProp[] = [];
    const kinds: ScapeProp["kind"][] = ["hydrant", "trash", "cone", "vending", "vent", "planter"];
    for (let i = 0; i < 26; i++) {
        const side = rng() < 0.5 ? -1 : 1;
        const kind = pick(kinds);
        // vents sit on the road surface, everything else hugs the sidewalks
        const onRoad = kind === "vent" || kind === "cone";
        props.push({
            kind,
            x: onRoad ? r(-roadHalf + 2, roadHalf - 2) : side * r(roadHalf + 1.2, walkHalf - 1.2),
            y: r(-10, 56),
            rot: r(0, Math.PI * 2),
        });
    }

    // -- rain puddles catching the neon ---------------------------------------
    const puddles: ScapePuddle[] = [];
    for (let i = 0; i < 9; i++) {
        puddles.push({x: r(-roadHalf + 2, roadHalf - 2), y: r(-8, 56), rx: r(1.1, 2.6), ry: r(0.7, 1.6)});
    }

    return {
        roadHalf, walkHalf, depth, buildings, backdrop, signs, lights, cables, props, puddles,
        covers: covers.map((c) => ({...c, rot: r(-0.35, 0.35) + (rng() < 0.5 ? 0 : Math.PI / 2)})),
    };
}
