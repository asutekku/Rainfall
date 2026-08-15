/**
 * Cheap procedural city generator for the holographic run map.
 *
 * Technique: recursive ANGLED binary subdivision of an organic city polygon
 * (the OBB-split approach from the procedural-cities literature — the cheap
 * cousin of Voronoi partitioning). Each split is a straight cut roughly across
 * the region's long axis with jitter, so the road network comes out as angled
 * straight avenues rather than a square grid. The first cuts are wide glowing
 * arterials, deeper cuts are narrow side streets. Leaf polygons become city
 * blocks; blocks are split once more (without roads) into lots, and each lot
 * extrudes to a building whose height comes from its district.
 *
 * On top of the streets this also builds a ROAD GRAPH — junctions (merged cut
 * endpoints and T-intersections) connected by road pieces — which the run
 * layer uses to place its waypoints ON the streets and route between them
 * ALONG the streets.
 *
 * The city is deliberately larger than the playable slice: an ACTIVE district
 * (rust, lit roads) surrounded by dormant grey city that later acts expand
 * into.
 *
 * Pure math, no three.js imports.
 */

export interface Pt { x: number; z: number; }
export interface Road { a: Pt; b: Pt; width: number; major: boolean; active: boolean; }
export interface Building { poly: Pt[]; height: number; district: number; active: boolean; }
export interface RoadEdge { a: number; b: number; length: number; }

export interface City {
    roads: Road[];
    buildings: Building[];
    junctions: Pt[];        // road-graph vertices
    graph: RoadEdge[];      // road-graph edges (junction indices)
    activeCenter: Pt;
    activeRadius: number;
    maxActiveHeight: number;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

// ---------------------------------------------------------------- geometry --

function centroid(poly: Pt[]): Pt {
    let x = 0, z = 0;
    poly.forEach((p) => { x += p.x; z += p.z; });
    return {x: x / poly.length, z: z / poly.length};
}

function area(poly: Pt[]): number {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
        s += a.x * b.z - b.x * a.z;
    }
    return Math.abs(s) / 2;
}

/** Longest-edge direction — splits go roughly across it (the OBB heuristic). */
function longAxisAngle(poly: Pt[]): number {
    let best = 0, len = -1;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
        const dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz;
        if (l > len) { len = l; best = Math.atan2(dz, dx); }
    }
    return best;
}

/** Split a convex polygon with the line through `c` along direction `ang`. */
function split(poly: Pt[], c: Pt, ang: number): { left: Pt[]; right: Pt[]; cut: [Pt, Pt] } | null {
    const dx = Math.cos(ang), dz = Math.sin(ang);
    const side = (p: Pt): number => dx * (p.z - c.z) - dz * (p.x - c.x);
    const left: Pt[] = [], right: Pt[] = [], hits: Pt[] = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
        const sa = side(a), sb = side(b);
        if (sa >= 0) { left.push(a); }
        if (sa <= 0) { right.push(a); }
        if ((sa > 0 && sb < 0) || (sa < 0 && sb > 0)) {
            const t = sa / (sa - sb);
            const p = {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t};
            left.push(p); right.push(p); hits.push(p);
        }
    }
    if (left.length < 3 || right.length < 3 || hits.length < 2) { return null; }
    return {left, right, cut: [hits[0]!, hits[1]!]};
}

/** Move every edge of a convex polygon inward by `r` (true edge offset). */
function inset(poly: Pt[], r: number): Pt[] | null {
    const c = centroid(poly);
    const lines: Array<{p: Pt; n: Pt}> = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
        const dx = b.x - a.x, dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1;
        let nx = -dz / l, nz = dx / l;
        if (nx * (c.x - a.x) + nz * (c.z - a.z) < 0) { nx = -nx; nz = -nz; }
        lines.push({p: {x: a.x + nx * r, z: a.z + nz * r}, n: {x: dx / l, z: dz / l}});
    }
    const out: Pt[] = [];
    for (let i = 0; i < lines.length; i++) {
        const l1 = lines[(i + lines.length - 1) % lines.length]!, l2 = lines[i]!;
        const det = l1.n.x * -l2.n.z - -l2.n.x * l1.n.z;
        if (Math.abs(det) < 1e-6) { return null; }
        const bx = l2.p.x - l1.p.x, bz = l2.p.z - l1.p.z;
        const t = (bx * -l2.n.z + l2.n.x * bz) / det;
        out.push({x: l1.p.x + l1.n.x * t, z: l1.p.z + l1.n.z * t});
    }
    return area(out) > 1 && out.length >= 3 ? out : null;
}

