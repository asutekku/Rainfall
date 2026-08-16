import {describe, expect, test} from "bun:test";
// enter the Actor ⇄ GetItem ⇄ Player import cycle through getItem — going in
// through helpers → Actor first leaves `class Player extends Actor` in TDZ
import "../src/ts/interact/getItem";
import {hudArmor, hudTags} from "../src/ts/components/combat/hudInfo";
import {fighter} from "./helpers";

describe("phone battle HUD row data", () => {
    test("a healthy unit carries no chips", () => {
        expect(hudTags(fighter(), false)).toEqual([]);
    });

    test("battle states become chips, worst first, capped at three", () => {
        const a = fighter();
        a.bleeding = 2;
        a.stunned = 1;
        a.pinned = true;
        a.crippled = true;
        const tags = hudTags(a, true).map(([label]) => label);
        expect(tags).toEqual(["BLD", "STN", "PIN"]);
    });

    test("dying beats downed beats fled — one fate chip only", () => {
        const dying = fighter();
        dying.mortallyWounded = true;
        dying.health = 0;
        expect(hudTags(dying, false)[0]![0]).toBe("DYING");
        const fled = fighter();
        fled.routed = true;
        expect(hudTags(fled, false).map(([l]) => l)).toEqual(["FLED"]);
        const down = fighter();
        down.health = 0;
        down.alive = false;
        expect(hudTags(down, false).map(([l]) => l)).toEqual(["DOWN"]);
    });

    test("a sniper's laser shows on the painted unit", () => {
        expect(hudTags(fighter(), true).map(([l]) => l)).toEqual(["MRK"]);
    });

    test("armor reads the better of worn and subdermal plate", () => {
        const a = fighter();
        const worn = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
        expect(hudArmor(a)).toBe(Math.max(worn, a.cyberSP()));
    });
});
