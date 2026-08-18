import {describe, expect, test} from "bun:test";
import {Actor} from "../src/ts/actors/Actor";
import {ROSTER_CAP, SQUAD_CAP} from "../src/ts/interact/loadout";
import {RunController} from "../src/ts/interact/runController";
import {fighter} from "./helpers";

/** A hired gun: on the payroll, losable, and benchable. */
function hire(): Actor {
    const a = fighter();
    a.hireable = true;
    return a;
}

/** Your character: never a casualty, never benched. */
function boss(): Actor {
    const a = fighter();
    a.hireable = false;
    return a;
}

describe("the payroll is bigger than the street", () => {
    test("you can carry more bodies than you can deploy", () => {
        // The whole point of the split: if these were equal, staging would have
        // nothing to ask, because owning somebody would mean deploying them.
        expect(ROSTER_CAP).toBeGreaterThan(SQUAD_CAP);
    });
});

describe("fieldable decides who is actually on the street", () => {
    test("a full payroll still only puts SQUAD_CAP bodies on the street", () => {
        const party = [boss(), hire(), hire(), hire(), hire(), hire()];
        expect(party.length).toBe(ROSTER_CAP);
        expect(RunController.fieldable(party, party).length).toBe(SQUAD_CAP);
    });

    test("your character always walks in, and walks in first", () => {
        // Trauma Team, chrome and reputation all key off the character being in
        // the fight, so a selection that leaves them out is not a selection.
        const you = boss();
        const party = [you, hire(), hire()];
        const squad = RunController.fieldable([party[1]!, party[2]!], party);
        expect(squad[0]).toBe(you);
        expect(squad.length).toBe(3);
    });

    test("the benched are left behind", () => {
        const you = boss();
        const going = hire();
        const benched = hire();
        const party = [you, going, benched];
        const squad = RunController.fieldable([you, going], party);
        expect(squad).toContain(going);
        expect(squad).not.toContain(benched);
    });

    test("nobody who cannot fight is fielded, picked or not", () => {
        const you = boss();
        const down = hire();
        down.health = 0;
        expect(down.canFight()).toBe(false);
        const party = [you, down];
        expect(RunController.fieldable(party, party)).not.toContain(down);
    });

    test("a body who is not on the payroll cannot be smuggled onto the street", () => {
        // Guards against a stale selection surviving a debrief that struck
        // somebody off, which would put a corpse back in the fight.
        const you = boss();
        const stranger = hire();
        const party = [you];
        expect(RunController.fieldable([you, stranger], party)).toEqual([you]);
    });

    test("no selection at all means everybody who can fight", () => {
        const party = [boss(), hire()];
        expect(RunController.fieldable(undefined, party).length).toBe(2);
    });
});
