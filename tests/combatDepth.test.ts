import {describe, expect, test} from "bun:test";
import {Adversary} from "../src/ts/actors/Enemies/Adversary";
import {ActorController} from "../src/ts/actors/actorController";
import {ARCHETYPES} from "../src/ts/actors/resources/archetypes";
import {Role} from "../src/ts/actors/resources/Role";
import {Battlefield} from "../src/ts/interact/battlefield";
import {AbilityEvent, BleedEvent, BlastEvent, CoverGoneEvent, HackEvent, RoutEvent, ShotEvent,
    SkipEvent, StabilizeEvent, SuppressEvent} from "../src/ts/interact/battleEvents";
import {Combat} from "../src/ts/interact/combat";
import {encounterSpec} from "../src/ts/interact/runMap";
import {fighter, withRandom} from "./helpers";

const byTitle = (t: string) => ARCHETYPES.find((a) => a.title === t)!;
const adversary = (title: string, x: number, y: number, level: number = 4) => {
    const a = new Adversary(byTitle(title), level);
    a.position.x = x; a.position.y = y; a.position.z = 0;
    a.resetBattleState();
    return a;
};

/** With Math.random pinned to 0.5: d10 = 6 (no explode/fumble), d6 = 4. */

describe("battle-scoped critical injuries", () => {
    test("bleeding ticks at the top of the turn, armour doesn't help", () => {
        Battlefield.COVER = [];
        const me = fighter({x: 0, y: 5});
        me.bleeding = 2;
        const before = me.health;
        const res = Combat.takeTurn(me, [me], [fighter({x: 0, y: 20})]);
        const bleed = res.events.find((e) => e.kind === "bleed") as BleedEvent;
        expect(bleed.damage).toBe(2);
        expect(me.health).toBe(before - 2);
    });

    test("a stunned unit sits its turn out, once", () => {
        const me = fighter({x: 0, y: 5});
        me.stunned = 1;
        const res = Combat.takeTurn(me, [me], [fighter({x: 0, y: 20})]);
        const skip = res.events.find((e) => e.kind === "skip") as SkipEvent;
        expect(skip.reason).toBe("stunned");
        expect(res.events.some((e) => e.kind === "shot")).toBe(false);
        expect(me.stunned).toBe(0);
    });

    test("a crippled leg halves movement", () => {
        const me = fighter();
        const whole = me.runMeters();
        me.crippled = true;
        expect(me.runMeters()).toBe(whole / 2);
    });

    test("big hits leave marks: heavy fire against bare skin draws crits", () => {
        Battlefield.COVER = [];
        let crits = 0;
        for (let i = 0; i < 60 && !crits; i++) {
            const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 5});
            const naked = fighter({x: 0, y: 10});
            const res = Combat.takeTurn(me, [me], [naked], {target: naked});
            crits += res.events.filter((e) => e.kind === "crit").length;
        }
        expect(crits).toBeGreaterThan(0);
    });

    test("resetBattleState clears every injury and stance", () => {
        const me = fighter();
        me.bleeding = 2; me.crippled = true; me.stunned = 1; me.pinned = true;
        me.routed = true; me.moraleTested = true; me.abilityUsed = true; me.hackCooldown = 2;
        me.resetBattleState();
        expect(me.bleeding).toBe(0);
        expect(me.crippled).toBe(false);
        expect(me.stunned).toBe(0);
        expect(me.pinned).toBe(false);
        expect(me.routed).toBe(false);
        expect(me.canFight()).toBe(true);
    });
});