/** Convex hull (gift wrap) — keeps the jittered radial boundary convex. */
function hull(pts: Pt[]): Pt[] {
    const s = pts.slice().sort((a, b) => a.x - b.x || a.z - b.z);
    const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
    const lower: Pt[] = [], upper: Pt[] = [];
    for (const p of s) {
        while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) { lower.pop(); }
        lower.push(p);
    }
    for (let i = s.length - 1; i >= 0; i--) {
        const p = s[i]!;
        while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) { upper.pop(); }
        upper.push(p);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
}

// -------------------------------------------------------------- generation --

export function generateCity(): City {
    // organic boundary: jittered radial points → convex hull (no box silhouette)
    const EX = 128, EZ = 100;
    const ring: Pt[] = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(-0.1, 0.1);
        const r = rnd(0.66, 1.0);
        ring.push({x: Math.cos(a) * EX * r, z: Math.sin(a) * EZ * r});
    }
    const boundary = hull(ring);

    const roads: Road[] = [];
    const blocks: Pt[][] = [];

    const carve = (poly: Pt[], depth: number): void => {
        const a = area(poly);
        if (a < 260 || depth > 7) { blocks.push(poly); return; }
        const jitter = depth < 2 ? rnd(-0.5, 0.5) : rnd(-0.35, 0.35);
        const ang = longAxisAngle(poly) + Math.PI / 2 + jitter;
        const c = centroid(poly);
        const off = Math.sqrt(a) * 0.16;
        const cut = split(poly, {x: c.x + rnd(-off, off), z: c.z + rnd(-off, off)}, ang);
        if (!cut) { blocks.push(poly); return; }
        const major = depth < 2;
        roads.push({a: cut.cut[0], b: cut.cut[1], width: major ? 3.4 : depth < 4 ? 1.9 : 1.2, major, active: true});
        carve(cut.left, depth + 1);
        carve(cut.right, depth + 1);
    };
    carve(boundary, 0);

    // the playable slice: an active district well inside the city
    const activeCenter: Pt = {x: rnd(-EX * 0.25, EX * 0.25), z: rnd(-EZ * 0.25, EZ * 0.25)};
    const activeRadius = 52;
    const isActive = (p: Pt): boolean =>
        Math.hypot(p.x - activeCenter.x, p.z - activeCenter.z) < activeRadius;
    roads.forEach((r) => {
        r.active = isActive({x: (r.a.x + r.b.x) / 2, z: (r.a.z + r.b.z) / 2}) || isActive(r.a) || isActive(r.b);
    });

    // districts inside the active slice: downtown core + secondary cluster
    const downtown: Pt = {
        x: activeCenter.x + rnd(-14, 14),
        z: activeCenter.z + rnd(-12, 12),
    };
    const second: Pt = {
        x: activeCenter.x - (downtown.x - activeCenter.x) * rnd(1.4, 2.0),
        z: activeCenter.z - (downtown.z - activeCenter.z) * rnd(1.4, 2.0),
    };
    const heightAt = (p: Pt): number => {
        const d1 = Math.hypot(p.x - downtown.x, p.z - downtown.z);
        const d2 = Math.hypot(p.x - second.x, p.z - second.z);
        const core = Math.max(0, 1 - d1 / 44);
        const sub = Math.max(0, 1 - d2 / 38) * 0.45;
        const t = Math.max(core, sub);
        let h = 2.5 + t * t * rnd(24, 34) + rnd(0, 3);
        if (core > 0.72 && Math.random() < 0.3) { h += rnd(10, 20); }
        return h;
    };
    const districtAt = (p: Pt): number => {
        const d1 = Math.hypot(p.x - downtown.x, p.z - downtown.z);
        return d1 < 26 ? 0 : d1 < 46 ? 1 : 2;
    };

    // blocks → lots → buildings
    const buildings: Building[] = [];
    let maxActiveHeight = 8;
    blocks.forEach((block) => {
        const shrunk = inset(block, 1.5);
        if (!shrunk) { return; }
        if (Math.random() < 0.08) { return; }                       // plazas
        const active = isActive(centroid(block));
        const lots: Pt[][] = [];
        const lotSplit = (poly: Pt[], depth: number): void => {
            if (area(poly) < 55 || depth > 2 || Math.random() < 0.25) { lots.push(poly); return; }
            const cut = split(poly, centroid(poly), longAxisAngle(poly) + Math.PI / 2 + rnd(-0.2, 0.2));
            if (!cut) { lots.push(poly); return; }
            lotSplit(cut.left, depth + 1);
            lotSplit(cut.right, depth + 1);
        };
        lotSplit(shrunk, 0);
        lots.forEach((lot) => {
            const b = inset(lot, 0.7);
            if (!b) { return; }
            const c = centroid(b);
            const h = active ? heightAt(c) : rnd(2.5, 11);          // grey city stays low-ish
            if (active) { maxActiveHeight = Math.max(maxActiveHeight, h); }
            buildings.push({poly: b, height: h, district: active ? districtAt(c) : 2, active});
        });
    });

    const {junctions, graph} = buildRoadGraph(roads);
    return {roads, buildings, junctions, graph, activeCenter, activeRadius, maxActiveHeight};
}

