import {Actor} from "../actors/Actor";

export interface CheckResult {
    success: boolean;
    roll: number;
    total: number;
    margin: number;   // how far above (or below) the target number
    luckSpent: number;
}

/**
 * Cyberpunk RED skill-check resolution: 1d10 (exploding on a natural 10,
 * fumbling on a natural 1) + a flat modifier (STAT + skill + situational),
 * optionally topped up with Luck, compared against a DV or an opposed roll.
 */
export class Check {
    /** RED d10: natural 10 explodes (roll again, add); natural 1 fumbles (roll again, subtract). */
    public static redRoll(): number {
        const first: number = Math.floor(Math.random() * 10) + 1;
        if (first === 10) {
            return 10 + (Math.floor(Math.random() * 10) + 1);
        }
        if (first === 1) {
            return 1 - (Math.floor(Math.random() * 10) + 1);
        }
        return first;
    }

    /**
     * Static check vs a Difficulty Value. `modifier` is the actor's full flat
     * bonus (STAT + skill + accuracy + wound penalty + role bonuses). If the
     * result falls short the actor spends just enough Luck to try to cover it.
     */
    public static resolve(actor: Actor, modifier: number, dv: number): CheckResult {
        const roll: number = Check.redRoll();
        let total: number = roll + modifier;
        let luckSpent: number = 0;
        if (total < dv && actor.luck > 0) {
            luckSpent = actor.spendLuck(dv - total);
            total += luckSpent;
        }
        return {success: total >= dv, roll, total, margin: total - dv, luckSpent};
    }

    /** Opposed check (e.g. melee vs Evasion). Ties go to the attacker. */
    public static opposed(actor: Actor, atkMod: number, defMod: number): CheckResult {
        const atkRoll: number = Check.redRoll();
        const defTotal: number = Check.redRoll() + defMod;
        let atkTotal: number = atkRoll + atkMod;
        let luckSpent: number = 0;
        if (atkTotal < defTotal && actor.luck > 0) {
            luckSpent = actor.spendLuck(defTotal - atkTotal);
            atkTotal += luckSpent;
        }
        return {success: atkTotal >= defTotal, roll: atkRoll, total: atkTotal, margin: atkTotal - defTotal, luckSpent};
    }
}
