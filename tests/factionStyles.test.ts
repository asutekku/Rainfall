import {describe, expect, test} from "bun:test";
import {ARCHETYPES, factionsOfRank, pickArchetypeFrom, pickFaction,
    pickRankedFrom} from "../src/ts/actors/resources/archetypes";
import {KIT_PARTS, accentCss, formationFor, styleFor} from "../src/ts/actors/resources/factionStyles";

const FORMATIONS = ["line", "flank", "scatter", "close"];
const FACTIONS = [...new Set(ARCHETYPES.map((a) => a.faction))];

describe("faction style completeness", () => {
    test("every faction in the archetype catalog has its own visual identity", () => {
        const fallback = styleFor("__no_such_faction__");
        for (const f of FACTIONS) {
            const s = styleFor(f);
            expect(s).not.toBe(fallback);   // a real entry, not the default
            expect(s.accent).toBeGreaterThan(0);
            expect(s.parts.length).toBeGreaterThan(0);   // every faction has a silhouette tell
        }
    });

    test("every declared kit part is one the battle scene knows how to build", () => {
        for (const f of FACTIONS) {
            for (const p of styleFor(f).parts) {
                expect(KIT_PARTS).toContain(p);
            }
        }
        // archetype-level extras (bandoliers etc.) come from the same vocabulary
        for (const a of ARCHETYPES) {
            for (const p of a.parts || []) {
                expect(KIT_PARTS).toContain(p as any);
            }
        }
    });

    test("every faction resolves a legal opening formation", () => {
        for (const f of FACTIONS) {
            expect(FORMATIONS).toContain(formationFor(f));
        }
        expect(FORMATIONS).toContain(formationFor(undefined));
    });

    test("faction character shows in the formation: brawlers close, corps hold the line", () => {
        expect(formationFor("Animals")).toBe("close");
        expect(formationFor("Cyberpsycho")).toBe("close");
        expect(formationFor("Arasaka")).toBe("line");
        expect(formationFor("Tyger Claws")).toBe("flank");
    });

    test("accentCss renders a #rrggbb string", () => {
        for (const f of FACTIONS) {
            expect(accentCss(f)).toMatch(/^#[0-9a-f]{6}$/);
        }
    });
});

describe("themed faction pickers", () => {
    test("pickFaction only returns factions that field the level's rank band", () => {
        for (let i = 0; i < 20; i++) {
            const f = pickFaction(1);
            const ranks = ARCHETYPES.filter((a) => a.faction === f).map((a) => a.rank);
            expect(Math.min(...ranks)).toBeLessThanOrEqual(2);   // low-level band is ranks 1-2
        }
    });

    test("pickArchetypeFrom stays inside the faction", () => {
        for (const f of FACTIONS) {
            for (let i = 0; i < 5; i++) {
                expect(pickArchetypeFrom(f, 5).faction).toBe(f);
            }
        }
    });

    test("pickRankedFrom returns the exact rank when the faction fields it", () => {
        const a = pickRankedFrom("Maelstrom", 3);
        expect(a.faction).toBe("Maelstrom");
        expect(a.rank).toBe(3);
        // a faction without that rank falls back to any archetype of the rank
        expect(pickRankedFrom("Animals", 5).rank).toBe(5);
    });

    test("factionsOfRank finds the elite tiers", () => {
        expect(factionsOfRank(5).length).toBeGreaterThanOrEqual(2);
        for (const f of factionsOfRank(3)) {
            expect(ARCHETYPES.some((a) => a.faction === f && a.rank === 3)).toBe(true);
        }
    });

    test("the sniper and grenadier archetypes exist with the right kit", () => {
        const deadeye = ARCHETYPES.find((a) => a.title === "Deadeye")!;
        expect(deadeye.weapons).toEqual(["sniper"]);
        const bombardier = ARCHETYPES.find((a) => a.title === "Bombardier")!;
        expect(bombardier.frags).toBe(2);
        expect(bombardier.parts).toContain("bandolier");
        const grenadier = ARCHETYPES.find((a) => a.title === "Grenadier")!;
        expect(grenadier.frags).toBe(2);
    });
});
