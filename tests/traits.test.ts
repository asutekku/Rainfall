import {describe, expect, test} from "bun:test";
import {Merc} from "../src/ts/actors/Merc";
import {
    TRAITS, TRAIT_IDS, rollTraits, traitHas, traitMult, traitOpeners, traitPrice,
    traitRiders, traitSum,
} from "../src/ts/actors/resources/traits";
import {MercMarket} from "../src/ts/interact/mercMarket";
import {STATUS} from "../src/ts/interact/statuses";
import {Battlefield} from "../src/ts/interact/battlefield";
import {TacticalAI} from "../src/ts/interact/tacticalAI";
import {fighter} from "./helpers";

describe("the table keeps its two rules", () => {
    test("every trait says what it does in one line", () => {
        // A trait the player has to memorise is a trait they ignore.
        TRAIT_IDS.forEach((id) => {
            expect([id, TRAITS[id]!.blurb.length > 15]).toEqual([id, true]);
            expect([id, TRAITS[id]!.name.length > 2]).toEqual([id, true]);
        });
    });

    test("no trait is purely bad — a downside always buys a discount", () => {
        // A card with no upside is a card nobody picks, which makes it a worse
        // candidate rather than a different one.
        TRAIT_IDS.forEach((id) => {
            const t = TRAITS[id]!;
            const harmful = (t.out || 1) < 1 || (t.incoming || 1) > 1 || (t.firstHitIn || 1) > 1
                || (t.edge || 0) < 0 || (t.caution || 1) > 1 || (t.payCut || 0) > 0;
            const helpful = (t.out || 1) > 1 || (t.incoming || 1) < 1 || (t.edge || 0) > 0
                || (t.lowHpOut || 1) > 1 || !!t.rider || !!t.open || !!t.hates
                || (t.salvage || 0) > 0 || (t.buyoutCut || 0) > 0 || (t.caution || 1) < 1;
            if (harmful && !helpful) {
                expect([id, "must discount", t.price < 1]).toEqual([id, "must discount", true]);
            }
            expect([id, t.price > 0]).toEqual([id, true]);
        });
    });

    test("every rider and opener names a status the engine has", () => {
        TRAIT_IDS.forEach((id) => {
            const t = TRAITS[id]!;
            if (t.rider) { expect(STATUS[t.rider.key]).toBeDefined(); }
            if (t.open) { expect(STATUS[t.open.key]).toBeDefined(); }
        });
    });

    test("both directions exist — flaws that discount and boons that cost", () => {
        expect(TRAIT_IDS.some((id) => TRAITS[id]!.price < 1)).toBe(true);
        expect(TRAIT_IDS.some((id) => TRAITS[id]!.price > 1)).toBe(true);
    });
});

describe("rolling a person", () => {
    test("one to three traits, never repeated on the same body", () => {
        for (let i = 0; i < 300; i++) {
            const rolled = rollTraits();
            expect(rolled.length).toBeGreaterThanOrEqual(1);
            expect(rolled.length).toBeLessThanOrEqual(3);
            expect(new Set(rolled).size).toBe(rolled.length);
            rolled.forEach((id) => expect(TRAITS[id]).toBeDefined());
        }
    });

    test("the pool actually gets used, not just the heavy end of it", () => {
        const seen = new Set<string>();
        for (let i = 0; i < 600; i++) { rollTraits().forEach((t) => seen.add(t)); }
        expect(seen.size).toBe(TRAIT_IDS.length);
    });
});

