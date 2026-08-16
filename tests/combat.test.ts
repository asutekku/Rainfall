import {describe, expect, test} from "bun:test";
import Equipment from "../src/ts/items/Equipment";
import {Armor} from "../src/ts/items/Armor";
import {Battlefield} from "../src/ts/interact/battlefield";
import {Combat} from "../src/ts/interact/combat";
import {ShotEvent} from "../src/ts/interact/battleEvents";
import {fighter, withRandom} from "./helpers";

/** With Math.random pinned to 0.5: d10 = 6 (no explode/fumble), d6 = 4. */

describe("Combat.beginRound", () => {
    test("orders fighters by initiative and resets round trackers", () => {
        withRandom(0.5, () => {
            const fast = fighter({ref: 10});
            const slow = fighter({ref: 1});
            fast.firstHitDone = slow.firstHitDone = true;
            const order = Combat.beginRound([slow], [fast]);
            expect(order).toEqual([fast, slow]);
            expect(fast.firstHitDone).toBe(false);
            expect(slow.firstHitDone).toBe(false);
        });
    });

    test("excludes the dead, keeps the mortally wounded (they get death saves)", () => {
        const dead = fighter();
        dead.alive = false;
        const dying = fighter();
        dying.health = 0;
        dying.mortallyWounded = true;
        const ok = fighter();
        const order = Combat.beginRound([ok], [dead, dying]);
        expect(order).toContain(ok);
        expect(order).toContain(dying);
        expect(order).not.toContain(dead);
    });
});

describe("Combat.takeTurn — manual orders", () => {
    test("a move + shoot order produces turn, move and shot events in sequence", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 5});
            const foe = fighter({x: 0, y: 20});
            const res = Combat.takeTurn(me, [me], [foe], {moveTo: {x: 0, y: 10}, target: foe});
            expect(res.events.map((e) => e.kind)).toEqual(["turn", "move", "shot"]);
            const shot = res.events[2] as ShotEvent;
            expect(shot.hit).toBe(true);          // 6 + 20+ vs DV 15 at 10m
            expect(shot.damage).toBeGreaterThan(0);
            expect(shot.melee).toBe(false);
            // tracer count mirrors the weapon's rate of fire (1-3 rounds per attack)
            expect(shot.rounds).toBeGreaterThanOrEqual(1);
            expect(shot.rounds).toBeLessThanOrEqual(3);
            expect(me.position.y).toBeCloseTo(10, 5);
            expect(foe.health).toBeLessThan(foe.maxHealth);
            expect(res.messages.length).toBeGreaterThan(0);
        });
    });

    test("an empty order passes the turn: nothing but the turn marker", () => {
        const me = fighter();
        const foe = fighter({x: 0, y: 20});
        const res = Combat.takeTurn(me, [me], [foe], {});
        expect(res.events.map((e) => e.kind)).toEqual(["turn"]);
    });

    test("shots at cover carry the +4 DV and flag the event", () => {
        withRandom(0.5, () => {
            Battlefield.COVER = [{x: 0, y: 18, kind: "crate"}];
            const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 5});
            const foe = fighter({x: 0, y: 20});
            const res = Combat.takeTurn(me, [me], [foe], {target: foe});
            const shot = res.events.find((e) => e.kind === "shot") as ShotEvent;
            expect(shot.covered).toBe(true);
        });
    });

    test("a target beyond the weapon's range yields a no-shot event, not a miss", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 0});
        const foe = fighter({x: 0, y: 0});
        foe.position.y = 600;   // beyond every pistol band
        const res = Combat.takeTurn(me, [me], [foe], {target: foe});
        expect(res.events.map((e) => e.kind)).toEqual(["turn", "noshot"]);
    });

    test("melee resolves as an opposed check and marks the event melee", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({dex: 10, skill: 10, weapon: "Knife", x: 0, y: 5});
            const foe = fighter({dex: 1, x: 0, y: 7});
            const res = Combat.takeTurn(me, [me], [foe], {target: foe});
            const shot = res.events.find((e) => e.kind === "shot") as ShotEvent;
            expect(shot.melee).toBe(true);
            expect(shot.hit).toBe(true);
        });
    });

    test("autofire weapons burst and mark the event", () => {
        Battlefield.COVER = [];
        const auto = Equipment.weapons.find((w) => w.autofire && w.weaponClass !== "melee");
        expect(auto).toBeTruthy();
        withRandom(0.5, () => {
            const me = fighter({ref: 10, skill: 10, x: 0, y: 5});
            me.weapon = auto!.clone();
            const foe = fighter({x: 0, y: 15});
            const res = Combat.takeTurn(me, [me], [foe], {target: foe});
            const shot = res.events.find((e) => e.kind === "shot") as ShotEvent;
            expect(shot.autofire).toBe(true);
            expect(shot.hit).toBe(true);
            expect(shot.rounds).toBe(5);
        });
    });

    test("a killing blow flags the shot dropped and credits the kill", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 5});
            const foe = fighter({x: 0, y: 15});
            foe.health = 1;
            const res = Combat.takeTurn(me, [me], [foe], {target: foe});
            const shot = res.events.find((e) => e.kind === "shot") as ShotEvent;
            expect(shot.dropped).toBe(true);
            expect(foe.canFight()).toBe(false);
            expect(me.kills).toBe(1);
        });
    });
});

