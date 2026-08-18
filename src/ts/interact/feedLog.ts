// Type-only: the feed reads actors, it never constructs one, so it has no
// business adding an edge to the Actor ⇄ GetItem ⇄ Player import cycle.
import type {Actor} from "../actors/Actor";
import {AbilityEvent, BattleEvent, BleedEvent, BlastEvent, CoverGoneEvent, CritEvent, HackEvent,
    MarkEvent, MoveEvent, SaveEvent, ShotEvent, SkipEvent, StabilizeEvent,
    SuppressEvent} from "./battleEvents";

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

export type Signer = (a: Actor) => string;

/**
 * Callsigns for everyone on the street, made unique.
 *
 * Surnames collide — a run turns up two BLACKALLs often enough, one on each
 * side — and the first cut only compared the target against the acting unit.
 * That fixed the target and left the *actor* alone, so a line came out reading
 * "BLACKALL fires at P. BLACKALL": the shooter and the shot look like the same
 * person, and no glyph or colour rescues a sentence that says that. A name is
 * either distinguished from everybody or it is not distinguished at all.
 */
export function signer(cast: Actor[]): Signer {
    const seen: { [sign: string]: number } = {};
    for (const a of cast) {
        const sign = callsign(a);
        seen[sign] = (seen[sign] || 0) + 1;
    }
    return (a: Actor) => {
        const sign = callsign(a);
        if ((seen[sign] || 0) < 2) { return sign; }
        const first = a.name.trim()[0];
        return first ? `${first.toUpperCase()}. ${sign}` : sign;
    };
}

