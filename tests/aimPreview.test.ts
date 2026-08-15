import {describe, expect, test} from "bun:test";
import {aimPreview} from "../src/ts/interact/aimPreview";
import {Battlefield} from "../src/ts/interact/battlefield";
import {fighter} from "./helpers";

describe("aimPreview — the order bar's to-hit odds", () => {
    test("a crack shot at close range is near-certain (only a fumble misses)", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 0});
        const foe = fighter({x: 0, y: 10});
        const p = aimPreview(me, foe);
        expect(p.ok).toBe(true);
        expect(p.dist).toBeCloseTo(10, 5);
        expect(p.pct).toBeGreaterThanOrEqual(90);
        expect(p.pct).toBeLessThanOrEqual(100);
    });

    test("an untrained shooter at long range has poor odds", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 2, skill: 0, weapon: "WSA Autopistol", x: 0, y: 0});
        const foe = fighter({x: 0, y: 45});
        const p = aimPreview(me, foe);
        expect(p.ok).toBe(true);
        expect(p.pct).toBeLessThan(30);
    });

    test("out of range means no shot at all", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 0});
        const foe = fighter({x: 0, y: 0});
        foe.position.y = 600;
        expect(aimPreview(me, foe).ok).toBe(false);
    });

    test("cover between shooter and target lowers the odds and flags it", () => {
        const me = fighter({ref: 6, skill: 4, weapon: "WSA Autopistol", x: 0, y: 0});
        const foe = fighter({x: 0, y: 20});
        Battlefield.COVER = [];
        const open = aimPreview(me, foe);
        Battlefield.COVER = [{x: 0, y: 18, kind: "barrier"}];
        const behind = aimPreview(me, foe);
        expect(open.covered).toBe(false);
        expect(behind.covered).toBe(true);
        expect(behind.pct).toBeLessThan(open.pct);
    });

    test("an aimed head shot trades odds for damage (-8 to hit)", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 6, skill: 4, weapon: "WSA Autopistol", x: 0, y: 0});
        const foe = fighter({x: 0, y: 10});
        expect(aimPreview(me, foe, undefined, true).pct).toBeLessThan(aimPreview(me, foe).pct);
    });

    test("odds can be previewed from a planned firing position", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 6, skill: 4, weapon: "WSA Autopistol", x: 0, y: 0});
        const foe = fighter({x: 0, y: 40});
        const here = aimPreview(me, foe);
        const closer = aimPreview(me, foe, {x: 0, y: 25});
        expect(closer.dist).toBeCloseTo(15, 5);
        expect(closer.pct).toBeGreaterThan(here.pct);
    });

    test("melee needs reach", () => {
        const me = fighter({dex: 8, skill: 8, weapon: "Knife", x: 0, y: 0});
        const foe = fighter({x: 0, y: 10});
        expect(aimPreview(me, foe).ok).toBe(false);
        expect(aimPreview(me, foe).melee).toBe(true);
        foe.position.y = 3;
        const p = aimPreview(me, foe);
        expect(p.ok).toBe(true);
        expect(p.pct).toBeGreaterThan(50);
    });
});
