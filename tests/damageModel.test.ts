import {describe, expect, test} from "bun:test";
import {AIMED_MULT, DAMAGE_FLOOR, QUALITY_MULT, applySoak, coverEdge, expectedMult,
    outOfRange, qualityOdds, rangeEdge, rollQuality, soak} from "../src/ts/interact/damageModel";

describe("armour soaks a share, never everything", () => {
    test("soak rises with SP and never reaches 1", () => {
        expect(soak(0)).toBe(0);
        for (let sp = 1; sp <= 40; sp++) {
            expect(soak(sp)).toBeGreaterThan(soak(sp - 1));
            expect(soak(sp)).toBeLessThan(1);
        }
    });

    test("every point of SP is worth something — no breakpoints, no walls", () => {
        // the old model: 1d6 (mean 3.5) vs SP 12 dealt zero, 100% of the time
        for (let sp = 0; sp <= 30; sp++) {
            expect(applySoak(4, sp)).toBeGreaterThan(0);
            expect(applySoak(20, sp)).toBeGreaterThan(0);
        }
    });

    test("the floor guarantees a share of every hit gets through", () => {
        for (const raw of [1, 4, 14, 30]) {
            expect(applySoak(raw, 999)).toBe(Math.ceil(raw * DAMAGE_FLOOR));
        }
    });

    test("heavier plate always keeps more of the same hit", () => {
        let last = applySoak(24, 0);
        for (const sp of [4, 8, 12, 16, 20, 25]) {
            const now = applySoak(24, sp);
            expect(now).toBeLessThanOrEqual(last);
            last = now;
        }
    });

    test("AP beats armour at every value, not just at a breakpoint", () => {
        for (const sp of [4, 8, 12, 18, 25]) {
            expect(applySoak(20, sp, true)).toBeGreaterThan(applySoak(20, sp, false));
        }
    });

    test("nothing in, nothing out", () => {
        expect(applySoak(0, 10)).toBe(0);
        expect(applySoak(-5, 10)).toBe(0);
    });
});

describe("range is a curve, not a cliff", () => {
    test("a weapon inside its sweet spot pays nothing", () => {
        expect(rangeEdge("pistol", 5)).toBe(0);
        expect(rangeEdge("pistol", 12)).toBe(0);
        expect(rangeEdge("rifle", 40)).toBe(0);
        expect(rangeEdge("sniper", 300)).toBe(0);
    });

    test("accuracy falls off in both directions, and being close can be wrong", () => {
        expect(rangeEdge("pistol", 40)).toBeLessThan(0);
        // a sniper in a doorway is bad at it — but still shoots
        expect(rangeEdge("sniper", 3)).toBeLessThan(0);
        expect(outOfRange("sniper", 3)).toBe(false);
    });

    test("falloff is monotonic and bounded", () => {
        let last = 0;
        for (const d of [10, 30, 60, 120, 300]) {
            const e = rangeEdge("pistol", d);
            expect(e).toBeLessThanOrEqual(last);
            expect(e).toBeGreaterThanOrEqual(-20);
            last = e;
        }
    });

    test("reach still ends somewhere", () => {
        expect(outOfRange("pistol", 50)).toBe(false);
        expect(outOfRange("pistol", 300)).toBe(true);
        expect(outOfRange("rifle", 700)).toBe(false);
    });

    test("cover is worth materially more than its raw DV number", () => {
        expect(coverEdge(4)).toBeLessThan(-4);
    });
});

describe("shot quality: every shot produces a number", () => {
    test("the odds always form a distribution", () => {
        for (let edge = -20; edge <= 30; edge++) {
            const o = qualityOdds(edge);
            const sum = o.miss + o.graze + o.hit + o.crit;
            expect(sum).toBeCloseTo(1, 6);
            for (const v of [o.miss, o.graze, o.hit, o.crit]) {
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            }
        }
    });

    test("a miss survives only as a fumble — it can never be the common case", () => {
        for (let edge = -20; edge <= 30; edge++) {
            expect(qualityOdds(edge).miss).toBeLessThanOrEqual(0.25);
        }
        // at any edge a competent shooter actually has, whiffing is rare
        expect(qualityOdds(12).miss).toBeLessThanOrEqual(0.03);
    });

    test("skill buys crits and sells grazes", () => {
        const weak = qualityOdds(4), strong = qualityOdds(18);
        expect(strong.crit).toBeGreaterThan(weak.crit);
        expect(strong.graze).toBeLessThan(weak.graze);
    });

    test("expected damage rises with the edge, and stays in a sane band", () => {
        let last = -1;
        for (let edge = -25; edge <= 30; edge++) {
            const m = expectedMult(edge);
            expect(m).toBeGreaterThanOrEqual(last);   // flat only where the odds clamp
            expect(m).toBeGreaterThan(0.5);   // even a terrible shot is not a wasted turn
            expect(m).toBeLessThan(1.5);
            last = m;
        }
        // and it genuinely moves across the range play actually produces
        expect(expectedMult(8) - expectedMult(-4)).toBeGreaterThan(0.2);
    });

    test("the draw matches the odds it was given", () => {
        const edge = 12;
        const o = qualityOdds(edge);
        expect(rollQuality(edge, 0)).toBe("miss");
        expect(rollQuality(edge, o.miss + 0.001)).toBe("graze");
        expect(rollQuality(edge, o.miss + o.graze + 0.001)).toBe("crit");
        expect(rollQuality(edge, 0.999)).toBe("hit");
    });

    test("multipliers order the bands the way the words promise", () => {
        expect(QUALITY_MULT.miss).toBe(0);
        expect(QUALITY_MULT.graze).toBeLessThan(QUALITY_MULT.hit);
        expect(QUALITY_MULT.hit).toBeLessThan(QUALITY_MULT.crit);
    });

    test("an aimed shot is a trade, not a free upgrade", () => {
        // it pays real accuracy for its bonus, so it cannot dominate a normal shot
        expect(AIMED_MULT).toBeGreaterThan(1);
        expect(AIMED_MULT).toBeLessThan(QUALITY_MULT.crit);
    });
});