/** mm:ss mission clock from a battle-start timestamp. */
export function missionClock(startedAt: number): string {
    const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * What a shot sounds like, from how well it connected.
 *
 * The verb used to be keyed on `aimed`, which the AI sets on seven shots in
 * ten — so "headshots" was the ordinary word for a shot and carried no
 * information, and an aimed graze printed as "headshots MARGOULIS — 3 dmg",
 * which reads as a bug rather than as a bullet that skidded off a plate. Keyed
 * on the quality band instead, each verb means one thing: a crit is the 19% of
 * shots that found something soft, a graze is the 25% that did not.
 */
function shotVerb(shot: ShotEvent): string {
    if (shot.melee) { return shot.quality === "crit" ? "cuts into" : shot.quality === "graze" ? "clips" : "strikes"; }
    if (shot.quality === "crit") { return "headshots"; }
    if (shot.quality === "graze") { return "grazes"; }
    return shot.autofire ? "bursts at" : "fires at";
}

export class FeedLog {

    /** One resolved turn → at most one surveillance line (plus a KIA line on a flatline). */
    public static fromTurn(events: BattleEvent[], time: string | null, cast: Actor[] = []): FeedEntry[] {
        const turn = events.find((e) => e.kind === "turn");
        if (!turn || turn.kind !== "turn") { return []; }
        const side: FeedEntry["side"] = turn.side === "party" ? "squad" : "hostile";
        const sign = signer(cast.length ? cast : [turn.actor]);
        const name = sign(turn.actor);
        const bits: string[] = [];
        let kill = false;

        const move = events.find((e) => e.kind === "move") as MoveEvent | undefined;
        if (move) {
            const dist = Math.round(Math.hypot(move.to.x - move.from.x, move.to.y - move.from.y));
            bits.push(move.sprint ? `sprints ${dist}m`
                : move.cover ? `moves ${dist}m into cover` : `moves ${dist}m`);
        }

        const mark = events.find((e) => e.kind === "mark") as MarkEvent | undefined;
        if (mark) {
            bits.push(`paints ${sign(mark.target)} with a laser`);
        }

        // The damage-over-time tick opens every turn it is on, and used to open
        // every *line* with it: a fight after one frag read as six consecutive
        // "X bleeds — 2 dmg · ..." lines with the thing the unit actually did
        // pushed off to the right. It is the smallest fact on the line, so it
        // goes last — unless it is the whole turn, which is when it kills.
        const bleed = events.find((e) => e.kind === "bleed") as BleedEvent | undefined;
        if (bleed && bleed.dropped) {
            bits.push(`bleeds out — ${bleed.damage} dmg — DOWN`);
            kill = true;
        }

        const skip = events.find((e) => e.kind === "skip") as SkipEvent | undefined;
        if (skip) { bits.push(skip.reason === "stunned" ? "reels — stunned" : "pinned down"); }

        if (events.some((e) => e.kind === "reload")) { bits.push("reloads"); }

        const supp = events.find((e) => e.kind === "suppress") as SuppressEvent | undefined;
        if (supp) {
            const tgt = sign(supp.target);
            bits.push(supp.pinned ? `hoses ${tgt} — PINNED` : `hoses ${tgt} — no effect`);
        }

        const stab = events.find((e) => e.kind === "stabilize") as StabilizeEvent | undefined;
        if (stab) {
            const tgt = sign(stab.target);
            bits.push(stab.saved ? `drags ${tgt} back from the brink` : `patches ${tgt} up`);
        }

        const hack = events.find((e) => e.kind === "hack") as HackEvent | undefined;
        if (hack) {
            const tgt = sign(hack.target);
            bits.push(`shorts ${tgt}'s chrome — ${hack.damage} dmg${hack.stunned ? " · LOCKED" : ""}`
                + (hack.dropped ? ` — ${tgt} DOWN` : ""));
            if (hack.dropped) { kill = true; }
        }

        const ability = events.find((e) => e.kind === "ability") as AbilityEvent | undefined;
        if (ability) { bits.push(ability.name === "leap" ? "LEAPS — the street cracks" : "opens up — sustained fire"); }

        if (events.some((e) => e.kind === "rout")) { bits.push("breaks and runs"); }

        // volleys can fire twice in one turn — every shot gets its clause
        const shots = events.filter((e) => e.kind === "shot") as ShotEvent[];
        for (const shot of shots) {
            const verb = shotVerb(shot);
            const tgt = sign(shot.target);
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

        const blasts = events.filter((e) => e.kind === "blast") as BlastEvent[];
        for (const blast of blasts) {
            const label = blast.gtype === "frag" ? "lobs a frag"
                : blast.gtype === "smoke" ? "pops smoke"
                : blast.gtype === "flash" ? "lobs a flashbang"
                : blast.gtype === "emp" ? "lobs an EMP"
                : blast.gtype === "car" ? "the car goes up"
                : "SLAMS down";
            const belt = blast.left < 0 ? ""
                : blast.left === 0 ? " · last one" : ` · ${blast.left} left`;
            if (blast.gtype === "smoke") {
                bits.push(label + belt);
            } else if (!blast.victims.length) {
                bits.push(`${label} — nobody caught${belt}`);
            } else {
                const roll = blast.victims.map((v) => {
                    const t = sign(v.target);
                    if (blast.gtype === "flash") { return `${t}${v.stunned ? " STUNNED" : " shrugs it off"}`; }
                    return `${t} ${v.damage} dmg${v.stunned ? " STUNNED" : ""}${v.dropped ? " DOWN" : ""}`;
                }).join(", ");
                bits.push(`${label} — ${roll}${belt}`);
                if (blast.victims.some((v) => v.dropped)) { kill = true; }
            }
        }

        const wrecked = events.filter((e) => e.kind === "coverGone") as CoverGoneEvent[];
        if (wrecked.length) {
            bits.push(wrecked.some((w) => w.exploded) ? "cover destroyed — car detonates"
                : `cover destroyed (${wrecked.map((w) => w.ckind).join(", ")})`);
        }

        // lasting injuries inflicted this turn, tagged onto the attacker's line
        const crits = events.filter((e) => e.kind === "crit") as CritEvent[];
        for (const crit of crits) {
            const who = sign(crit.actor);
            bits.push(crit.effect === "bleeding" ? `${who} left bleeding`
                : crit.effect === "crippled" ? `${who}'s leg torn up` : `${who} knocked senseless`);
        }

        if (events.some((e) => e.kind === "noshot")) { bits.push("no firing line"); }

        const save = events.find((e) => e.kind === "save") as SaveEvent | undefined;
        if (save) {
            bits.push(save.survived ? "clings to life" : "flatlines — KIA");
            if (!save.survived) { kill = true; }
        }

        if (bleed && !bleed.dropped) { bits.push(`bleeding −${bleed.damage}`); }

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
    public static keepLegacy(msgs: any[], time: string | null, cast: Actor[] = []): FeedEntry[] {
        const out: FeedEntry[] = [];
        for (const m of msgs) {
            const text: string = m && typeof m.msg === "string" ? m.msg : "";
            if (!text) { continue; }   // CombatMessage / DeathMessage objects → summarised already
            if (/loots|scavenges|reaches level|kits up|suits up|equips|dons|¥|★/.test(text)) {
                out.push(FeedLog.sys(FeedLog.signed(text, cast), time));
            }
        }
        return out;
    }

    /**
     * Engine messages address people by their full name; the surveillance lines
     * above them use callsigns. Adjacent in the feed that read as two people —
     * "MAYPOLE fires at GENTZSCH" sat directly above "Ricardo Maypole reaches
     * level 4". One voice: whoever is on the street goes by their callsign here
     * too. The debrief and the inventory keep the full name, which is where a
     * full name is worth having.
     */
    public static signed(text: string, cast: Actor[]): string {
        const sign = signer(cast);
        let out = text;
        for (const a of cast) {
            if (!a.name || out.indexOf(a.name) < 0) { continue; }
            out = out.split(a.name).join(sign(a));
        }
        return out;
    }

    /** Round separator (holdout fights show how much longer to survive). */
    public static round(n: number, holdLeft: number = -1): FeedEntry {
        // "hold 1 more" was the last thing in the feed before the fight ended,
        // because the clock is beaten at the top of the round *after* the one
        // it was printed on and no separator ever followed. It read as ending a
        // round early. It is the last round, so it says the last round.
        const clock = holdLeft === 1 ? "last round" : `hold ${holdLeft} more`;
        return entry("sys", null, null, holdLeft >= 0 ? `— round ${n} — ${clock} —` : `— round ${n} —`);
    }

    /** Battle-open contact report: who the squad just walked into. */
    public static contact(enemies: Actor[]): FeedEntry {
        const live = enemies.filter((e) => e.canFight());
        const boss = live.find((e) => (e.rank || 0) >= 5);
        const faction = (live[0] && live[0].faction ? live[0].faction : "hostile").toUpperCase();
        const text = boss
            ? `⚠ CONTACT — ${faction}: ${callsign(boss)} [${boss.archetype || "boss"}] +${live.length - 1} escort`
            : `⚠ CONTACT — ${faction} × ${live.length}`;
        return entry("sys", null, null, text);
    }
}
