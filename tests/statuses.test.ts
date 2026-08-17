import {describe, expect, test} from "bun:test";
import "../src/ts/interact/getItem";
import {
    ADRENALINE_AMP, BURN_TICK, MARKED_AMP, STAGGER_AMP, STATUS, SUPPRESS_CUT, StatusKey,
    activeStatuses, applyStatus, clearRoundStatuses, clearStatus, hasStatus, incomingMult,
    outgoingMult, spDelta, stacksOf, statusEdge, tickStatuses,
} from "../src/ts/interact/statuses";
import {fighter} from "./helpers";

describe("the stack grammar", () => {
    test("every status declares exactly one stack kind and explains itself", () => {
        for (const key of Object.keys(STATUS) as StatusKey[]) {
            const def = STATUS[key];
            expect(["duration", "intensity", "both"]).toContain(def.stack);
            expect(def.label.length).toBeGreaterThan(2);
            expect(def.explain(2).length).toBeGreaterThan(10);
        }
    });

    test("duration effects shed exactly one stack per turn, whatever their strength", () => {
        const a = fighter();
        applyStatus(a, "suppressed", 4);
        expect(stacksOf(a, "suppressed")).toBe(4);
        // four stacks is four turns of the same penalty, never a bigger one
        expect(outgoingMult(a)).toBeCloseTo(1 - SUPPRESS_CUT, 5);
        tickStatuses(a);
        expect(stacksOf(a, "suppressed")).toBe(3);
        expect(outgoingMult(a)).toBeCloseTo(1 - SUPPRESS_CUT, 5);
    });

    test("intensity effects stay put and scale with their count", () => {
        const a = fighter();
        applyStatus(a, "shred", 3);
        tickStatuses(a);
        tickStatuses(a);
        expect(stacksOf(a, "shred")).toBe(3);
        expect(spDelta(a)).toBe(-3);
    });

    test("stacks add rather than overwrite — three wounds are three wounds", () => {
        const a = fighter();
        applyStatus(a, "bleed", 2);
        applyStatus(a, "bleed", 3);
        expect(stacksOf(a, "bleed")).toBe(5);
    });

    test("a capped status refuses to go past its ceiling", () => {
        const a = fighter();
        applyStatus(a, "stunned", 9);
        expect(stacksOf(a, "stunned")).toBe(1);
    });
});

describe("damage over time", () => {
    test("bleed is the deliberate exception: it ticks at full strength, then fades", () => {
        const a = fighter();
        applyStatus(a, "bleed", 3);
        expect(tickStatuses(a).damage).toBe(3);
        expect(stacksOf(a, "bleed")).toBe(2);
        expect(tickStatuses(a).damage).toBe(2);
        expect(tickStatuses(a).damage).toBe(1);
        expect(tickStatuses(a).damage).toBe(0);
        expect(hasStatus(a, "bleed")).toBe(false);
    });

    test("toxin never fades — that is what makes it the attrition answer", () => {
        const a = fighter();
        applyStatus(a, "toxin", 2);
        for (let i = 0; i < 6; i++) { expect(tickStatuses(a).damage).toBe(2); }
        expect(stacksOf(a, "toxin")).toBe(2);
    });

    test("burn takes plate with it every turn it lasts", () => {
        const a = fighter();
        applyStatus(a, "burn", 2);
        const first = tickStatuses(a);
        expect(first.damage).toBe(BURN_TICK);
        expect(first.shredded).toBe(1);
        expect(stacksOf(a, "shred")).toBe(1);
        expect(stacksOf(a, "burn")).toBe(1);
        tickStatuses(a);
        expect(stacksOf(a, "shred")).toBe(2);
        expect(hasStatus(a, "burn")).toBe(false);
    });

    test("the tick names what did the damage, and stacks all three", () => {
        const a = fighter();
        applyStatus(a, "bleed", 2);
        applyStatus(a, "toxin", 1);
        applyStatus(a, "burn", 1);
        const t = tickStatuses(a);
        expect(t.damage).toBe(2 + 1 + BURN_TICK);
        expect(t.sources.sort()).toEqual(["bleed", "burn", "toxin"]);
    });
});

