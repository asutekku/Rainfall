import {Actor} from "../actors/Actor";
import {Purse} from "./crew";

export interface HousingTier {
    name: string;
    upkeep: number;    // eddies per pay period
    restBonus: number; // added to BODY when resting here (negative on the Streets)
}

// Cyberpunk RED housing, from sleeping rough up to a corporate suite. Better
// digs cost more upkeep but heal you faster between jobs.
const HOUSING: { [key: string]: HousingTier } = {
    Streets:     {name: "Streets",         upkeep: 0,    restBonus: -2},
    CubeHotel:   {name: "Cube Hotel",      upkeep: 50,   restBonus: 0},
    CheapConapt: {name: "Cheap Conapt",    upkeep: 200,  restBonus: 3},
    NiceConapt:  {name: "Nice Conapt",     upkeep: 500,  restBonus: 6},
    Corporate:   {name: "Corporate Suite", upkeep: 1000, restBonus: 12},
};

const TRAUMA_TEAM_UPKEEP: number = 100;

export class Lifestyle {
    public static tier(key: string): HousingTier {
        return HOUSING[key] || HOUSING["Streets"]!;
    }

    /** Extra HP healed by resting in the actor's current housing. */
    public static restBonus(actor: Actor): number {
        return Lifestyle.tier(actor.housing).restBonus;
    }

    /** Rent + subscriptions due this period. */
    public static upkeepCost(actor: Actor): number {
        return Lifestyle.tier(actor.housing).upkeep + (actor.traumaTeam ? TRAUMA_TEAM_UPKEEP : 0);
    }

    /**
     * Pay a period's cost of living. If the actor can't cover it they are
     * evicted to the Streets and their Trauma Team subscription lapses. Returns
     * true if everything was paid.
     */
    public static payUpkeep(actor: Actor): boolean {
        // Fixer "Operator" negotiates the rent down.
        const cost: number = Math.max(0, Lifestyle.upkeepCost(actor) - actor.operatorBonus() * 10);
        if (Purse.spend(actor, cost)) {
            return true;
        }
        Purse.garnish(actor, cost);
        actor.housing = "Streets";
        actor.traumaTeam = false;
        return false;
    }
}