describe("ammo, reload and suppression", () => {
    test("shots drain the magazine; a dry mag turns the attack into a reload", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const me = fighter({ref: 10, skill: 10, weapon: "WSA Autopistol", x: 0, y: 5});
            me.resetBattleState();
            const full = me.mag;
            expect(full).toBeGreaterThan(0);
            const foe = fighter({x: 0, y: 15});
            Combat.takeTurn(me, [me], [foe], {target: foe});
            expect(me.mag).toBeLessThan(full);

            me.mag = 0;
            const res = Combat.takeTurn(me, [me], [foe], {target: foe});
            expect(res.events.some((e) => e.kind === "reload")).toBe(true);
            expect(res.events.some((e) => e.kind === "shot")).toBe(false);
            expect(me.mag).toBe(full);
        });
    });

    test("a pinned unit spends its next turn keeping its head down", () => {
        Battlefield.COVER = [];
        const me = fighter({x: 0, y: 5});
        me.pinned = true;
        const res = Combat.takeTurn(me, [me], [fighter({x: 0, y: 20})]);
        const skip = res.events.find((e) => e.kind === "skip") as SkipEvent;
        expect(skip.reason).toBe("pinned");
        expect(res.events.some((e) => e.kind === "shot")).toBe(false);
        expect(me.pinned).toBe(false);
    });

    test("autofire hoses an uncrackable covered target instead of whiffing", () => {
        withRandom(0.5, () => {
            Battlefield.COVER = [{x: 0, y: 38, kind: "crate"}];
            const auto = fighter({ref: 5, skill: 5, x: 0, y: 0});
            const gun = require("../src/ts/items/Equipment").default.weapons
                .find((w: any) => w.autofire && w.weaponClass !== "melee" && w.shots >= 10);
            auto.weapon = gun.clone();
            auto.resetBattleState();
            const tank = fighter({x: 0, y: 40});
            tank.equipment.upper = new (require("../src/ts/items/Armor").Armor)(
                "upper", "Test Plate", "test", 1, 18, 0, "");
            const res = Combat.takeTurn(auto, [auto], [tank]);
            const supp = res.events.find((e) => e.kind === "suppress") as SuppressEvent | undefined;
            expect(supp).toBeTruthy();
            expect(supp!.pinned).toBe(true);
            expect(tank.pinned).toBe(true);
        });
    });
});

describe("stabilize: field medicine", () => {
    test("a medic drags a mortally wounded teammate back to their feet", () => {
        Battlefield.COVER = [];
        const medic = fighter({x: 0, y: 5});
        const down = fighter({x: 2, y: 5});
        down.health = 0;
        down.mortallyWounded = true;
        const res = Combat.takeTurn(medic, [medic, down], [fighter({x: 0, y: 30})]);
        const stab = res.events.find((e) => e.kind === "stabilize") as StabilizeEvent;
        expect(stab.saved).toBe(true);
        expect(down.mortallyWounded).toBe(false);
        expect(down.health).toBe(1);
        expect(down.canFight()).toBe(true);
    });

    test("stopping a bleed counts as the turn too", () => {
        Battlefield.COVER = [];
        const medic = fighter({x: 0, y: 5});
        const hurt = fighter({x: 2, y: 5});
        hurt.bleeding = 2;
        const res = Combat.takeTurn(medic, [medic, hurt], [fighter({x: 0, y: 30})]);
        expect(res.events.some((e) => e.kind === "stabilize")).toBe(true);
        expect(hurt.bleeding).toBe(0);
        expect(res.events.some((e) => e.kind === "shot")).toBe(false);
    });
});

describe("morale", () => {
    test("a low-rank ganger breaks once half the wave is down", () => {
        withRandom(0.5, () => {   // d10 = 6: 6 + will 5 = 11 < 13 → breaks
            const shaky = fighter({will: 5, x: 0, y: 30});
            shaky.rank = 1;
            const dead1 = fighter(); dead1.alive = false;
            const dead2 = fighter(); dead2.alive = false;
            const enemies = [shaky, dead1, dead2, fighter({x: 5, y: 30})];
            const res = Combat.takeTurn(shaky, [fighter({x: 0, y: 5})], enemies);
            const rout = res.events.find((e) => e.kind === "rout") as RoutEvent;
            expect(rout).toBeTruthy();
            expect(shaky.routed).toBe(true);
            expect(shaky.canFight()).toBe(false);
        });
    });

    test("berserkers never break", () => {
        withRandom(0.5, () => {
            const zerker = fighter({will: 2, x: 0, y: 30});
            zerker.rank = 1;
            zerker.temperament = "berserker";
            const dead1 = fighter(); dead1.alive = false;
            const dead2 = fighter(); dead2.alive = false;
            const res = Combat.takeTurn(zerker, [fighter({x: 0, y: 5})],
                [zerker, dead1, dead2, fighter({x: 5, y: 30})]);
            expect(res.events.some((e) => e.kind === "rout")).toBe(false);
            expect(zerker.routed).toBe(false);
        });
    });

    test("each unit checks its nerve at most once per battle", () => {
        withRandom(() => 0.95, () => {   // d10 = 10: holds easily, but the check is spent
            const steady = fighter({will: 5, x: 0, y: 30});
            steady.rank = 1;
            const dead1 = fighter(); dead1.alive = false;
            const dead2 = fighter(); dead2.alive = false;
            Combat.takeTurn(steady, [fighter({x: 0, y: 5})], [steady, dead1, dead2, fighter({x: 5, y: 30})]);
            expect(steady.moraleTested).toBe(true);
        });
    });
});

