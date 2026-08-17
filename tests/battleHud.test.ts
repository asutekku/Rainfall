import {describe, expect, test} from "bun:test";
// enter the Actor ⇄ GetItem ⇄ Player import cycle through getItem — going in
// through helpers → Actor first leaves `class Player extends Actor` in TDZ
import "../src/ts/interact/getItem";
import {hudArmor, hudTags, unitConditions} from "../src/ts/components/combat/hudInfo";
import {STATUS, StatusKey} from "../src/ts/interact/statuses";
import {fighter} from "./helpers";

describe("phone battle HUD row data", () => {
    test("a healthy unit carries no chips", () => {
        expect(hudTags(fighter())).toEqual([]);
    });

    test("battle states become chips, worst first, capped at two", () => {
        const a = fighter();
        a.afflict("bleed", 2);
        a.afflict("suppressed", 1);
        a.afflict("shred", 1);
        const tags = hudTags(a).map(([label]) => label);
        expect(tags.length).toBe(2);
        expect(tags[0]).toBe("BLD");   // the damage-over-time outranks the rest
    });

    test("a status without a chip stays off the row and still reaches the card", () => {
        const a = fighter();
        a.afflict("crippled", 1);
        a.afflict("hardened", 3);
        expect(hudTags(a)).toEqual([]);
        expect(unitConditions(a).map(([l]) => l)).toEqual(["Hardened", "Crippled"].sort((x, y) =>
            unitConditions(a).findIndex(([l]) => l === x) - unitConditions(a).findIndex(([l]) => l === y)));
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

    test("every status in the registry explains itself in words", () => {
        for (const key of Object.keys(STATUS) as StatusKey[]) {
            const a = fighter();
            a.afflict(key, 2);
            const named = unitConditions(a).find(([l]) => l === STATUS[key].label);
            expect(named).toBeTruthy();
            expect(named![1].length).toBeGreaterThan(10);
            expect(named![2]).toBe(STATUS[key].debuff);
        }
    });

    test("buffs and debuffs are told apart, so the card can colour them", () => {
        const a = fighter();
        a.afflict("burn", 2);
        a.afflict("thorns", 3);
        const rows = unitConditions(a);
        expect(rows.find(([l]) => l === "Burning")![2]).toBe(true);
        expect(rows.find(([l]) => l === "Spiked")![2]).toBe(false);
    });

    test("armor reads the better of worn and subdermal plate", () => {
        const a = fighter();
        const worn = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
        expect(hudArmor(a)).toBe(Math.max(worn, a.cyberSP()));
    });
});
