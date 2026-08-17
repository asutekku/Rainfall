import {describe, expect, test} from "bun:test";
import {Battlefield} from "../src/ts/interact/battlefield";
import {BattleRecorder} from "../src/ts/interact/battleReport";
import {RunController} from "../src/ts/interact/runController";
import {Crew} from "../src/ts/interact/crew";
import {emptyKit} from "../src/ts/interact/loadout";
import {TacticalAI} from "../src/ts/interact/tacticalAI";
import {fighter} from "./helpers";

describe("RunController.step — the per-turn fight arbiter", () => {
    const baseState = (party: any[], enemies: any[], crew: Crew = new Crew(0, emptyKit())): any => ({
        party, currentEnemies: enemies, crew,
        run: {outcome: "active"}, screen: "combat",
        messages: [], mobileTab: "arena", unread: 0, report: null,
    });

    test("clearing the last hostile seals a victory debrief", () => {
        const party = [fighter()];
        const foe = fighter();
        BattleRecorder.begin(party, [foe], "combat", "test");
        foe.health = 0;
        const patch: any = RunController.step(baseState(party, [foe]), [{msg: "x"}], 20);
        expect(patch.screen).toBe("debrief");
        expect(patch.report).toBeTruthy();
        expect(patch.report.outcome).toBe("victory");
    });

    test("a squad wipe seals a defeat and marks the run lost", () => {
        const me = fighter();
        const foe = fighter();
        BattleRecorder.begin([me], [foe], "combat", "test");
        me.health = 0;
        me.mortallyWounded = true;
        const patch: any = RunController.step(baseState([me], [foe]), [], 20);
        expect(patch.screen).toBe("debrief");
        expect(patch.run.outcome).toBe("lost");
        expect(patch.report.outcome).toBe("defeat");
    });

    test("an ongoing exchange just feeds the log and prunes the fallen", () => {
        const me = fighter();
        const foe = fighter();
        const down = fighter();
        down.health = 0;
        BattleRecorder.begin([me], [foe, down], "combat", "test");
        const patch: any = RunController.step(baseState([me], [foe, down]), [{msg: "bang"}], 20);
        expect(patch.screen).toBeUndefined();
        expect(patch.currentEnemies).toEqual([foe]);
        expect(patch.messages[0].msg).toBe("bang");
    });
});

describe("TacticalAI — using the street", () => {
    test("plans stay legal: known labels, in-bounds destinations", () => {
        Battlefield.deploy([], []);   // roll a real cover layout
        const me = fighter({ref: 6, skill: 5, weapon: "WSA Autopistol", x: 0, y: 5});
        const foe = fighter({ref: 6, skill: 5, weapon: "WSA Autopistol", x: 0, y: 30});
        for (let i = 0; i < 25; i++) {
            const plan = TacticalAI.plan(me, [me], [foe]);
            expect(["hold", "cover", "reposition", "attack"]).toContain(plan.label);
            if (plan.moveTo) {
                expect(plan.moveTo.x).toBeGreaterThanOrEqual(-24);
                expect(plan.moveTo.x).toBeLessThanOrEqual(24);
                expect(plan.moveTo.y).toBeGreaterThanOrEqual(0);
                expect(plan.moveTo.y).toBeLessThanOrEqual(44);
            }
        }
    });

    test("a camper hurting for cover tucks in behind it, on the safe side", () => {
        // one cover point square between the lines; a camper should claim it
        Battlefield.COVER = [{x: 0, y: 15, kind: "barrier"}];
        const me = fighter({ref: 6, skill: 5, weapon: "WSA Autopistol", x: 0, y: 10});
        me.temperament = "camper";
        me.health = Math.floor(me.maxHealth * 0.4);   // hurt → survival weighs heavy
        const foe = fighter({ref: 8, skill: 8, weapon: "WSA Autopistol", x: 0, y: 30});
        let tucked = 0;
        for (let i = 0; i < 30; i++) {
            const plan = TacticalAI.plan(me, [me], [foe]);
            const spot = plan.moveTo || {x: me.position.x, y: me.position.y};
            if (Battlefield.nearCover(spot)
                && Battlefield.coverPenaltyAt(spot, {x: foe.position.x, y: foe.position.y}) > 0) {
                tucked += 1;
            }
        }
        // stochastic planner: most rolls should still pick the shielded side
        expect(tucked).toBeGreaterThanOrEqual(20);
    });

    test("berserkers with blades close the distance", () => {
        Battlefield.COVER = [];
        const me = fighter({dex: 8, skill: 8, weapon: "Knife", x: 0, y: 5});
        me.temperament = "berserker";
        const foe = fighter({ref: 5, skill: 5, weapon: "WSA Autopistol", x: 0, y: 30});
        const plan = TacticalAI.plan(me, [me], [foe]);
        expect(plan.moveTo).toBeTruthy();
        expect(plan.moveTo!.y).toBeGreaterThan(me.position.y + 5);
    });
});
