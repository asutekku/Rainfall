import {describe, expect, test} from "bun:test";
// enter the Actor ⇄ GetItem ⇄ Player import cycle through getItem — going in
// through helpers → Actor first leaves `class Player extends Actor` in TDZ
import "../src/ts/interact/getItem";
import {hudArmor, hudTags, unitConditions} from "../src/ts/components/combat/hudInfo";
import {fighter} from "./helpers";

describe("phone battle HUD row data", () => {
    test("a healthy unit carries no chips", () => {
        expect(hudTags(fighter())).toEqual([]);
    });

    test("battle states become chips, worst first, capped at two", () => {
        const a = fighter();
        a.bleeding = 2;
        a.stunned = 1;
        a.pinned = true;
        const tags = hudTags(a).map(([label]) => label);
        expect(tags).toEqual(["BLD", "STN"]);
    });

    test("dying beats downed beats fled — one fate chip only", () => {
        const dying = fighter();
        dying.mortallyWounded = true;
        dying.health = 0;
        expect(hudTags(dying)[0]![0]).toBe("DYING");
        const fled = fighter();
        fled.routed = true;
        expect(hudTags(fled).map(([l]) => l)).toEqual(["FLED"]);
        const down = fighter();
        down.health = 0;
        down.alive = false;
        expect(hudTags(down).map(([l]) => l)).toEqual(["DOWN"]);
    });

    test("marked and crippled stay off the row — the card names them", () => {
        const a = fighter();
        a.crippled = true;
        expect(hudTags(a)).toEqual([]);
        expect(unitConditions(a, true).map(([l]) => l)).toEqual(["Crippled", "Marked"]);
    });

    test("every condition the card spells out carries an explanation", () => {
        const a = fighter();
        a.bleeding = 3;
        a.stunned = 1;
        a.pinned = true;
        const named = unitConditions(a, false);
        expect(named.map(([l]) => l)).toEqual(["Bleeding", "Stunned", "Pinned"]);
        expect(named.every(([, why]) => why.length > 0)).toBe(true);
    });

    test("armor reads the better of worn and subdermal plate", () => {
        const a = fighter();
        const worn = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
        expect(hudArmor(a)).toBe(Math.max(worn, a.cyberSP()));
    });
});
