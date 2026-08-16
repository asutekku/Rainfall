import {describe, expect, test} from "bun:test";
import {BLAST_RADIUS, Battlefield} from "../src/ts/interact/battlefield";
import {Combat} from "../src/ts/interact/combat";
import {BlastEvent} from "../src/ts/interact/battleEvents";
import {FeedLog} from "../src/ts/interact/feedLog";
import {TacticalAI} from "../src/ts/interact/tacticalAI";
import {fighter, withRandom} from "./helpers";

/** Math.random pinned to 0.5 → 6d6 rolls 24; dodge check 6 + evasion 5 = 11 < 15 → no dive. */

describe("Combat.throwGrenade", () => {
    test("everyone inside the radius eats the blast — friend and foe alike", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({x: 0, y: 5});
            me.grenades = 1;
            const buddyClose = fighter({x: 2, y: 19});      // danger-close ally
            const foeIn = fighter({x: 0, y: 20});
            const foeEdge = fighter({x: 4, y: 22});         // inside radius
            const foeFar = fighter({x: 0, y: 40});          // well outside
            const res = Combat.takeTurn(me, [me, buddyClose], [foeIn, foeEdge, foeFar],
                {grenadeAt: {x: 0, y: 20}});
            const blast = res.events.find((e) => e.kind === "blast") as BlastEvent;
            expect(blast).toBeTruthy();
            expect(blast.radius).toBe(BLAST_RADIUS);
            const hitNames = blast.victims.map((v) => v.target);
            expect(hitNames).toContain(foeIn);
            expect(hitNames).toContain(foeEdge);
            expect(hitNames).toContain(buddyClose);          // friendly fire is real
            expect(hitNames).not.toContain(foeFar);
            blast.victims.forEach((v) => expect(v.damage).toBeGreaterThan(0));
            expect(foeFar.health).toBe(foeFar.maxHealth);
            expect(me.grenades).toBe(0);                     // spent
        });
    });

    test("no grenade, no boom", () => {
        const me = fighter({x: 0, y: 5});
        me.grenades = 0;
        const foe = fighter({x: 0, y: 20});
        const res = Combat.takeTurn(me, [me], [foe], {grenadeAt: {x: 0, y: 20}});
        expect(res.events.some((e) => e.kind === "blast")).toBe(false);
        expect(foe.health).toBe(foe.maxHealth);
    });

    test("a lethal blast drops victims and credits the thrower's kills", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({x: 0, y: 5});
            me.grenades = 1;
            const foe = fighter({x: 0, y: 20});
            foe.health = 5;
            const res = Combat.takeTurn(me, [me], [foe], {grenadeAt: {x: 0, y: 20}});
            const blast = res.events.find((e) => e.kind === "blast") as BlastEvent;
            expect(blast.victims[0]!.dropped).toBe(true);
            expect(foe.canFight()).toBe(false);
            expect(me.kills).toBe(1);
        });
    });

    test("a nimble victim dives clear for half damage", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({x: 0, y: 5});
            me.grenades = 1;
            const acrobat = fighter({x: 0, y: 20, dex: 10});   // 6 + 10 = 16 ≥ 15 → dives
            const res = Combat.takeTurn(me, [me], [acrobat], {grenadeAt: {x: 0, y: 20}});
            const blast = res.events.find((e) => e.kind === "blast") as BlastEvent;
            expect(blast.victims[0]!.dodged).toBe(true);
            expect(blast.victims[0]!.damage).toBe(12);       // 24 halved
        });
    });

    test("over-arm throws fall short along the throw line instead of teleporting", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({x: 0, y: 0});
            me.grenades = 1;
            const foe = fighter({x: 0, y: 40});              // beyond the 22m arm
            const res = Combat.takeTurn(me, [me], [foe], {grenadeAt: {x: 0, y: 40}});
            const blast = res.events.find((e) => e.kind === "blast") as BlastEvent;
            expect(blast.at.y).toBeCloseTo(22, 5);           // lands at max range
            expect(blast.victims.length).toBe(0);            // foe out of the shifted blast
        });
    });
});

describe("TacticalAI frag judgement", () => {
    test("throws on a clustered pair, never with a friendly danger-close", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 6, skill: 5, weapon: "WSA Autopistol", x: 0, y: 5});
        me.grenades = 2;
        const foeA = fighter({x: 0, y: 20});
        const foeB = fighter({x: 3, y: 20});
        const clear = TacticalAI.plan(me, [me], [foeA, foeB]);
        expect(clear.label).toBe("frag");
        expect(clear.grenadeAt).toBeTruthy();

        const buddy = fighter({x: 1, y: 19});                // ally in the kill zone
        const held = TacticalAI.plan(me, [me, buddy], [foeA, foeB]);
        expect(held.label).not.toBe("frag");

        me.grenades = 0;                                     // nothing left to throw
        const dry = TacticalAI.plan(me, [me], [foeA, foeB]);
        expect(dry.label).not.toBe("frag");
    });

    test("won't waste a frag on a lone target", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 6, skill: 5, weapon: "WSA Autopistol", x: 0, y: 5});
        me.grenades = 2;
        const loner = fighter({x: 0, y: 20});
        expect(TacticalAI.plan(me, [me], [loner]).label).not.toBe("frag");
    });
});

describe("Overwatch feed — blasts", () => {
    test("a frag turn reads as one line with the bill itemised", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({x: 0, y: 5});
            me.grenades = 1;
            const foe = fighter({x: 0, y: 20});
            foe.health = 5;
            const res = Combat.takeTurn(me, [me], [foe], {grenadeAt: {x: 0, y: 20}});
            const entries = FeedLog.fromTurn(res.events, "0:10");
            expect(entries.length).toBe(1);
            expect(entries[0]!.text).toContain("lobs a frag");
            expect(entries[0]!.text).toContain("DOWN");
            expect(entries[0]!.kill).toBe(true);
        });
    });
});
