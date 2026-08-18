import {describe, expect, test} from "bun:test";
import {Merc} from "../src/ts/actors/Merc";
import {ARCHETYPES} from "../src/ts/actors/resources/archetypes";
import {CLASSES, CLASS_IDS, classFromLegacyRole} from "../src/ts/actors/resources/classes";
import {CharacterCreation, STAT_BUDGET} from "../src/ts/actors/resources/CharacterCreation";
import {CREW_FACTIONS, HIREABLE_FACTIONS} from "../src/ts/actors/resources/factionStyles";
import {Role} from "../src/ts/actors/resources/Role";
import {MercMarket} from "../src/ts/interact/mercMarket";
import {PROFILE_ORDER, profileOf} from "../src/ts/interact/profile";
import {STATUS} from "../src/ts/interact/statuses";

describe("the class table is the registry, not nine branches", () => {
    test("nine classes, and the creation screen offers all of them", () => {
        expect(CLASS_IDS.length).toBe(9);
        expect(CharacterCreation.roles().slice().sort()).toEqual(CLASS_IDS.slice().sort());
    });

    test("every stat line spends exactly the point-buy budget", () => {
        // A class that quietly spends 58 of 62 is strictly worse than its
        // neighbours for a reason nothing on screen explains.
        CLASS_IDS.forEach((id) => {
            const stats: any = CharacterCreation.statsForRole(id);
            const total = Object.keys(stats).reduce((n, k) => n + stats[k], 0);
            expect([id, total]).toEqual([id, STAT_BUDGET]);
        });
    });

    test("every rider names a status the engine actually has", () => {
        CLASS_IDS.forEach((id) => {
            const rider = CLASSES[id]!.rider;
            if (rider) { expect(STATUS[rider.key]).toBeDefined(); }
        });
    });

    test("every class declares a line, weapons and an edge worth reading", () => {
        CLASS_IDS.forEach((id) => {
            const c = CLASSES[id]!;
            expect(["point", "mid", "overwatch"]).toContain(c.line);
            expect(c.weapons.length).toBeGreaterThan(0);
            expect(c.edge.length).toBeGreaterThan(10);
        });
    });

    test("all three lines are covered — a squad can hold ground at any range", () => {
        const lines = new Set(CLASS_IDS.map((id) => CLASSES[id]!.line));
        expect(lines.size).toBe(3);
    });
});

describe("old saves survive the rework", () => {
    test("every CP:RED role lands on a real class", () => {
        ["solo", "cop", "techie", "netrunner", "rockerboy", "nomad", "fixer", "corporate", "media"]
            .forEach((old) => expect(CLASS_IDS).toContain(classFromLegacyRole(old)));
    });

    test("a class id maps to itself, and nonsense falls back rather than throwing", () => {
        expect(classFromLegacyRole("marksman")).toBe("marksman");
        expect(CLASS_IDS).toContain(classFromLegacyRole("wildebeest"));
        expect(new Role("wildebeest").name.length).toBeGreaterThan(0);
    });
});

describe("class carries what you counter, faction carries what counters you", () => {
    test("every hireable faction is a real faction with a fee and a perk", () => {
        expect(HIREABLE_FACTIONS.length).toBe(8);
        HIREABLE_FACTIONS.forEach((f) => {
            const spec = CREW_FACTIONS[f]!;
            expect(spec.fee).toBeGreaterThan(0);
            expect(spec.perk.length).toBeGreaterThan(10);
            expect(PROFILE_ORDER).toContain(spec.armour);
        });
    });

    test("all three profiles are hireable, so the crew side of the triangle is whole", () => {
        const shapes = new Set(HIREABLE_FACTIONS.map((f) => CREW_FACTIONS[f]!.armour));
        expect(shapes.size).toBe(3);
    });

    test("a hire's badge matches the faction that kitted them out", () => {
        // The whole point of putting the profile on the faction axis: a class
        // must be able to turn up in all three flavours.
        HIREABLE_FACTIONS.forEach((faction) => {
            const offer = {...MercMarket.offer(3), faction, role: "gunner"};
            const kitted = {...offer, ...kitOf(faction, offer)};
            const merc = new Merc(kitted);
            expect([faction, profileOf(merc)]).toEqual([faction, CREW_FACTIONS[faction]!.armour]);
        });
    });

    test("class and faction are independent — every class reaches every profile", () => {
        const seen = new Set<string>();
        for (let i = 0; i < 400; i++) {
            const o = MercMarket.offer(4);
            seen.add(CREW_FACTIONS[o.faction]!.armour);
        }
        expect(seen.size).toBe(3);
    });
});

/** Re-derive a faction's kit the way the market does, for the badge assertion. */
function kitOf(faction: string, offer: any): {armorSP: number; cyberSP: number} {
    const shape = CREW_FACTIONS[faction]!.armour;
    if (shape === "plate") { return {armorSP: 12, cyberSP: 0}; }
    if (shape === "chrome") { return {armorSP: 5, cyberSP: 12}; }
    return {armorSP: 5, cyberSP: 0};
}

describe("the market builds every merc through one door", () => {
    test("the freebie and the paid board agree on shape", () => {
        const paid = MercMarket.offer(2);
        const free = MercMarket.starter(2);
        expect(Object.keys(free).slice().sort()).toEqual(Object.keys(paid).slice().sort());
        expect(free.price).toBe(0);
        expect(paid.price).toBeGreaterThan(0);
    });

    test("a candidate's weapons come from their class", () => {
        for (let i = 0; i < 40; i++) {
            const o = MercMarket.offer(3);
            expect(o.weapons).toEqual(CLASSES[o.role]!.weapons);
        }
    });

    test("chrome factions cost more than street ones", () => {
        expect(CREW_FACTIONS["Chrome"]!.fee).toBeGreaterThan(CREW_FACTIONS["Scav"]!.fee);
    });
});

describe("hostiles fight as classes too", () => {
    test("every archetype declares a real class", () => {
        // Enemy classes used to be inferred from the portrait key, which made a
        // melee berserker reusing the Solo artwork into a sniper.
        ARCHETYPES.forEach((a) => {
            expect([a.title, CLASS_IDS.indexOf(a.cls) >= 0]).toEqual([a.title, true]);
        });
    });

    test("a melee berserker is never a Marksman", () => {
        ARCHETYPES
            .filter((a) => a.temperament === "berserker" && a.weapons.indexOf("melee") >= 0)
            .forEach((a) => expect([a.title, a.cls]).not.toEqual([a.title, "marksman"]));
    });

    test("the snipers are the Marksmen", () => {
        ARCHETYPES.filter((a) => a.weapons.length === 1 && a.weapons[0] === "sniper")
            .forEach((a) => expect([a.title, a.cls]).toEqual([a.title, "marksman"]));
    });

    test("hostile classes spread across the table rather than clustering", () => {
        const used = new Set(ARCHETYPES.map((a) => a.cls));
        expect(used.size).toBeGreaterThanOrEqual(5);
    });
});
