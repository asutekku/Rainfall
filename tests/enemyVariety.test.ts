import {describe, expect, test} from "bun:test";
import {ActorController} from "../src/ts/actors/actorController";
import {Adversary} from "../src/ts/actors/Enemies/Adversary";
import {ARCHETYPES} from "../src/ts/actors/resources/archetypes";
import {Battlefield} from "../src/ts/interact/battlefield";
import {MarkEvent, MoveEvent, ShotEvent} from "../src/ts/interact/battleEvents";
import {Combat} from "../src/ts/interact/combat";
import {FeedLog} from "../src/ts/interact/feedLog";
import Equipment from "../src/ts/items/Equipment";
import {fighter, withRandom} from "./helpers";

const byTitle = (title: string) => ARCHETYPES.find((a) => a.title === title)!;

describe("themed encounters", () => {
    test("a spawned wave belongs to ONE faction", () => {
        for (let i = 0; i < 10; i++) {
            const wave = ActorController.getEnemies(4, 3);
            const factions = new Set(wave.map((e) => e.faction));
            expect(factions.size).toBe(1);
        }
    });

    test("an elite wave shares faction AND rank", () => {
        for (let i = 0; i < 10; i++) {
            const wave = ActorController.getEliteWave(3, 5, 3);
            expect(new Set(wave.map((e) => e.faction)).size).toBe(1);
            wave.forEach((e) => expect(e.rank).toBe(3));
        }
    });

    test("a boss brings an escort from its own faction", () => {
        for (let i = 0; i < 10; i++) {
            const [boss, escort] = ActorController.getBoss(4, 5);
            expect(escort!.faction).toBe(boss!.faction);
        }
    });

    test("deployment formation follows the faction's character", () => {
        const animals = new Adversary(byTitle("Bruiser"), 3);
        const arasaka = new Adversary(byTitle("Lanceman"), 3);
        withRandom(0.5, () => {   // 0.5 ≥ 0.25 → no wildcard, faction preference wins
            expect(Battlefield.chooseFormation([animals])).toBe("close");
            expect(Battlefield.chooseFormation([arasaka])).toBe("line");
        });
    });

    test("grenadier archetypes always deploy with their frags, others roll for them", () => {
        const bombardier = new Adversary(byTitle("Bombardier"), 3);
        const reaver = new Adversary(byTitle("Reaver"), 3);
        withRandom(0.5, () => {   // 0.5 fails the 40% roll → the plain rank-3 gets none
            Battlefield.deploy([fighter()], [bombardier, reaver]);
        });
        expect(bombardier.grenades).toBe(2);
        expect(reaver.grenades).toBe(0);
    });
});

describe("melee sprint (house rule)", () => {
    test("a brawler too far to strike trades its attack for a double move", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({dex: 8, skill: 6, weapon: "Knife", x: 0, y: 5});
            const foe = fighter({x: 0, y: 40});
            const res = Combat.takeTurn(me, [me], [foe]);
            const move = res.events.find((e) => e.kind === "move") as MoveEvent | undefined;
            expect(move).toBeTruthy();
            expect(move!.sprint).toBe(true);
            // covered more ground than a single run allows, and gave up the attack for it
            const dist = Math.hypot(move!.to.x - move!.from.x, move!.to.y - move!.from.y);
            expect(dist).toBeGreaterThan(me.runMeters() + 1);
            expect(dist).toBeLessThanOrEqual(me.runMeters() * 2 + 0.01);
            expect(res.events.some((e) => e.kind === "shot")).toBe(false);
        });
    });

    test("a brawler already in reach attacks instead of sprinting", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({dex: 10, skill: 10, weapon: "Knife", x: 0, y: 5});
            const foe = fighter({dex: 1, x: 0, y: 8});
            const res = Combat.takeTurn(me, [me], [foe]);
            const shot = res.events.find((e) => e.kind === "shot") as ShotEvent | undefined;
            expect(shot).toBeTruthy();
            expect(shot!.melee).toBe(true);
        });
    });
});

describe("sniper doctrine: paint, then fire", () => {
    const sniper = () => {
        const me = fighter({ref: 8, skill: 8, x: 0, y: 5});
        me.weapon = Equipment.weapons.find((w) => w.weaponClass === "sniper")!.clone();
        return me;
    };

    test("turn one paints the target, turn two fires the steadied shot", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = sniper();
            const foe = fighter({x: 0, y: 30});
            const first = Combat.takeTurn(me, [me], [foe]);
            const mark = first.events.find((e) => e.kind === "mark") as MarkEvent | undefined;
            expect(mark).toBeTruthy();
            expect(mark!.target).toBe(foe);
            expect(me.marking).toBe(foe);
            expect(first.events.some((e) => e.kind === "shot")).toBe(false);

            const second = Combat.takeTurn(me, [me], [foe]);
            const shot = second.events.find((e) => e.kind === "shot") as ShotEvent | undefined;
            expect(shot).toBeTruthy();
            expect(shot!.target).toBe(foe);
            expect(me.marking).toBe(null);   // the lock is spent on firing
        });
    });

    test("a dead lock target forces a fresh paint, not a wasted shot", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = sniper();
            const a = fighter({x: 0, y: 30});
            const b = fighter({x: 6, y: 30});
            Combat.takeTurn(me, [me], [a, b]);
            expect(me.marking).toBe(a);
            a.alive = false;
            a.health = 0;
            const res = Combat.takeTurn(me, [me], [a, b]);
            const mark = res.events.find((e) => e.kind === "mark") as MarkEvent | undefined;
            expect(mark).toBeTruthy();
            expect(mark!.target).toBe(b);
        });
    });

    test("deploy clears stale laser locks between fights", () => {
        const me = sniper();
        const foe = fighter({x: 0, y: 30});
        me.marking = foe;
        Battlefield.deploy([me], [foe]);
        expect(me.marking).toBe(null);
    });
});

describe("feed lines for the new moves", () => {
    test("a sprint reads as a sprint", () => {
        const me = fighter({x: 0, y: 5});
        me.name = "Rex Carter";
        const events = [
            {kind: "turn", actor: me, side: "party"},
            {kind: "move", actor: me, from: {x: 0, y: 5}, to: {x: 0, y: 25}, cover: false, sprint: true},
        ] as any;
        const [line] = FeedLog.fromTurn(events, "0:10");
        expect(line!.text).toContain("sprints 20m");
    });

    test("a laser paint reads as a paint", () => {
        const me = fighter();
        me.name = "Ana Voss";
        const tgt = fighter();
        tgt.name = "Kim Reyes";
        const events = [
            {kind: "turn", actor: me, side: "enemy"},
            {kind: "mark", actor: me, target: tgt},
        ] as any;
        const [line] = FeedLog.fromTurn(events, "0:12");
        expect(line!.text).toContain("paints REYES with a laser");
    });

    test("the contact report names the faction — and the boss when there is one", () => {
        const wave = ActorController.getEliteWave(3, 4, 3);
        const plain = FeedLog.contact(wave);
        expect(plain.text).toContain("CONTACT");
        expect(plain.text).toContain((wave[0]!.faction || "").toUpperCase());
        const [boss, escort] = ActorController.getBoss(4, 5);
        const bossLine = FeedLog.contact([boss!, escort!]);
        expect(bossLine.text).toContain((boss!.faction || "").toUpperCase());
        expect(bossLine.text).toContain("escort");
    });
});