describe("aimed-shot judgement (no more whiff wars)", () => {
    const armoured = (x: number, y: number) => {
        const t = fighter({x, y});
        t.equipment.upper = new Armor("upper", "Test Plate", "test", 1, 11, 0, "");
        return t;
    };

    test("a low-skill shooter never gambles on -8 head shots", () => {
        Battlefield.COVER = [];
        let aimedShots = 0;
        for (let i = 0; i < 25; i++) {
            const me = fighter({ref: 2, skill: 0, weapon: "WSA Autopistol", x: 0, y: 5});
            const tank = armoured(0, 15);
            const res = Combat.takeTurn(me, [me], [tank]);
            const shot = res.events.find((e) => e.kind === "shot") as ShotEvent | undefined;
            if (shot && shot.aimed) { aimedShots += 1; }
        }
        expect(aimedShots).toBe(0);
    });

    test("a crack shot may still take the head shot against heavy armour", () => {
        Battlefield.COVER = [];
        let aimedShots = 0;
        for (let i = 0; i < 25; i++) {
            const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 5});
            const tank = armoured(0, 12);
            const res = Combat.takeTurn(me, [me], [tank]);
            const shot = res.events.find((e) => e.kind === "shot") as ShotEvent | undefined;
            if (shot && shot.aimed) { aimedShots += 1; }
        }
        expect(aimedShots).toBeGreaterThan(0);
    });
});

describe("Combat.takeTurn — death saves", () => {
    test("a tough merc clings on, a frail one flatlines (d10 = 6 vs BODY)", () => {
        withRandom(0.5, () => {
            const tough = fighter({body: 8});
            tough.health = 0;
            tough.mortallyWounded = true;
            const res1 = Combat.takeTurn(tough, [tough], [fighter()]);
            expect(res1.events.map((e) => e.kind)).toEqual(["turn", "save"]);
            expect((res1.events[1] as any).survived).toBe(true);
            expect(tough.alive).toBe(true);

            const frail = fighter({body: 2});
            frail.health = 0;
            frail.mortallyWounded = true;
            const res2 = Combat.takeTurn(frail, [frail], [fighter()]);
            expect((res2.events[1] as any).survived).toBe(false);
            expect(frail.alive).toBe(false);
        });
    });
});

describe("Combat.round (legacy whole-round API)", () => {
    test("still resolves a full round for every living combatant", () => {
        Battlefield.COVER = [];
        const a = fighter({ref: 8, skill: 6, weapon: "WSA Autopistol", x: 0, y: 5});
        const b = fighter({ref: 8, skill: 6, weapon: "WSA Autopistol", x: 0, y: 15});
        const msgs = Combat.round([a], [b]);
        expect(Array.isArray(msgs)).toBe(true);
        expect(msgs.length).toBeGreaterThan(0);
    });
});