// -------------------------------------------------------------- road graph --

/**
 * Junctions = merged road endpoints + T-intersections (an endpoint of one road
 * lying on another). Each road is then split at its junctions into graph edges,
 * so paths can travel along streets and turn at crossings.
 */
function buildRoadGraph(roads: Road[]): { junctions: Pt[]; graph: RoadEdge[] } {
    const junctions: Pt[] = [];
    const EPS = 1.2;
    const addJunction = (p: Pt): number => {
        for (let i = 0; i < junctions.length; i++) {
            const j = junctions[i]!;
            if (Math.hypot(j.x - p.x, j.z - p.z) < EPS) { return i; }
        }
        junctions.push({x: p.x, z: p.z});
        return junctions.length - 1;
    };
    roads.forEach((r) => { addJunction(r.a); addJunction(r.b); });

    const graph: RoadEdge[] = [];
    const seen = new Set<string>();
    roads.forEach((r) => {
        const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z;
        const len = Math.hypot(dx, dz) || 1;
        const ux = dx / len, uz = dz / len;
        // every junction sitting on this road, ordered along it
        const on: Array<{t: number; idx: number}> = [];
        junctions.forEach((j, idx) => {
            const px = j.x - r.a.x, pz = j.z - r.a.z;
            const t = px * ux + pz * uz;
            if (t < -0.5 || t > len + 0.5) { return; }
            const off = Math.abs(px * -uz + pz * ux);
            if (off < 1.0) { on.push({t, idx}); }
        });
        on.sort((a, b) => a.t - b.t);
        for (let i = 0; i < on.length - 1; i++) {
            const a = on[i]!.idx, b = on[i + 1]!.idx;
            if (a === b) { continue; }
            const key = a < b ? a + "|" + b : b + "|" + a;
            if (seen.has(key)) { continue; }
            seen.add(key);
            const ja = junctions[a]!, jb = junctions[b]!;
            graph.push({a, b, length: Math.hypot(jb.x - ja.x, jb.z - ja.z)});
        }
    });
    return {junctions, graph};
}
