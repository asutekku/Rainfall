import {describe, expect, test} from "bun:test";
import {Adversary} from "../src/ts/actors/Enemies/Adversary";
import {ActorController} from "../src/ts/actors/actorController";
import {ARCHETYPES} from "../src/ts/actors/resources/archetypes";
import {Role} from "../src/ts/actors/resources/Role";
import {Battlefield, FIELD_CAP} from "../src/ts/interact/battlefield";
import {AbilityEvent, BleedEvent, BlastEvent, CoverGoneEvent, HackEvent, RoutEvent, ShotEvent,
    SkipEvent, StabilizeEvent, SuppressEvent} from "../src/ts/interact/battleEvents";
import {Combat} from "../src/ts/interact/combat";
import {TacticalAI} from "../src/ts/interact/tacticalAI";
import {RunMap, encounterSpec, fightsCleared, spawnEncounter} from "../src/ts/interact/runMap";
import {fighter, withRandom} from "./helpers";
import {outgoingMult, stacksOf} from "../src/ts/interact/statuses";

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
        me.bleeding = 2; me.crippled = true; me.stunned = 1;
        me.afflict("suppressed", 2); me.afflict("burn", 3); me.afflict("ward", 1);
        me.routed = true; me.moraleTested = true; me.abilityUsed = true; me.hackCooldown = 2;
        me.resetBattleState();
        expect(me.bleeding).toBe(0);
        expect(me.crippled).toBe(false);
        expect(me.stunned).toBe(0);
        expect(me.routed).toBe(false);
        expect(me.statuses).toEqual({});   // one bag, one wipe
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

    // Suppression quietly became unreachable once every shot started doing
    // damage: its old gate only fired when shooting was mathematically futile.
    // The gate is a trade now, so pin it down — a dead tactic looks exactly
    // like a working one from the outside.
    test("suppressing a dug-in target is still a plan the AI will pick", () => {
        Battlefield.COVER = [{x: 0, y: 28, kind: "crate"}];   // in front of the target, or it isn't cover
        const gun = require("../src/ts/items/Equipment").default.weapons
            .find((w: any) => w.autofire && w.weaponClass !== "melee" && w.shots >= 10);
        const me = fighter({ref: 6, skill: 6, x: 0, y: 0});
        me.weapon = gun.clone();
        me.resetBattleState();
        const foe = fighter({ref: 6, skill: 6, weapon: "AK-47 Medium Assault", x: 0, y: 30});
        let chosen = 0;
        for (let i = 0; i < 120; i++) {
            if (TacticalAI.plan(me, [me], [foe]).label === "suppress") { chosen += 1; }
        }
        expect(chosen).toBeGreaterThan(0);
    });

    // This used to assert that suppression ate the whole turn. Deleting a turn
    // is the worst thing you can do to a fight nobody is playing, so suppression
    // is a penalty now: the unit still acts, it just does less with it.
    test("a suppressed unit keeps its turn and shoots worse for it", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 8, skill: 8, weapon: "WSA Autopistol", x: 0, y: 5});
        me.afflict("suppressed", 2);
        const res = Combat.takeTurn(me, [me], [fighter({x: 0, y: 10})]);
        expect(res.events.some((e) => e.kind === "skip")).toBe(false);
        expect(res.events.some((e) => e.kind === "shot")).toBe(true);
        expect(outgoingMult(me)).toBeLessThan(1);
        // and it is a duration effect, so the turn it just took cost it a stack
        expect(stacksOf(me, "suppressed")).toBe(1);
    });

    test("stun is the only status that costs a turn, and it lasts exactly one", () => {
        Battlefield.COVER = [];
        const me = fighter({x: 0, y: 5});
        me.afflict("stunned", 5);              // capped at 1 however hard you hit
        expect(stacksOf(me, "stunned")).toBe(1);
        const res = Combat.takeTurn(me, [me], [fighter({x: 0, y: 20})]);
        expect((res.events.find((e) => e.kind === "skip") as SkipEvent).reason).toBe("stunned");
        expect(stacksOf(me, "stunned")).toBe(0);
    });

    // This used to assert the opposite: against SP 18 behind cover, flat armour
    // subtraction meant an autofire burst mathematically could not do damage,
    // so the AI suppressed instead of firing into a wall. The soak curve has no
    // walls — the burst is worth taking now, and the AI takes it.
    test("no target is uncrackable: autofire puts damage through SP 18 behind cover", () => {
        Battlefield.COVER = [{x: 0, y: 38, kind: "crate"}];
        const gun = require("../src/ts/items/Equipment").default.weapons
            .find((w: any) => w.autofire && w.weaponClass !== "melee" && w.shots >= 10);
        let landed = 0, shots = 0;
        for (let i = 0; i < 40; i++) {
            const auto = fighter({ref: 5, skill: 5, x: 0, y: 0});
            auto.weapon = gun.clone();
            auto.resetBattleState();
            const tank = fighter({x: 0, y: 40});
            tank.equipment.upper = new (require("../src/ts/items/Armor").Armor)(
                "upper", "Test Plate", "test", 1, 18, 0, "");
            const res = Combat.takeTurn(auto, [auto], [tank]);
            const shot = res.events.find((e) => e.kind === "shot") as any;
            if (shot && shot.hit) { shots += 1; if (shot.damage > 0) { landed += 1; } }
        }
        expect(shots).toBeGreaterThan(30);   // fumbles are the only way to whiff now
        // every shot that connects gets something through — that is the floor
        expect(landed).toBe(shots);
    });
});

