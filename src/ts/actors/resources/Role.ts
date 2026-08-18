import {CLASS_IDS, CLASSES, Line, classFromLegacyRole, classSpec} from "./classes";
import type {StatusKey} from "../../interact/statuses";

/**
 * A unit's combat class, as the rest of the game reads it.
 *
 * The name stays `Role` because "role" is exactly the right word for what this
 * now holds — a battlefield role, tank or damage or control or support. What
 * changed is the content: the nine Cyberpunk 2020 trades became the nine combat
 * classes in `classes.ts`, which are picked for what they do in a firefight
 * rather than for what they do for a living.
 */
export class Role {
    /** The class id (`bulwark`, `marksman`, ...) — the stable key. */
    public id: string;
    public name: string;
    /** One line: what this class is for. */
    public role: string;
    public line: Line;
    public weapons: string[];
    public color: string;
    public portrait: string;
    public rider: { key: StatusKey; stacks: number; chance: number } | undefined;
    /** The line the character sheet prints. */
    public edge: string;

    constructor(id?: string) {
        const key = id
            ? classFromLegacyRole(id)
            : CLASS_IDS[(CLASS_IDS.length * Math.random()) << 0]!;
        const spec = classSpec(key);
        this.id = CLASSES[key] ? key : "gunner";
        this.name = spec.name;
        this.role = spec.role;
        this.line = spec.line;
        this.weapons = spec.weapons;
        this.color = spec.color;
        this.portrait = `src/media/portraits/${spec.portrait}.png`;
        this.rider = spec.rider;
        this.edge = spec.edge;
    }
}
