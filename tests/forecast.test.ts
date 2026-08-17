import {describe, expect, test} from "bun:test";
import "../src/ts/interact/getItem";
import {Actor} from "../src/ts/actors/Actor";
import {Merc} from "../src/ts/actors/Merc";
import {MercMarket} from "../src/ts/interact/mercMarket";
import {Player} from "../src/ts/actors/player";
import {CharacterCreation} from "../src/ts/actors/resources/CharacterCreation";
import {Economy} from "../src/ts/interact/economy";
import {ODDS_LABEL, Odds, forecast} from "../src/ts/interact/forecast";
import {NodeType, RunNode} from "../src/ts/interact/runMap";

const node = (type: NodeType): RunNode => ({id: "n", type, junction: 0, pos: {x: 0, z: 0}} as any);

function squad(size: number): Actor[] {
    const you = new Player(CharacterCreation.defaultSpec());
    Economy.stripToBasics(you);
    const party: Actor[] = [you];
    for (let i = 0; i < size - 1; i++) { party.push(new Merc(MercMarket.starter(1))); }
    return party;
}

/** Cheapest way to compare two forecasts without the sampling noise. */
function meanRatio(party: Actor[], type: NodeType, sector = 1, runs = 40): number {
    let sum = 0;
    for (let i = 0; i < runs; i++) { sum += forecast(party, node(type), sector, sector * 2)!.ratio; }
    return sum / runs;
}

const RANK: { [k in Odds]: number } = {grim: 0, risky: 1, even: 2, favoured: 3};

describe("the map tells you what you are walking into", () => {
    test("only fights get a forecast — a safehouse has no odds to read", () => {
        const party = squad(2);
        for (const t of ["combat", "elite", "boss"] as NodeType[]) {
            expect(forecast(party, node(t), 1, 2)).not.toBeNull();
        }
        for (const t of ["merchant", "rest", "hire", "event", "net"] as NodeType[]) {
            expect(forecast(party, node(t), 1, 2)).toBeNull();
        }
    });

    test("every verdict has a word for the board", () => {
        for (const k of ["favoured", "even", "risky", "grim"] as Odds[]) {
            expect(ODDS_LABEL[k].length).toBeGreaterThan(0);
        }
    });

    test("it reports a plausible headcount", () => {
        const fc = forecast(squad(2), node("combat"), 1, 2)!;
        expect(fc.foes).toBeGreaterThanOrEqual(3);
        expect(fc.foes).toBeLessThanOrEqual(4);
        // a boss walks in with one lieutenant, never a whole wave
        expect(forecast(squad(2), node("boss"), 1, 2)!.foes).toBe(2);
    });

    /**
     * The whole point of the thing. Squad size is the biggest lever on whether
     * a fight is survivable — 20% / 45% / 70% for two, three and four bodies
     * against the same elite wave — and until now nothing on screen said so.
     */
    test("signing another body visibly improves the read", () => {
        // the same crew, growing — comparing independently rolled squads would
        // be comparing merc draws, which is not the thing under test
        const crew = squad(2);
        const two = meanRatio(crew, "elite");
        crew.push(new Merc(MercMarket.starter(1)));
        const three = meanRatio(crew, "elite");
        crew.push(new Merc(MercMarket.starter(1)));
        const four = meanRatio(crew, "elite");
        expect(three).toBeGreaterThan(two);
        expect(four).toBeGreaterThan(three);
    });

    test("a bloodied crew reads worse than a fresh one", () => {
        const crew = squad(3);
        const fresh = meanRatio(crew, "combat");
        crew.forEach((a) => { a.health = Math.max(1, Math.round(a.maxHealth * 0.3)); });
        expect(meanRatio(crew, "combat")).toBeLessThan(fresh);
    });

    test("an elite contact never reads easier than the firefight next door", () => {
        const party = squad(3);
        expect(meanRatio(party, "elite")).toBeLessThan(meanRatio(party, "combat"));
    });

    test("downed crew count for nothing", () => {
        const party = squad(3);
        const full = meanRatio(party, "combat");
        party[2]!.alive = false;
        expect(meanRatio(party, "combat")).toBeLessThan(full);
    });

    test("the verdict moves with the ratio and never skips backwards", () => {
        const crew = squad(2);
        const ranks: number[] = [];
        for (let i = 0; i < 3; i++) {
            ranks.push(RANK[forecast(crew, node("combat"), 1, 2)!.odds]);
            crew.push(new Merc(MercMarket.starter(1)));
        }
        expect(ranks[1]).toBeGreaterThanOrEqual(ranks[0]!);
        expect(ranks[2]).toBeGreaterThanOrEqual(ranks[1]!);
    });
});
