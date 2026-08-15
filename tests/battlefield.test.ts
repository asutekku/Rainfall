import {describe, expect, test} from "bun:test";
import {Battlefield, CoverKind} from "../src/ts/interact/battlefield";
import {fighter} from "./helpers";

const KINDS: CoverKind[] = ["car", "crate", "barrier", "dumpster", "pillar"];

describe("Battlefield deployment", () => {
    test("deploy puts the squad on the near line and hostiles on the far band", () => {
        const party = [fighter(), fighter()];
        const enemies = [fighter(), fighter(), fighter()];
        Battlefield.deploy(party, enemies);
        party.forEach((p) => expect(p.position.y).toBe(5));
        enemies.forEach((e) => {
            expect(e.position.y).toBeGreaterThanOrEqual(25);
            expect(e.position.y).toBeLessThanOrEqual(35);
        });
        // spread, not stacked
        expect(party[0]!.position.x).not.toBe(party[1]!.position.x);
    });

    test("every deployment rolls fresh, well-spaced, typed cover", () => {
        Battlefield.deploy([fighter()], [fighter()]);
        const cover = Battlefield.COVER;
        expect(cover.length).toBeGreaterThanOrEqual(3);
        expect(cover.length).toBeLessThanOrEqual(7);
        for (const c of cover) {
            expect(KINDS).toContain(c.kind);
            expect(c.x).toBeGreaterThanOrEqual(-18);
            expect(c.x).toBeLessThanOrEqual(18);
            // mid-field band, clear of both deploy lines
            expect(c.y).toBeGreaterThanOrEqual(10);
            expect(c.y).toBeLessThanOrEqual(23);
        }
        for (let i = 0; i < cover.length; i++) {
            for (let j = i + 1; j < cover.length; j++) {
                const gap = Math.hypot(cover[i]!.x - cover[j]!.x, cover[i]!.y - cover[j]!.y);
                expect(gap).toBeGreaterThanOrEqual(6.5);
            }
        }
    });
});

describe("cover geometry", () => {
    test("cover only shields when it sits between attacker and target", () => {
        Battlefield.COVER = [{x: 0, y: 18, kind: "crate"}];
        const target = {x: 0, y: 20};
        // shooting from the near side: the crate is in the way
        expect(Battlefield.coverPenaltyAt(target, {x: 0, y: 5})).toBe(4);
        // shooting from behind the target: the crate does nothing
        expect(Battlefield.coverPenaltyAt(target, {x: 0, y: 30})).toBe(0);
        // target too far from the crate to benefit
        expect(Battlefield.coverPenaltyAt({x: 10, y: 20}, {x: 10, y: 5})).toBe(0);
    });

    test("nearCover matches the benefit radius", () => {
        Battlefield.COVER = [{x: 0, y: 18, kind: "barrier"}];
        expect(Battlefield.nearCover({x: 0, y: 20})).toBe(true);
        expect(Battlefield.nearCover({x: 0, y: 24})).toBe(false);
    });
});

describe("movement", () => {
    test("stepToward is capped at the run allowance", () => {
        Battlefield.COVER = [];
        const a = fighter({x: 0, y: 0});
        const moved = Battlefield.stepToward(a, {x: 0, y: 40}, 10, []);
        expect(moved).toBeCloseTo(10, 5);
        expect(a.position.y).toBeCloseTo(10, 5);
    });

    test("units resolve off occupied cells instead of stacking", () => {
        Battlefield.COVER = [];
        const blocker = fighter({x: 0, y: 20});
        const mover = fighter({x: 0, y: 10});
        Battlefield.stepToward(mover, {x: 0, y: 20}, 50, [blocker]);
        const gap = Math.hypot(mover.position.x - blocker.position.x, mover.position.y - blocker.position.y);
        expect(gap).toBeGreaterThanOrEqual(2.5);
    });

    test("units hug cover, they don't stand on the object itself", () => {
        Battlefield.COVER = [{x: 0, y: 18, kind: "car"}];
        const mover = fighter({x: 0, y: 12});
        Battlefield.stepToward(mover, {x: 0, y: 18}, 50, []);
        const gap = Math.hypot(mover.position.x, mover.position.y - 18);
        expect(gap).toBeGreaterThanOrEqual(1.5);
        // ... but still close enough to count as in cover
        expect(Battlefield.nearCover({x: mover.position.x, y: mover.position.y})).toBe(true);
    });

    test("clamp keeps points inside the arena", () => {
        expect(Battlefield.clamp({x: -99, y: 99})).toEqual({x: -24, y: 44});
        expect(Battlefield.clamp({x: 5, y: 5})).toEqual({x: 5, y: 5});
    });
});

describe("iso projection", () => {
    test("unproject inverts project for interior points", () => {
        for (const p of [{x: 0, y: 22}, {x: -10, y: 10}, {x: 15, y: 35}]) {
            const round = Battlefield.unproject(Battlefield.project(p).x, Battlefield.project(p).y);
            expect(round.x).toBeCloseTo(p.x, 3);
            expect(round.y).toBeCloseTo(p.y, 3);
        }
    });
});