describe("grenade variety", () => {
    test("smoke pops a cloud that thickens the air and breaks laser locks", () => {
        Battlefield.SMOKE = [];
        const thrower = fighter({x: 0, y: 5});
        thrower.smokes = 1;
        const foe = fighter({x: 0, y: 12});
        const sniper = fighter({x: 0, y: 40});
        sniper.marking = thrower;
        // smoke on our own position: concealment where we stand
        Combat.throwGrenade(thrower, {x: 0, y: 5}, [foe, sniper], [thrower], "smoke");
        expect(thrower.smokes).toBe(0);
        expect(Battlefield.inSmoke({x: 0, y: 5})).toBe(true);
        expect(Battlefield.coverPenaltyAt({x: 0, y: 5}, {x: 0, y: 40})).toBeGreaterThanOrEqual(4);
        expect(sniper.marking).toBe(null);   // the beam can't hold through the cloud
        Battlefield.tickSmoke();
        Battlefield.tickSmoke();
        expect(Battlefield.inSmoke({x: 0, y: 5})).toBe(false);   // two rounds and it thins out
    });

    test("flashbangs stun the weak-willed and wound nobody", () => {
        withRandom(0.5, () => {   // d10 6 + will 5 = 11 < 13 → stunned
            const thrower = fighter({x: 0, y: 5});
            thrower.flashes = 1;
            const victim = fighter({will: 5, x: 0, y: 15});
            const hp = victim.health;
            Combat.throwGrenade(thrower, {x: 0, y: 15}, [victim], [thrower], "flash");
            expect(victim.health).toBe(hp);
            expect(victim.stunned).toBe(1);
        });
    });

    test("EMP fries chrome and ignores armour — and does nothing to meat", () => {
        withRandom(0.5, () => {
            const thrower = fighter({x: 0, y: 5});
            thrower.emps = 1;
            const borg = adversary("Ghoul", 0, 15);       // Chrome faction: chromed()
            const meat = fighter({x: 3, y: 15});
            const borgHp = borg.health;
            const meatHp = meat.health;
            Combat.throwGrenade(thrower, {x: 0, y: 15}, [borg, meat], [thrower], "emp");
            expect(borg.health).toBe(borgHp - 12);        // 3d6 of pinned 4s, straight through SP 11
            expect(meat.health).toBe(meatHp);
        });
    });
});

describe("destructible cover", () => {
    test("a frag levels nearby cover; a caught car detonates as a secondary blast", () => {
        Battlefield.SMOKE = [];
        Battlefield.COVER = [{x: 0, y: 15, kind: "car"}, {x: 20, y: 15, kind: "crate"}];
        const thrower = fighter({x: 0, y: 5});
        thrower.grenades = 1;
        const foe = fighter({x: 2, y: 15});
        Combat.takeTurn(thrower, [thrower], [foe], {grenadeAt: {x: 0, y: 15}});
        // the car is gone, the far crate survives
        expect(Battlefield.COVER.length).toBe(1);
        expect(Battlefield.COVER[0]!.kind).toBe("crate");
    });

    test("the destruction and the fireball land in the event stream", () => {
        Battlefield.COVER = [{x: 0, y: 15, kind: "car"}];
        const thrower = fighter({x: 0, y: 5});
        thrower.grenades = 1;
        const foe = fighter({x: 2, y: 15});
        const res = Combat.takeTurn(thrower, [thrower], [foe], {grenadeAt: {x: 0, y: 15}});
        const gone = res.events.find((e) => e.kind === "coverGone") as CoverGoneEvent;
        expect(gone).toBeTruthy();
        expect(gone.exploded).toBe(true);
        const blasts = res.events.filter((e) => e.kind === "blast") as BlastEvent[];
        expect(blasts.some((b) => b.gtype === "car")).toBe(true);
    });
});

