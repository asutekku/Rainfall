// enter the Actor ⇄ GetItem ⇄ Player import cycle through getItem — going in
// through the feed instead leaves `class Player extends Actor` with no base
import "../src/ts/interact/getItem";
import {describe, expect, test} from "bun:test";
import {fighter} from "./helpers";
import {FeedLog} from "../src/ts/interact/feedLog";
import type {BattleEvent} from "../src/ts/interact/battleEvents";

const shooter = () => { const a = fighter(); a.name = "Ricardo Maypole"; return a; };
const mark = () => { const a = fighter(); a.name = "Ada Margoulis"; return a; };

/** A resolved turn: the `turn` event plus whatever else happened in it. */
function turn(actor: any, side: "party" | "enemy", ...rest: any[]): BattleEvent[] {
    return [{kind: "turn", actor, side} as any, ...rest];
}

function line(events: BattleEvent[]): string {
    const out = FeedLog.fromTurn(events, "0:12");
    return out.length ? out[0]!.text : "";
}

describe("a shot's verb says how well it landed", () => {
    const me = shooter();
    const them = mark();
    const shot = (extra: any) => ({
        kind: "shot", actor: me, target: them, hit: true, damage: 4, aimed: false,
        autofire: false, melee: false, covered: false, dropped: false, quality: "hit", ...extra,
    });

    /**
     * The verb used to key off `aimed`, which the AI sets on seven shots in ten:
     * "headshots" was the ordinary word for a shot, and an aimed graze printed
     * as "headshots MARGOULIS — 3 dmg", which reads as a broken number.
     */
    test("an aimed shot that only grazes does not claim a headshot", () => {
        expect(line(turn(me, "party", shot({aimed: true, quality: "graze"})))).toContain("grazes MARGOULIS");
        expect(line(turn(me, "party", shot({aimed: true, quality: "graze"})))).not.toContain("headshot");
    });

    test("a headshot is a crit and nothing else", () => {
        expect(line(turn(me, "party", shot({quality: "crit"})))).toContain("headshots MARGOULIS");
        expect(line(turn(me, "party", shot({aimed: true, quality: "hit"})))).toContain("fires at MARGOULIS");
    });

    test("melee and autofire keep their own verbs", () => {
        expect(line(turn(me, "party", shot({melee: true})))).toContain("strikes MARGOULIS");
        expect(line(turn(me, "party", shot({melee: true, quality: "crit"})))).toContain("cuts into MARGOULIS");
        expect(line(turn(me, "party", shot({autofire: true})))).toContain("bursts at MARGOULIS");
    });
});

describe("the damage-over-time tick stops leading every line", () => {
    const me = shooter();
    const them = mark();
    const bleed = (dropped: boolean) => ({kind: "bleed", actor: me, damage: 3, sources: ["bleed"], dropped});
    const hit = {kind: "shot", actor: me, target: them, hit: true, damage: 9, aimed: false,
                 autofire: false, melee: false, covered: false, dropped: false, quality: "hit"};

    test("the action comes first and the tick trails it", () => {
        const text = line(turn(me, "party", bleed(false), hit));
        expect(text.indexOf("fires at")).toBeLessThan(text.indexOf("bleeding"));
        expect(text).toContain("bleeding −3");
    });

    test("a tick that kills is still the whole turn", () => {
        const out = FeedLog.fromTurn(turn(me, "party", bleed(true)), "0:12");
        expect(out[0]!.text).toStartWith("bleeds out");
        expect(out[0]!.kill).toBe(true);
    });
});

describe("thrown ordnance says what is left", () => {
    const me = shooter();
    const blast = (left: number) => ({kind: "blast", actor: me, at: {x: 0, y: 0}, radius: 5,
                                      gtype: "frag", victims: [], left});

    test("the last one says so", () => {
        expect(line(turn(me, "party", blast(0)))).toContain("last one");
    });

    test("a belt with more on it counts down", () => {
        expect(line(turn(me, "party", blast(2)))).toContain("2 left");
    });

    test("a car going up is nobody's ordnance to spend", () => {
        const car = {kind: "blast", actor: me, at: {x: 0, y: 0}, radius: 4.5,
                     gtype: "car", victims: [], left: -1};
        const text = line(turn(me, "party", car));
        expect(text).not.toContain("left");
        expect(text).not.toContain("last one");
    });
});

describe("one person, one name", () => {
    test("engine messages are rewritten to the callsign the lines above use", () => {
        const me = shooter();
        const out = FeedLog.keepLegacy([{msg: "Ricardo Maypole reaches level 4."}], "0:16", [me]);
        expect(out).toHaveLength(1);
        expect(out[0]!.text).toBe("MAYPOLE reaches level 4.");
    });

    test("a name that is not on the street is left alone", () => {
        expect(FeedLog.signed("Ricardo Maypole loots 34¥.", [])).toBe("Ricardo Maypole loots 34¥.");
    });
});

describe("the holdout clock reads honestly", () => {
    /**
     * The clock is beaten at the top of the round *after* the last one, so the
     * separator saying "hold 1 more" was the last thing in the feed before the
     * fight ended — it read as ending a round early.
     */
    test("the final round says it is the final round", () => {
        expect(FeedLog.round(4, 1).text).toBe("— round 4 — last round —");
        expect(FeedLog.round(2, 3).text).toBe("— round 2 — hold 3 more —");
        expect(FeedLog.round(2).text).toBe("— round 2 —");
    });
});

describe("two people with one surname", () => {
    const mine = () => { const a = fighter(); a.name = "Lena Blackall"; return a; };
    const theirs = () => { const a = fighter(); a.name = "Piotr Blackall"; return a; };

    /**
     * The first cut disambiguated the target against the acting unit and left
     * the actor alone, which produced "BLACKALL fires at P. BLACKALL" — a line
     * that reads as somebody shooting themselves.
     */
    test("both ends of the line get an initial, not just the target", () => {
        const me = mine();
        const them = theirs();
        const out = FeedLog.fromTurn(turn(me, "party", {
            kind: "shot", actor: me, target: them, hit: true, damage: 7, aimed: false,
            autofire: false, melee: false, covered: false, dropped: false, quality: "hit",
        }), "0:30", [me, them]);
        expect(out[0]!.name).toBe("L. BLACKALL");
        expect(out[0]!.text).toContain("fires at P. BLACKALL");
    });

    test("a surname nobody else on the street has is left plain", () => {
        const me = shooter();
        const them = mine();
        const out = FeedLog.fromTurn(turn(me, "party", {
            kind: "shot", actor: me, target: them, hit: true, damage: 7, aimed: false,
            autofire: false, melee: false, covered: false, dropped: false, quality: "hit",
        }), "0:30", [me, them]);
        expect(out[0]!.name).toBe("MAYPOLE");
        expect(out[0]!.text).toContain("fires at BLACKALL");
    });

    test("the loot lines use the same initials the combat lines do", () => {
        const me = mine();
        const them = theirs();
        const out = FeedLog.keepLegacy([{msg: "Lena Blackall loots 5¥."}], "0:13", [me, them]);
        expect(out[0]!.text).toBe("L. BLACKALL loots 5¥.");
    });
});