describe("Ward — the counterplay", () => {
    test("a ward eats a whole debuff application, not one stack of it", () => {
        const a = fighter();
        applyStatus(a, "ward", 1);
        expect(applyStatus(a, "bleed", 5)).toBe(0);
        expect(hasStatus(a, "bleed")).toBe(false);
        expect(hasStatus(a, "ward")).toBe(false);   // and is spent doing it
    });

    test("wards do not block buffs — you can still be helped", () => {
        const a = fighter();
        applyStatus(a, "ward", 2);
        applyStatus(a, "hardened", 3);
        expect(stacksOf(a, "hardened")).toBe(3);
        expect(stacksOf(a, "ward")).toBe(2);
    });

    test("once the wards are gone the debuffs land normally", () => {
        const a = fighter();
        applyStatus(a, "ward", 1);
        applyStatus(a, "toxin", 2);   // eaten
        applyStatus(a, "toxin", 2);   // lands
        expect(stacksOf(a, "toxin")).toBe(2);
    });
});

describe("the damage pipeline modifiers", () => {
    test("suppression cuts what you deal; adrenaline raises it", () => {
        const a = fighter();
        expect(outgoingMult(a)).toBe(1);
        applyStatus(a, "suppressed", 1);
        expect(outgoingMult(a)).toBeCloseTo(1 - SUPPRESS_CUT, 5);
        applyStatus(a, "adrenaline", 1);
        expect(outgoingMult(a)).toBeCloseTo(1 - SUPPRESS_CUT + ADRENALINE_AMP, 5);
    });

    test("marking raises what everyone deals to you, not just the sniper", () => {
        const t = fighter();
        applyStatus(t, "marked", 2);
        expect(incomingMult(t)).toBeCloseTo(1 + MARKED_AMP, 5);
    });

    test("focus fire compounds within a round and resets between them", () => {
        const t = fighter();
        applyStatus(t, "staggered", 3);
        expect(incomingMult(t)).toBeCloseTo(1 + 3 * STAGGER_AMP, 5);
        clearRoundStatuses(t);
        expect(incomingMult(t)).toBe(1);
    });

    test("armour moves both ways", () => {
        const a = fighter();
        applyStatus(a, "hardened", 4);
        applyStatus(a, "shred", 1);
        expect(spDelta(a)).toBe(3);
    });

    test("blinding costs accuracy instead of the turn", () => {
        const a = fighter();
        expect(statusEdge(a)).toBe(0);
        applyStatus(a, "blinded", 1);
        expect(statusEdge(a)).toBeLessThan(0);
    });

    test("no modifier can drive a hit to nothing — that was the old model's bug", () => {
        const a = fighter();
        applyStatus(a, "suppressed", 5);
        expect(outgoingMult(a)).toBeGreaterThan(0);
    });
});

describe("fried chrome", () => {
    test("an EMP takes the subdermal plate and the implant edge offline", () => {
        const a = fighter();
        const sp = a.cyberSP();
        applyStatus(a, "fried", 2);
        expect(a.cyberSP()).toBe(0);
        expect(a.cyberInitiative()).toBe(0);
        expect(a.cyberAttackBonus()).toBe(0);
        clearStatus(a, "fried");
        expect(a.cyberSP()).toBe(sp);
    });
});

describe("what the UI reads", () => {
    test("active statuses come back worst-first so two chips are the right two", () => {
        const a = fighter();
        applyStatus(a, "hardened", 1);
        applyStatus(a, "bleed", 1);
        applyStatus(a, "stunned", 1);
        expect(activeStatuses(a).map(([k]) => k)).toEqual(["stunned", "bleed", "hardened"]);
    });

    test("nothing on a unit reads as nothing", () => {
        expect(activeStatuses(fighter())).toEqual([]);
    });
});
