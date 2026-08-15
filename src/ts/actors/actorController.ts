import {Actor} from "./Actor";
import {Adversary} from "./Enemies/Adversary";
import {Goon} from "./Enemies/Goon";
import {pickArchetype, pickArchetypeOfRank} from "./resources/archetypes";

export class ActorController {
    /** Legacy plain goons (kept for anything that still wants a rank-1 mook). */
    public static getGoons(amount: number): Goon[] {
        const goons = [];
        for (let i = 0; i < amount; i++) { goons.push(new Goon()); }
        return goons;
    }

    /** A wave of faction enemies scaled to the party's level — the main spawner. */
    public static getEnemies(amount: number, level: number): Actor[] {
        const out: Actor[] = [];
        for (let i = 0; i < amount; i++) { out.push(new Adversary(pickArchetype(level), level)); }
        return out;
    }

    /**
     * A boss encounter: a forced high-rank adversary plus one escort. Rank is
     * the sector's job, not the level's — a rank-5 boss in Flak armour is
     * unkillable with the sidearm a run opens on, so early sectors cap out
     * lower and the ladder climbs with the run.
     */
    public static getBoss(level: number, rank: number = 5): Actor[] {
        return [
            new Adversary(pickArchetypeOfRank(Math.max(1, Math.min(5, rank))), level + 2),
            new Adversary(pickArchetype(level), level),
        ];
    }
}
