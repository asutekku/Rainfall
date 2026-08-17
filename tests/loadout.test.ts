import {describe, expect, test} from "bun:test";
import {Deployment, KIT_ORDER, KIT_PICKS, STANCES, STANCE_ORDER, emptyKit, issue,
    kitTotal, reviveKit, stanceIn, stanceOf, stanceOut, startingKit, stow} from "../src/ts/interact/loadout";
import {fighter} from "./helpers";

describe("stances are the AI dial, exposed", () => {
    test("every stance names a profile the tactical AI actually has", () => {
        // the profiles live in tacticalAI.PROFILES; these are the keys it knows
        const known = ["balanced", "aggressive", "flanker", "camper", "berserker"];
        STANCE_ORDER.forEach((s) => {
            expect(known).toContain(STANCES[s].temperament);
        });
    });

    test("the screen opens on the stance the unit already fights with", () => {
        const a = fighter();
        a.temperament = "camper";
        expect(stanceOf(a)).toBe("hold");
        a.temperament = "berserker";
        expect(stanceOf(a)).toBe("push");
        a.temperament = "flanker";
        expect(stanceOf(a)).toBe("steady");
    });

    test("issuing orders rewrites the profile the AI will plan on", () => {
        const a = fighter();
        a.temperament = "balanced";
        issue({stances: [{actor: a, stance: "push"}], picks: []}, emptyKit());
        expect(a.temperament).toBe("aggressive");
        expect(a.stance).toBe("push");
    });

    /**
     * Built on temperament alone the stance picker moved win rates by 2-6pp
     * with no consistent sign — buttons that did nothing. These are the teeth.
     */
    test("push trades damage taken for damage dealt, hold trades the other way", () => {
        expect(STANCES.push.out).toBeGreaterThan(1);
        expect(STANCES.push.incoming).toBeGreaterThan(1);
        expect(STANCES.hold.out).toBeLessThan(1);
        expect(STANCES.hold.incoming).toBeLessThan(1);
        expect(STANCES.steady.out).toBe(1);
        expect(STANCES.steady.incoming).toBe(1);
    });

    test("the trades are symmetric, so no stance is simply correct", () => {
        // out and incoming move together and by the same amount: what decides
        // the answer is the objective, not the arithmetic
        expect(STANCES.push.out).toBe(STANCES.push.incoming);
        expect(STANCES.hold.out).toBe(STANCES.hold.incoming);
    });

    test("nobody who was never given orders is affected", () => {
        const a = fighter();
        expect(a.stance).toBeNull();
        expect(stanceOut(a)).toBe(1);
        expect(stanceIn(a)).toBe(1);
    });

    test("the trade is applied to real damage, both ways", () => {
        const push = fighter();
        const held = fighter();
        issue({stances: [{actor: push, stance: "push"}, {actor: held, stance: "hold"}], picks: []}, emptyKit());
        expect(stanceOut(push)).toBeCloseTo(STANCES.push.out);
        expect(stanceIn(held)).toBeCloseTo(STANCES.hold.incoming);
        // a pushing shooter into a dug-in target is the two multiplied
        expect(stanceOut(push) * stanceIn(held)).toBeCloseTo(1.3 * 0.75);
    });

    test("every stance is priced on the button", () => {
        STANCE_ORDER.forEach((s) => {
            expect(STANCES[s].trade[0].length).toBeGreaterThan(0);
            expect(STANCES[s].trade[1].length).toBeGreaterThan(0);
        });
    });
});

describe("ordnance is crew property, drawn per job", () => {
    const plan = (picks: Deployment["picks"]): Deployment => ({stances: [], picks});

    test("a crew opens with something in the crate", () => {
        expect(kitTotal(startingKit())).toBeGreaterThan(0);
        expect(kitTotal(emptyKit())).toBe(0);
    });

    test("what goes out comes off the crate and onto a belt", () => {
        const a = fighter();
        const crate = {...emptyKit(), frag: 2, emp: 1};
        issue(plan([{item: "frag", carrier: a}, {item: "emp", carrier: a}]), crate);
        expect(a.grenades).toBe(1);
        expect(a.emps).toBe(1);
        expect(crate.frag).toBe(1);
        expect(crate.emp).toBe(0);
    });

    test("you cannot draw what the crate does not have", () => {
        const a = fighter();
        const crate = emptyKit();
        issue(plan([{item: "flash", carrier: a}]), crate);
        expect(a.flashes).toBe(0);
        expect(crate.flash).toBe(0);
    });

    test("what came back unthrown goes back in the crate", () => {
        const a = fighter();
        const crate = {...emptyKit(), frag: 2};
        issue(plan([{item: "frag", carrier: a}, {item: "frag", carrier: a}]), crate);
        expect(crate.frag).toBe(0);
        a.grenades -= 1;                       // one was thrown, one wasn't
        stow([a], crate);
        expect(crate.frag).toBe(1);
        expect(a.grenades).toBe(0);
    });

    test("what a body was carrying when they went down stays on the street", () => {
        const a = fighter();
        const crate = {...emptyKit(), frag: 1};
        issue(plan([{item: "frag", carrier: a}]), crate);
        a.health = 0;
        a.alive = false;
        stow([a], crate);
        expect(crate.frag).toBe(0);
        expect(a.grenades).toBe(0);
    });

    test("scavenged ordnance ends up in the crate at the end of the fight", () => {
        const a = fighter();
        const crate = emptyKit();
        a.grenades += 1;                       // Economy drops one off a body mid-fight
        stow([a], crate);
        expect(crate.frag).toBe(1);
    });

    test("two go out on a job — enough to be a choice, not the whole crate", () => {
        expect(KIT_PICKS).toBe(2);
        expect(KIT_ORDER.length).toBeGreaterThan(KIT_PICKS);
    });

    test("a checkpoint written before the crate existed still loads", () => {
        expect(reviveKit(undefined)).toEqual(emptyKit());
        expect(reviveKit({frag: 3})).toEqual({...emptyKit(), frag: 3});
    });
});
