/**
 * Cheap procedural city generator for the holographic run map.
 *
 * Technique: recursive ANGLED binary subdivision of the city polygon (the
 * OBB-split approach from the procedural-cities literature — the cheap cousin
 * of Voronoi partitioning). Each split is a straight cut roughly across the
 * block's long axis with random jitter, so the road network comes out as
 * angled straight avenues rather than a square grid. The first few cuts are
 * wide glowing arterials, deeper cuts are narrow side streets. Leaf polygons
 * become city blocks; blocks are split once more (without roads) into lots,
 * and each lot extrudes to a building whose height comes from its district —
 * a downtown core of high-rises falling off to low sprawl at the edges.
 *
 * Pure math, no three.js imports — returns polygons/segments the renderer
 * turns into merged geometry.
 */

export interface Pt { x: number; z: number; }
export interface Road { a: Pt; b: Pt; width: number; major: boolean; }
export interface Building { poly: Pt[]; height: number; district: number; }

export interface City {
    roads: Road[];
    buildings: Building[];
    extentX: number;   // half-extent on x
    extentZ: number;   // half-extent on z
    maxHeight: number;
    downtown: Pt;
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

/**
 * Split a convex polygon with the line through `c` along direction `ang`.
 * Returns the two halves and the cut segment (for the road).
 */
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
        let nx = -dz / l, nz = dx / l;                       // edge normal
        if (nx * (c.x - a.x) + nz * (c.z - a.z) < 0) { nx = -nx; nz = -nz; }  // point inward
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

// -------------------------------------------------------------- generation --

export function generateCity(): City {
    const EX = 88, EZ = 72;
    // slightly irregular city boundary (chamfered corners), so edges aren't a box
    const boundary: Pt[] = [
        {x: -EX + rnd(0, 18), z: -EZ}, {x: EX - rnd(0, 18), z: -EZ},
        {x: EX, z: -EZ + rnd(8, 22)}, {x: EX, z: EZ - rnd(0, 14)},
        {x: EX - rnd(6, 24), z: EZ}, {x: -EX + rnd(6, 24), z: EZ},
        {x: -EX, z: EZ - rnd(4, 18)}, {x: -EX, z: -EZ + rnd(4, 18)},
    ];

    const roads: Road[] = [];
    const blocks: Pt[][] = [];

    // recursive angled subdivision; depth 0-1 cuts are arterials
    const carve = (poly: Pt[], depth: number): void => {
        const a = area(poly);
        if (a < 260 || depth > 6) { blocks.push(poly); return; }
        const jitter = depth < 2 ? rnd(-0.5, 0.5) : rnd(-0.35, 0.35);
        const ang = longAxisAngle(poly) + Math.PI / 2 + jitter;   // across the long axis, angled
        const c = centroid(poly);
        const off = Math.sqrt(a) * 0.16;
        const cut = split(poly, {x: c.x + rnd(-off, off), z: c.z + rnd(-off, off)}, ang);
        if (!cut) { blocks.push(poly); return; }
        const major = depth < 2;
        roads.push({a: cut.cut[0], b: cut.cut[1], width: major ? 3.4 : depth < 4 ? 1.9 : 1.2, major});
        carve(cut.left, depth + 1);
        carve(cut.right, depth + 1);
    };
    carve(boundary, 0);

    // districts: a downtown core + a secondary cluster; height falls off from downtown
    const downtown: Pt = {x: rnd(-EX * 0.3, EX * 0.3), z: rnd(-EZ * 0.3, EZ * 0.3)};
    const second: Pt = {x: -downtown.x * rnd(0.7, 1.1), z: -downtown.z * rnd(0.7, 1.1)};
    const heightAt = (p: Pt): number => {
        const d1 = Math.hypot(p.x - downtown.x, p.z - downtown.z);
        const d2 = Math.hypot(p.x - second.x, p.z - second.z);
        const core = Math.max(0, 1 - d1 / 52);
        const sub = Math.max(0, 1 - d2 / 44) * 0.45;
        const t = Math.max(core, sub);
        let h = 2.5 + t * t * rnd(24, 34) + rnd(0, 3);
        if (core > 0.72 && Math.random() < 0.3) { h += rnd(10, 20); }   // downtown supertowers
        return h;
    };
    const districtAt = (p: Pt): number => {
        const d1 = Math.hypot(p.x - downtown.x, p.z - downtown.z);
        return d1 < 30 ? 0 : d1 < 58 ? 1 : 2;                          // core / mid / sprawl
    };

    // blocks → lots → buildings (lot splits leave a hairline gap, no road)
    const buildings: Building[] = [];
    let maxHeight = 0;
    blocks.forEach((block) => {
        const shrunk = inset(block, 1.5);
        if (!shrunk) { return; }
        if (Math.random() < 0.08) { return; }                          // plazas / lots left dark
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
            const h = heightAt(c);
            maxHeight = Math.max(maxHeight, h);
            buildings.push({poly: b, height: h, district: districtAt(c)});
        });
    });

    return {roads, buildings, extentX: EX, extentZ: EZ, maxHeight, downtown};
}
