import {describe, expect, test} from "bun:test";
import {Actor} from "../src/ts/actors/Actor";
import {Adversary} from "../src/ts/actors/Enemies/Adversary";
import {ARCHETYPES} from "../src/ts/actors/resources/archetypes";
import {Armor} from "../src/ts/items/Armor";
import {PLATE_SP, PROFILE, PROFILE_ORDER, profileFrom, profileOf, profileTally}
    from "../src/ts/interact/profile";
import {applyStatus} from "../src/ts/interact/statuses";
import {fighter} from "./helpers";

/** An actor wearing exactly `sp` of body armour and nothing else. */
function inArmour(sp: number): Actor {
    const a = fighter();
    a.equipment.upper = new Armor("upper", "Test Plate", "", 1, sp, 0, "");
    return a;
}

describe("the rule reads armour, not labels", () => {
    test("plate starts where the armour ladder gets real", () => {
        expect(profileOf(inArmour(PLATE_SP))).toBe("plate");
        expect(profileOf(inArmour(PLATE_SP - 1))).toBe("ghost");
    });

    test("no armour at all is a Ghost, however tough the body is", () => {
        // Mechanically correct even when it reads oddly: volume and area are
        // what kill an unarmoured brawler, which is what Ghost tells you.
        const brute = inArmour(0);
        brute.setCombatProfile({body: 10, will: 9});
        expect(profileOf(brute)).toBe("ghost");
    });

    test("chrome wins over plate — an EMP is the more useful thing to say", () => {
        expect(profileFrom(18, 0, "Chrome")).toBe("chrome");
        expect(profileFrom(15, 0, "Cyberpsycho")).toBe("chrome");
    });

    test("a subdermal only defines you while it beats your jacket", () => {
        expect(profileFrom(13, 4)).toBe("plate");    // jacket is doing the work
        expect(profileFrom(4, 13)).toBe("chrome");   // the wiring is
    });

    test("the hire board and the street agree", () => {
        // The board reasons about a MercOffer, the staging screen about an
        // Actor. Same rule, or the player shops blind.
        [0, 7, 11, 13].forEach((sp) => {
            expect(profileFrom(sp, 0)).toBe(profileOf(inArmour(sp)));
        });
    });
});

describe("the profile is live state, not a stored tag", () => {
    test("frying a chromed body moves it off Chrome", () => {
        const a = inArmour(4);
        a.cybernetics.push({effects: {sp: 12}} as any);
        expect(profileOf(a)).toBe("chrome");
        applyStatus(a, "fried", 2);
        // cyberSP() reports 0 while fried — the Netrunner's work is visible on
        // the badge, which is the point of deriving rather than tagging.
        expect(profileOf(a)).toBe("ghost");
    });

    test("shredding a heavy's plate off drops them out of Plate", () => {
        const a = inArmour(PLATE_SP);
        expect(profileOf(a)).toBe("plate");
        a.equipment.upper!.stoppingPower = PLATE_SP - 3;
        expect(profileOf(a)).toBe("ghost");
    });
});

describe("every archetype reads as something, and the spread is playable", () => {
    const built = ARCHETYPES.map((a) => new Adversary(a, 5));

    test("all three profiles are represented across the enemy table", () => {
        const seen = new Set(built.map(profileOf));
        PROFILE_ORDER.forEach((p) => expect(seen.has(p)).toBe(true));
    });

    test("no single profile owns the table", () => {
        // A triangle where two thirds of the game is one answer is not a
        // triangle. Each profile should carry at least a fifth of the roster.
        PROFILE_ORDER.forEach((p) => {
            const share = built.filter((b) => profileOf(b) === p).length / built.length;
            expect(share).toBeGreaterThan(0.15);
        });
    });

    test("the opening sector teaches Ghost before anything else", () => {
        // Rank 1 is the tutorial in disguise: every mook you meet first should
        // answer to volume, so the first lesson is the cheapest one.
        ARCHETYPES.filter((a) => a.rank === 1)
            .forEach((a) => expect(profileOf(new Adversary(a, 1))).toBe("ghost"));
    });

    test("every profile names what beats it", () => {
        PROFILE_ORDER.forEach((p) => {
            expect(PROFILE[p].counter.length).toBeGreaterThan(0);
            expect(PROFILE[p].glyph.length).toBeGreaterThan(0);
        });
    });
});

describe("a wave sums up for the staging screen", () => {
    test("tally counts each profile and drops the empty ones", () => {
        const wave = [inArmour(0), inArmour(0), inArmour(13)];
        const tally = profileTally(wave);
        expect(tally).toEqual([["plate", 1], ["ghost", 2]]);
    });

    test("an empty street tallies to nothing", () => {
        expect(profileTally([])).toEqual([]);
    });
});