describe("nobody shoots a body", () => {
    test("a unit that is dead, dying or fled takes nothing and reports nothing", () => {
        for (const setup of [
            (a: any) => { a.health = 0; a.mortallyWounded = true; },   // DYING
            (a: any) => { a.routed = true; },                          // ran off the street
            (a: any) => { a.alive = false; a.health = 0; },            // dead
        ]) {
            const t = fighter();
            setup(t);
            const before = t.health;
            expect(t.receiveDamage(20)).toBe(0);
            expect(t.health).toBe(before);
        }
    });

    test("damage reported is damage taken — overkill is not a number the board can draw", () => {
        const t = fighter();
        t.health = 3;
        // 30 raw against no armour would have reported 30 over a bar holding 3
        expect(t.receiveDamage(30)).toBe(3);
        expect(t.health).toBe(0);
    });

    test("a body is worth one bounty, however many rounds go into it", () => {
        Battlefield.COVER = [];
        const me = fighter({ref: 9, skill: 9, weapon: "AK-47 Medium Assault", x: 0, y: 5});
        const foe = fighter({x: 0, y: 10});
        foe.health = 1;
        // pinned: the quality bands keep a 1% miss floor at any edge, and a
        // fumbled opening shot would fail this on the setup rather than on the
        // thing it is testing
        withRandom(0.5, () => Combat.attack(me, foe));
        const first = me.kills;
        expect(first).toBe(1);
        withRandom(0.5, () => Combat.attack(me, foe));   // keep shooting the corpse
        withRandom(0.5, () => Combat.attack(me, foe));
        expect(me.kills).toBe(first);
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
    const combatNode = {id: "n", type: "combat", junction: 0, pos: {x: 0, y: 0}} as any;

    test("a quarter of firefights carry a holdout clock, once the shakedown is over", () => {
        const clocked = withRandom(0.1, () => encounterSpec(combatNode, 1, 1, 2));
        expect(clocked.holdout).toBe(4);
        const plain = withRandom(0.5, () => encounterSpec(combatNode, 1, 1, 2));
        expect(plain.holdout).toBeUndefined();
    });

    test("a sector's opening fights never carry one", () => {
        // 0.1 would clock any later fight; the first two are never on a clock
        [0, 1].forEach((fought) => {
            expect(withRandom(0.1, () => encounterSpec(combatNode, 1, 1, fought)).holdout).toBeUndefined();
            expect(withRandom(0.1, () => encounterSpec(combatNode, 2, 3, fought)).holdout).toBeUndefined();
        });
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

    // The phone HUD's hostile column is a fixed 172px with its scrollbar hidden,
    // so exactly four rows fit. A fifth hostile did not crowd the list, it fell
    // off the bottom of it with nothing on screen to say it was there.
    test("no encounter spawns more hostiles than the field cap", () => {
        for (const type of ["combat", "elite", "boss"]) {
            const node = {id: "n", type, junction: 0, pos: {x: 0, y: 0}} as any;
            for (const roll of [0.1, 0.5, 0.9]) {
                const spec = withRandom(roll, () => encounterSpec(node, 3, 6));
                const spawned = withRandom(roll, () => spawnEncounter(spec));
                expect(spawned.length).toBeLessThanOrEqual(FIELD_CAP);
            }
        }
    });

    test("backup only tops the street up to the cap, never past it", () => {
        // what App.maybeReinforce works out before it calls getReinforcements
        const room = (standing: number, want: number) =>
            Math.min(want, Math.max(0, FIELD_CAP - standing));
        expect(room(2, 2)).toBe(2);     // two down, two in — back to four
        expect(room(3, 2)).toBe(1);     // only one seat left
        expect(room(4, 2)).toBe(0);     // full street, nobody joins
    });
});

/**
 * The opening of a run is the one stretch where the player has no lever left to
 * pull: two bodies, a sidearm, and whatever the map put next to the drop point.
 * These are the guarantees that make that survivable.
 */
describe("the shakedown — a run's opening fights", () => {
    const combat = {id: "n", type: "combat", junction: 0, pos: {x: 0, y: 0}} as any;

    test("the first two firefights of a run field rank-1 street mooks", () => {
        [0, 1].forEach((fought) => {
            const spec = encounterSpec(combat, 1, 1, fought);
            expect(spec.rank).toBe(1);
            for (let i = 0; i < 20; i++) {
                spawnEncounter(spec).forEach((e) => expect(e.rank).toBe(1));
            }
        });
    });

    test("and three of them — the shakedown is the tier, not a smaller fight", () => {
        expect(encounterSpec(combat, 1, 1, 0).amount).toBe(3);
        expect(withRandom(0.1, () => encounterSpec(combat, 1, 1, 0)).amount).toBe(3);
    });

    test("gangers arrive once the squad has two fights behind it", () => {
        const spec = encounterSpec(combat, 1, 1, 2);
        expect(spec.rank).toBe(0);                        // back to the level's rank band
        const ranks = new Set<number>();
        for (let i = 0; i < 60; i++) { spawnEncounter(spec).forEach((e) => ranks.add(e.rank)); }
        expect(ranks.has(2)).toBe(true);
    });

    test("the fourth body waits for a crew that could have grown one", () => {
        // 0.1 clears the 35% roll wherever it is allowed to happen at all
        expect(withRandom(0.1, () => encounterSpec(combat, 1, 1, 2)).amount).toBe(3);
        expect(withRandom(0.1, () => encounterSpec(combat, 1, 1, 4)).amount).toBe(4);
    });

    test("sector 2 opens on the band — the shakedown is for the first sector", () => {
        expect(encounterSpec(combat, 2, 3, 0).rank).toBe(0);
    });

    test("the drop point is not a fight the squad has had", () => {
        const run = RunMap.generate(1);
        const entry = RunMap.find(run, run.position)!;
        expect(entry.type).toBe("entry");
        expect(run.clearedIds).toEqual([entry.id]);
        expect(fightsCleared(run)).toBe(0);
        // and clearing a real firefight does count
        const fight = run.nodes.find((n) => n.type === "combat")!;
        expect(fightsCleared({...run, clearedIds: [entry.id, fight.id]})).toBe(1);
    });
});
