import {Actor} from "./Actor";
import {Adversary} from "./Enemies/Adversary";
import {Goon} from "./Enemies/Goon";
import {pickArchetype} from "./resources/archetypes";

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
}