describe("the hooks do arithmetic, not nothing", () => {
    test("multiplicative hooks compound and default to 1", () => {
        expect(traitMult([], "out")).toBe(1);
        expect(traitMult(["reckless"], "out")).toBeCloseTo(1.15, 5);
        expect(traitMult(["reckless", "tunnelVision"], "out")).toBeCloseTo(1.15 * 1.08, 5);
    });

    test("additive hooks sum and default to 0", () => {
        expect(traitSum([], "edge")).toBe(0);
        expect(traitSum(["steadyHands", "triggerDiscipline"], "edge")).toBe(5);
    });

    test("riders, openers and booleans read off the table", () => {
        expect(traitRiders(["butcher"]).length).toBe(1);
        expect(traitRiders(["coward"]).length).toBe(0);
        expect(traitOpeners(["juiced"]).length).toBe(1);
        expect(traitHas(["tunnelVision"], "sticky")).toBe(true);
        expect(traitHas(["coward"], "sticky")).toBe(false);
    });

    test("an unknown id is ignored rather than fatal", () => {
        // Save files outlive trait tables.
        expect(traitMult(["nonesuch"], "out")).toBe(1);
        expect(traitSum(["nonesuch"], "edge")).toBe(0);
        expect(traitPrice(["nonesuch"])).toBe(1);
    });
});

describe("traits on a body", () => {
    test("Glass Jaw bills the first hit of a fight and then stops", () => {
        const a = fighter();
        a.traits = ["glassJaw"];
        expect(a.traitIn()).toBeCloseTo(1.35, 5);
        a.tookHit = true;
        expect(a.traitIn()).toBeCloseTo(1, 5);
        a.resetBattleState();
        expect(a.traitIn()).toBeCloseTo(1.35, 5);   // a new fight, a new opening hit
    });

    test("Last Stand only pays when they are actually cornered", () => {
        const a = fighter();
        a.traits = ["lastStand"];
        expect(a.traitOut()).toBeCloseTo(1, 5);
        a.health = a.maxHealth * 0.2;
        expect(a.traitOut()).toBeCloseTo(1.5, 5);
    });

    test("Bad Blood only bites the crew they have history with", () => {
        const a = fighter();
        a.grudge = "Maelstrom";
        expect(a.grudgeAgainst("Maelstrom")).toBeCloseTo(1.4, 5);
        expect(a.grudgeAgainst("Wraiths")).toBe(1);
        expect(a.grudgeAgainst(undefined)).toBe(1);
    });

    test("Scrounger stacks with a Scav faction rather than replacing it", () => {
        const a = fighter();
        a.faction = "Scav";
        const bare = a.scavengeBonus();
        a.traits = ["scrounger"];
        expect(a.scavengeBonus()).toBeGreaterThan(bare);
    });
});

describe("the board prices what it is selling", () => {
    test("a flaw makes a candidate cheaper, a boon dearer", () => {
        expect(traitPrice(["glassJaw"])).toBeLessThan(1);
        expect(traitPrice(["hardToKill"])).toBeGreaterThan(1);
        expect(traitPrice(["glassJaw", "owesMoney"])).toBeLessThan(traitPrice(["glassJaw"]));
    });

    test("every candidate turns up with traits, and carries them onto the crew", () => {
        for (let i = 0; i < 30; i++) {
            const offer = MercMarket.offer(3);
            expect(offer.traits.length).toBeGreaterThan(0);
            const merc = new Merc(offer);
            expect(merc.traits).toEqual(offer.traits);
        }
    });

    test("a Bad Blood hire has somebody to have it with", () => {
        let checked = 0;
        for (let i = 0; i < 300 && checked < 3; i++) {
            const offer = MercMarket.offer(3);
            if (offer.traits.indexOf("badBlood") >= 0) {
                expect(typeof offer.grudge).toBe("string");
                checked++;
            } else {
                expect(offer.grudge).toBe(null);
            }
        }
    });

    test("Union Rates cuts the Trauma Team bill it is charging you for", () => {
        const offer = MercMarket.offer(3);
        const plain = new Merc({...offer, traits: []});
        const union = new Merc({...offer, traits: ["unionRates"]});
        expect(union.buyoutCost()).toBeLessThan(plain.buyoutCost());
    });
});