describe("boss signature moves", () => {
    test("the Terror leaps onto the squad and slams the street", () => {
        Battlefield.COVER = [];
        const terror = adversary("Terror", 0, 17, 6);
        const mark = fighter({x: 0, y: 5});
        const res = Combat.takeTurn(terror, [mark], [terror]);
        const ability = res.events.find((e) => e.kind === "ability") as AbilityEvent;
        expect(ability.name).toBe("leap");
        const slam = res.events.find((e) => e.kind === "blast") as BlastEvent;
        expect(slam.gtype).toBe("slam");
        expect(terror.abilityUsed).toBe(true);
        expect(Battlefield.distance(terror, mark)).toBeLessThan(6);
        // once per battle
        const again = Combat.takeTurn(terror, [mark], [terror]);
        expect(again.events.some((e) => e.kind === "ability")).toBe(false);
    });

    test("the MaxTac Officer's volley fires twice in one action", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const officer = adversary("Officer", 0, 20, 6);
            const mark = fighter({x: 0, y: 5});
            const res = Combat.takeTurn(officer, [mark], [officer]);
            const ability = res.events.find((e) => e.kind === "ability") as AbilityEvent;
            expect(ability.name).toBe("volley");
            const shots = res.events.filter((e) => e.kind === "shot") as ShotEvent[];
            expect(shots.length).toBe(2);
        });
    });
});

describe("cyborgs and quickhacks", () => {
    test("the Chrome faction exists across the ladder and reads as chromed", () => {
        for (const title of ["Ghoul", "Juggernaut", "Dragoon"]) {
            const borg = adversary(title, 0, 20);
            expect(borg.faction).toBe("Chrome");
            expect(borg.chromed()).toBe(true);
        }
        expect(fighter().chromed()).toBe(false);
    });

    test("a netrunner shorts the biggest chrome in view, then cools down", () => {
        Battlefield.COVER = [];
        withRandom(0.5, () => {
            const runner = fighter({x: 0, y: 5});
            runner.role = new Role("netrunner");
            runner.setCombatProfile({ref: 5, dex: 5, body: 5, will: 5, skill: 5, luck: 0, roleRank: 5});
            const borg = adversary("Juggernaut", 0, 20);
            const borgHp = borg.health;
            const res = Combat.takeTurn(runner, [runner], [borg]);
            const hack = res.events.find((e) => e.kind === "hack") as HackEvent;
            expect(hack).toBeTruthy();
            expect(borg.health).toBeLessThan(borgHp);   // straight through SP 15
            expect(runner.hackCooldown).toBeGreaterThan(0);
            // cooling down: the next turn is a normal gunfight, not another hack
            const next = Combat.takeTurn(runner, [runner], [borg]);
            expect(next.events.some((e) => e.kind === "hack")).toBe(false);
        });
    });
});

describe("holdout and reinforcements", () => {
    test("a quarter of firefights carry a holdout clock", () => {
        const node = {id: "n", type: "combat", junction: 0, pos: {x: 0, y: 0}} as any;
        const clocked = withRandom(0.1, () => encounterSpec(node, 1, 1));
        expect(clocked.holdout).toBe(4);
        const plain = withRandom(0.5, () => encounterSpec(node, 1, 1));
        expect(plain.holdout).toBeUndefined();
    });

    test("routed hostiles end the fight without their bodies hitting the floor", () => {
        const e1 = fighter({x: 0, y: 30});
        e1.routed = true;
        expect(e1.canFight()).toBe(false);
        expect(e1.health).toBeGreaterThan(0);
    });

    test("reinforcements arrive from the wave's own faction at the asked rank", () => {
        const fresh = ActorController.getReinforcements("Maelstrom", 2, 3, 2);
        expect(fresh.length).toBe(2);
        fresh.forEach((a) => {
            expect(a.rank).toBe(2);
            expect(a.faction).toBe("Maelstrom");
        });
    });
});
