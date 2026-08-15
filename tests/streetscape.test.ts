import {describe, expect, test} from "bun:test";
import {CoverSpot} from "../src/ts/interact/battlefield";
import {generateStreetscape} from "../src/ts/interact/streetscape";

const COVERS: CoverSpot[] = [
    {x: -8, y: 16, kind: "car"},
    {x: 7, y: 18, kind: "crate"},
    {x: 0, y: 12, kind: "pillar"},
];

describe("generateStreetscape", () => {
    test("is deterministic per seed — a battle's street survives re-mounts", () => {
        const a = generateStreetscape(42, COVERS);
        const b = generateStreetscape(42, COVERS);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    test("different seeds build different streets", () => {
        const a = generateStreetscape(1, COVERS);
        const b = generateStreetscape(2, COVERS);
        expect(JSON.stringify(a.buildings)).not.toBe(JSON.stringify(b.buildings));
    });

    test("street-wall buildings never intrude into the playfield", () => {
        const s = generateStreetscape(7, COVERS);
        for (const b of s.buildings) {
            expect(Math.abs(b.x) - b.w / 2).toBeGreaterThanOrEqual(s.walkHalf - 1e-6);
        }
    });

    test("the far backdrop closes the canyon beyond the arena", () => {
        const s = generateStreetscape(7, COVERS);
        expect(s.backdrop.length).toBeGreaterThan(0);
        for (const b of s.backdrop) {
            expect(b.y - b.d / 2).toBeGreaterThan(44);   // past the far deploy edge
        }
    });

    test("gameplay cover passes through with kind and position intact", () => {
        const s = generateStreetscape(13, COVERS);
        expect(s.covers.length).toBe(COVERS.length);
        s.covers.forEach((c, i) => {
            expect(c.x).toBe(COVERS[i]!.x);
            expect(c.y).toBe(COVERS[i]!.y);
            expect(c.kind).toBe(COVERS[i]!.kind);
        });
    });

    test("dressing stays in its lanes: puddles on the road, lights off it", () => {
        const s = generateStreetscape(21, COVERS);
        expect(s.puddles.length).toBeGreaterThan(0);
        for (const p of s.puddles) {
            expect(Math.abs(p.x)).toBeLessThanOrEqual(s.roadHalf);
        }
        expect(s.lights.length).toBeGreaterThan(2);
        for (const l of s.lights) {
            expect(Math.abs(l.x)).toBeGreaterThan(s.roadHalf);
        }
        expect(s.signs.length).toBeGreaterThan(0);
        expect(s.cables.length).toBeGreaterThan(0);
    });
});
