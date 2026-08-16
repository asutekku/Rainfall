import {Actor} from "../actors/Actor";
import {Player} from "../actors/player";
import {CharacterSpec} from "../actors/resources/CharacterCreation";
import {MemberSnap, memberSnap, stamp} from "./saveGame";
import type {RunState} from "./runMap";

/**
 * The career: your merc, and everything that outlives a run.
 *
 * A run is a job that can be lost — it lives in `SaveGame` and dies with the
 * crew. A career is the person doing the jobs, and death is not supposed to
 * touch it: Trauma Team bills someone and drops them back on the street with
 * their levels, their training and their chrome. That contract only held for
 * as long as the tab stayed open, because the character existed nowhere but
 * React state; this is where they live now.
 *
 * Two keys, two lifetimes. `SaveGame.clear()` on a wipe leaves the career
 * standing. Only retiring a merc — building someone new — clears this one.
 */

export interface Career {
    v: 1;
    /**
     * The merc's name, resolved. `CharacterSpec.name` is optional and a spec
     * without one rolls a fresh name on every rebuild — which would rename the
     * character between runs. This is the one on the record.
     */
    name: string;
    /** The spec the merc was built from, so a retire → rebuild opens where they left it. */
    spec: CharacterSpec;
    /** The persistent character between runs, snapshotted at the last safe moment. */
    merc: MemberSnap;
    /** Runs started with this merc (the one in progress counts). */
    runs: number;
    /** Deepest sector and waypoint count reached in any run. */
    bestSector: number;
    bestDepth: number;
    /** Lifetime kills, mirrored off the character so the boot screen needn't rebuild them. */
    kills: number;
    /** Where the last run ended — null while the first one is still running. */
    lastRun: { sector: number; depth: number } | null;
}

const KEY = "rainfall.career.v1";

export class CareerStore {

    /** The merc on file, or null if nobody has hit the street yet. */
    public static load(): Career | null {
        try {
            const raw = window.localStorage.getItem(KEY);
            if (!raw) { return null; }
            const c = JSON.parse(raw) as Career;
            if (c.v !== 1 || !c.spec || !c.merc) { return null; }
            return c;
        } catch {
            CareerStore.clear();      // a corrupt career is worse than no career
            return null;
        }
    }

    public static save(c: Career): void {
        try { window.localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* quota / private mode */ }
    }

    /** Retirement, or a brand-new merc: the record is gone. */
    public static clear(): void {
        try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
    }

    /** A fresh record for a merc who has never run — created at their first deploy. */
    public static start(spec: CharacterSpec, character: Actor): Career {
        return {
            v: 1, name: character.name, spec, merc: memberSnap(character),
            runs: 1, bestSector: 1, bestDepth: 0,
            kills: character.kills, lastRun: null,
        };
    }

    /**
     * Refresh the snapshot from the live character. Called at every checkpoint,
     * so levels and chrome earned mid-run survive a closed tab even though the
     * run itself may not.
     */
    public static sync(prev: Career, spec: CharacterSpec, character: Actor, run: RunState | null): Career {
        return {
            ...prev, name: character.name, spec, merc: memberSnap(character), kills: character.kills,
            bestSector: run ? Math.max(prev.bestSector, run.sector) : prev.bestSector,
            bestDepth: run ? Math.max(prev.bestDepth, run.depth) : prev.bestDepth,
        };
    }

    /** Another job starts: bump the counter, keep everything else. */
    public static countRun(prev: Career): Career {
        return {...prev, runs: prev.runs + 1};
    }

    /** A run ended on the pavement — record how far it got. */
    public static endRun(prev: Career, run: RunState | null): Career {
        if (!run) { return prev; }
        return {
            ...prev,
            bestSector: Math.max(prev.bestSector, run.sector),
            bestDepth: Math.max(prev.bestDepth, run.depth),
            lastRun: {sector: run.sector, depth: run.depth},
        };
    }

    /**
     * Rebuild the merc through the same constructor that made them, then stamp
     * the career state on top — the same discipline `SaveGame` uses, so no
     * behaviour-bearing instance ever travels through JSON.
     */
    public static restore(c: Career): Actor {
        const a = stamp(new Player(c.spec), c.merc);
        a.name = c.name;      // a spec with no name rolls a new one on every rebuild
        return a;
    }
}