describe("support actions are chosen by arithmetic, not by hand-written gates", () => {
    test("a Medtech spends the turn on a dying ally rather than shooting", () => {
        Battlefield.COVER = [];
        const medic = fighter({cls: "medtech", x: 0, y: 5});
        const down = fighter({x: 2, y: 5});
        down.health = 0;
        down.mortallyWounded = true;
        const plan = TacticalAI.plan(medic, [medic, down], [fighter({x: 0, y: 30})]);
        expect(plan.stabilizeTarget).toBe(down);
    });

    test("a hurt medic still goes — the old rule benched them below 35% health", () => {
        // The gate was arbitrary: a medic on 30% health standing next to a body
        // bleeding out was told to shoot instead. Now it is priced.
        Battlefield.COVER = [];
        const medic = fighter({cls: "medtech", x: 0, y: 5});
        medic.health = Math.floor(medic.maxHealth * 0.3);
        const down = fighter({x: 2, y: 5});
        down.health = 0;
        down.mortallyWounded = true;
        const plan = TacticalAI.plan(medic, [medic, down], [fighter({x: 0, y: 30})]);
        expect(plan.stabilizeTarget).toBe(down);
    });

    // A body with no weapon and no armour has nothing to prevent and nothing to
    // give up, so these need real kit or the arithmetic is comparing two zeroes.
    const armed = (cfg: any) => fighter({weapon: "WSA Autopistol", ...cfg});

    test("a Rigger plates an ally when there is real fire to soak", () => {
        // Deliberately lopsided: three rifles bearing down, and the Rigger
        // holding a pistol. That is exactly the trade the arithmetic exists to
        // resolve — their own shot is worth little, the plate is worth a lot.
        Battlefield.COVER = [];
        const rig = armed({cls: "rigger", x: 0, y: 5});
        const mate = armed({x: 2, y: 5});
        const foes = [
            fighter({weapon: "AKR-20 Medium Assault", skill: 8, x: 0, y: 14}),
            fighter({weapon: "AKR-20 Medium Assault", skill: 8, x: 4, y: 14}),
            fighter({weapon: "AKR-20 Medium Assault", skill: 8, x: -4, y: 14}),
        ];
        const plan = TacticalAI.plan(rig, [rig, mate], foes);
        expect(plan.bolsterTarget).toBe(mate);
    });

    test("...and shoots instead when the plate would not be worth the turn", () => {
        // The flip side, and the reason this is arithmetic rather than a rule:
        // against two pistols there is little to prevent, so the Rigger fires.
        Battlefield.COVER = [];
        const rig = armed({cls: "rigger", x: 0, y: 5});
        const mate = armed({x: 2, y: 5});
        const foes = [armed({x: 0, y: 12}), armed({x: 3, y: 12})];
        const plan = TacticalAI.plan(rig, [rig, mate], foes);
        expect(plan.bolsterTarget).toBeUndefined();
    });

    test("nobody plates themselves instead of doing their job", () => {
        Battlefield.COVER = [];
        const rig = armed({cls: "rigger", x: 0, y: 5});
        const plan = TacticalAI.plan(rig, [rig], [armed({x: 0, y: 12})]);
        expect(plan.bolsterTarget).toBeUndefined();
    });

    test("a Gunner has no plate to hand out", () => {
        Battlefield.COVER = [];
        const gun = armed({cls: "gunner", x: 0, y: 5});
        const mate = armed({x: 2, y: 5});
        const foes = [
            fighter({weapon: "AKR-20 Medium Assault", skill: 8, x: 0, y: 14}),
            fighter({weapon: "AKR-20 Medium Assault", skill: 8, x: 4, y: 14}),
            fighter({weapon: "AKR-20 Medium Assault", skill: 8, x: -4, y: 14}),
        ];
        const plan = TacticalAI.plan(gun, [gun, mate], foes);
        expect(plan.bolsterTarget).toBeUndefined();
    });
});
