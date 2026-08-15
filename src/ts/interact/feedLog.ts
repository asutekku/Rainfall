import {Actor} from "../actors/Actor";
import {BattleEvent, MoveEvent, SaveEvent, ShotEvent} from "./battleEvents";

/**
 * The surveillance feed. Combat used to dump every engine message into the
 * log ("MISS!", one paragraph per hit) — unreadable at a glance. Each resolved
 * turn is now compressed into a single overwatch-style line, built from the
 * same structured events the 3D scene animates:
 *
 *   0:42 ◈ PORTE   into cover · fires at CANNOP — 10 dmg → 2hp
 *   0:47 ✦ ORLEBAR fires at PORTE — 12 dmg → 14hp
 *
 * Squad lines read bright (it's their bodycam), hostile lines dim, kills get
 * flagged. Non-combat lines (loot, scavenge, level-ups, map banners) pass
 * through as system entries.
 */

export interface FeedEntry {
    feed: "entry";                       // discriminator for the log renderer
    side: "squad" | "hostile" | "sys";
    kill: boolean;                       // highlight: someone went down on this line
    time: string | null;                 // mission clock, e.g. "1:07"
    name: string | null;                 // acting unit's callsign
    text: string;
}

const entry = (side: FeedEntry["side"], time: string | null, name: string | null,
               text: string, kill: boolean = false): FeedEntry =>
    ({feed: "entry", side, kill, time, name, text});

/** Streetwise callsign: the surname, uppercased ("Lawrence Porte" → "PORTE"). */
export function callsign(a: Actor): string {
    const parts = a.name.trim().split(/\s+/);
    return (parts[parts.length - 1] || a.name).toUpperCase();
}

/** mm:ss mission clock from a battle-start timestamp. */
export function missionClock(startedAt: number): string {
    const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export class FeedLog {

    /** One resolved turn → at most one surveillance line (plus a KIA line on a flatline). */
    public static fromTurn(events: BattleEvent[], time: string | null): FeedEntry[] {
        const turn = events.find((e) => e.kind === "turn");
        if (!turn || turn.kind !== "turn") { return []; }
        const side: FeedEntry["side"] = turn.side === "party" ? "squad" : "hostile";
        const name = callsign(turn.actor);
        const bits: string[] = [];
        let kill = false;

        const move = events.find((e) => e.kind === "move") as MoveEvent | undefined;
        if (move) {
            const dist = Math.round(Math.hypot(move.to.x - move.from.x, move.to.y - move.from.y));
            bits.push(move.cover ? `into cover (${dist}m)` : `moves ${dist}m`);
        }

        const shot = events.find((e) => e.kind === "shot") as ShotEvent | undefined;
        if (shot) {
            const verb = shot.melee ? "strikes" : shot.autofire ? "bursts at"
                : shot.aimed ? "headshots" : "fires at";
            const tgt = callsign(shot.target);
            if (!shot.hit) {
                bits.push(`${verb} ${tgt} — miss`);
            } else if (shot.damage <= 0) {
                bits.push(`${verb} ${tgt} — armor holds`);
            } else if (shot.dropped) {
                bits.push(`${verb} ${tgt} — ${shot.damage} dmg — ${tgt} DOWN`);
                kill = true;
            } else {
                bits.push(`${verb} ${tgt} — ${shot.damage} dmg → ${Math.max(0, shot.target.health)}hp`);
            }
        }

        if (events.some((e) => e.kind === "noshot")) { bits.push("no firing line"); }

        const save = events.find((e) => e.kind === "save") as SaveEvent | undefined;
        if (save) {
            bits.push(save.survived ? "clings to life" : "flatlines — KIA");
            if (!save.survived) { kill = true; }
        }

        if (!bits.length) { bits.push("holds position"); }
        return [entry(side, time, name, bits.join(" · "), kill)];
    }

    /** A system line (loot, banners, level-ups) in feed-entry form. */
    public static sys(text: string, time: string | null = null): FeedEntry {
        return entry("sys", time, null, text);
    }

    /**
     * Which legacy engine messages still deserve a line of their own. The
     * per-shot spam (MISS!, hit paragraphs, move verbs, death notices) is
     * covered by the turn summary; loot, scavenge and level lines are not.
     */
    public static keepLegacy(msgs: any[], time: string | null): FeedEntry[] {
        const out: FeedEntry[] = [];
        for (const m of msgs) {
            const text: string = m && typeof m.msg === "string" ? m.msg : "";
            if (!text) { continue; }   // CombatMessage / DeathMessage objects → summarised already
            if (/loots|scavenges|reaches level|kits up|suits up|equips|dons|¥|★/.test(text)) {
                out.push(FeedLog.sys(text, time));
            }
        }
        return out;
    }

    /** Round separator. */
    public static round(n: number): FeedEntry {
        return entry("sys", null, null, `— round ${n} —`);
    }
}
