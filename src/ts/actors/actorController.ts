import {Actor} from "./Actor";
import {Adversary} from "./Enemies/Adversary";
import {Goon} from "./Enemies/Goon";
import {factionsOfRank, pickArchetypeFrom, pickArchetypeOfRank, pickFaction,
    pickRankedFrom} from "./resources/archetypes";

export class ActorController {
    /** Legacy plain goons (kept for anything that still wants a rank-1 mook). */
    public static getGoons(amount: number): Goon[] {
        const goons = [];
        for (let i = 0; i < amount; i++) { goons.push(new Goon()); }
        return goons;
    }

    /**
     * A wave of faction enemies scaled to the party's level — the main spawner.
     * Themed: the whole wave belongs to ONE faction, so a Maelstrom ambush
     * looks and fights like Maelstrom instead of a random grab-bag.
     */
    public static getEnemies(amount: number, level: number): Actor[] {
        const faction = pickFaction(level);
        const out: Actor[] = [];
        for (let i = 0; i < amount; i++) { out.push(new Adversary(pickArchetypeFrom(faction, level), level)); }
        return out;
    }

    /** A wave drawn from an exact archetype rank — the "elite contact" nodes (one faction). */
    public static getEliteWave(amount: number, level: number, rank: number): Actor[] {
        const r = Math.max(1, Math.min(5, rank));
        const factions = factionsOfRank(r);
        const faction = factions.length ? factions[(Math.random() * factions.length) << 0]! : null;
        const out: Actor[] = [];
        for (let i = 0; i < amount; i++) {
            out.push(new Adversary(faction ? pickRankedFrom(faction, r) : pickArchetypeOfRank(r), level));
        }
        return out;
    }

    /**
     * A boss encounter: a forced high-rank adversary plus one escort drawn
     * from the boss's own faction where it fields one. Rank is the sector's
     * job, not the level's — a rank-5 boss in Flak armour is unkillable with
     * the sidearm a run opens on, so early sectors cap out lower and the
     * ladder climbs with the run.
     */
    public static getBoss(level: number, rank: number = 5): Actor[] {
        const bossType = pickArchetypeOfRank(Math.max(1, Math.min(5, rank)));
        return [
            new Adversary(bossType, level + 2),
            new Adversary(pickArchetypeFrom(bossType.faction, level), level),
        ];
    }
}
