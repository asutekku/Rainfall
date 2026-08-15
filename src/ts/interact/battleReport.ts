import {Actor} from "../actors/Actor";
import {Armor} from "../items/Armor";
import {Weapon} from "../items/Weapon";

/**
 * The after-action ledger. Combat and the Economy write to a single open
 * recorder while a fight is running; when the last hostile drops (or the squad
 * does) the recorder is sealed into a `BattleReport` that the debrief screen
 * renders — kills, accuracy, damage, payday and salvage.
 *
 * The recorder is a module singleton in the same spirit as `Combat.stats`: the
 * hooks are no-ops while no battle is open, so the headless sim and the legacy
 * endless mode keep working untouched.
 */

export type LootKind = "weapon" | "armor";

/** One scavenged piece sitting in a survivor's pack, offered on the debrief. */
export interface LootItem {
    id: string;
    kind: LootKind;
    name: string;
    detail: string;          // "3d6+2 AP" / "SP 11"
    value: number;           // avg damage (weapon) or stopping power (armour)
    rare: boolean;
    owner: Actor;            // who scavenged it (and whose pack it lives in)
    item: Weapon | Armor;    // the actual instance, for equipping from the screen
    /** Resolved on the debrief: equipped by the squad, fenced, or auto-kitted. */
    fate: "held" | "equipped" | "sold";
}

/** A loadout change made after the shooting stopped (salvage or a store buy). */
export interface GearChange {
    actorName: string;
    slot: "weapon" | "armor";
    source: "salvage" | "bought";
    from: string;
    to: string;
    detail: string;
    delta: number;           // improvement in avg damage / SP over what was worn
    cost: number;            // 0 for salvage
}

/** Per-squad-member performance over one engagement. */
export interface CombatantTally {
    name: string;
    role: string;
    level: number;
    levelsGained: number;
    xpGained: number;
    xp: number;
    maxXp: number;
    hpBefore: number;
    hpAfter: number;
    maxHp: number;
    down: boolean;
    shots: number;
    hits: number;
    damageDealt: number;
    damageTaken: number;
    kills: number;
}

/** A hostile that was on the field, for the "contacts neutralised" roster. */
export interface HostileEntry {
    name: string;
    label: string;
    level: number;
    rank: number;
    killed: boolean;
}

export interface BattleReport {
    outcome: "victory" | "defeat";
    nodeType: string;
    nodeLabel: string;
    rounds: number;
    hostiles: HostileEntry[];
    party: CombatantTally[];
    kills: number;
    eddies: number;
    /** Eddies raised by fencing salvage on the debrief itself. */
    fenced: number;
    xp: number;
    damageDealt: number;
    damageTaken: number;
    loot: LootItem[];
    gear: GearChange[];
    /** Hired mercs who went down: dead when the player moves on unless bought out. */
    casualties: Actor[];
    /** Set once the auto-kit pass has run, so it can't be spent twice. */
    kitted: boolean;
}

interface Snapshot {
    actor: Actor;
    hpBefore: number;
    levelBefore: number;
    killsBefore: number;
    shots: number;
    hits: number;
    damageDealt: number;
    damageTaken: number;
    xpGained: number;
}

interface OpenBattle {
    snaps: Snapshot[];
    hostiles: Actor[];
    nodeType: string;
    nodeLabel: string;
    rounds: number;
    eddies: number;
    loot: LootItem[];
    lootSeq: number;
}

const snapshot = (a: Actor): Snapshot => ({
    actor: a,
    hpBefore: a.health,
    levelBefore: a.level,
    killsBefore: a.kills,
    shots: 0, hits: 0, damageDealt: 0, damageTaken: 0, xpGained: 0,
});

export class BattleRecorder {

    private static open: OpenBattle | null = null;

    /** Open the ledger for a node's fight. Any previous unsealed one is dropped. */
    public static begin(party: Actor[], enemies: Actor[], nodeType: string, nodeLabel: string): void {
        this.open = {
            snaps: party.map(snapshot),
            hostiles: enemies.slice(),
            nodeType, nodeLabel,
            rounds: 0,
            eddies: 0,
            loot: [],
            lootSeq: 0,
        };
    }

    /** Drop the ledger without sealing it (leaving a fight by other means). */
    public static abort(): void {
        this.open = null;
    }

    public static get isOpen(): boolean {
        return this.open !== null;
    }

    public static countRound(): void {
        if (this.open) { this.open.rounds += 1; }
    }

    private static snapOf(actor: Actor): Snapshot | null {
        if (!this.open) { return null; }
        return this.open.snaps.find((s) => s.actor === actor) || null;
    }

    /** An attack was rolled by `actor` — tracked for squad accuracy. */
    public static countShot(actor: Actor, hit: boolean): void {
        const s = this.snapOf(actor);
        if (!s) { return; }
        s.shots += 1;
        if (hit) { s.hits += 1; }
    }

    /** Damage that actually landed, credited to the dealer and the receiver. */
    public static countDamage(actor: Actor, target: Actor, dealt: number): void {
        if (dealt <= 0) { return; }
        const from = this.snapOf(actor);
        if (from) { from.damageDealt += dealt; }
        const to = this.snapOf(target);
        if (to) { to.damageTaken += dealt; }
    }

    /** Eddies a kill paid into the crew purse (hostile takings aren't counted). */
    public static countEddies(killer: Actor, amount: number): void {
        if (this.open && this.snapOf(killer)) { this.open.eddies += Math.max(0, amount); }
    }

    /** XP awarded for a kill, recorded before a level-up can zero the counter. */
    public static countXp(actor: Actor, amount: number): void {
        const s = this.snapOf(actor);
        if (s) { s.xpGained += Math.max(0, amount); }
    }

    /** A piece of gear pulled off a body — offered for equipping on the debrief. */
    public static countSalvage(owner: Actor, item: Weapon | Armor, kind: LootKind,
                               detail: string, value: number, rare: boolean): void {
        if (!this.open || !this.snapOf(owner)) { return; }
        this.open.loot.push({
            id: "l" + (this.open.lootSeq++),
            kind, name: item.name, detail, value, rare,
            owner, item, fate: "held",
        });
    }

    /**
     * Seal the ledger. Every tally is a diff against the opening snapshot, so
     * kills / XP / eddies stay in sync with whatever Combat actually awarded.
     */
    public static finish(outcome: "victory" | "defeat"): BattleReport | null {
        const open = this.open;
        if (!open) { return null; }
        this.open = null;

        const party: CombatantTally[] = open.snaps.map((s) => {
            const a = s.actor;
            return {
                name: a.name, role: a.role ? a.role.name : "",
                level: a.level,
                levelsGained: a.level - s.levelBefore,
                xpGained: s.xpGained,
                xp: a.experience, maxXp: a.maxExperience,
                hpBefore: s.hpBefore, hpAfter: a.health, maxHp: a.maxHealth,
                down: !a.canFight(),
                shots: s.shots, hits: s.hits,
                damageDealt: s.damageDealt, damageTaken: s.damageTaken,
                kills: a.kills - s.killsBefore,
            };
        });

        const hostiles: HostileEntry[] = open.hostiles.map((e) => ({
            name: e.name,
            label: e.faction ? `${e.faction}${e.archetype ? " " + e.archetype : ""}` : (e.role ? e.role.name : ""),
            level: e.level, rank: e.rank || 1,
            killed: !e.canFight(),
        }));

        const sum = (pick: (t: CombatantTally) => number): number =>
            party.reduce((n, t) => n + pick(t), 0);

        return {
            outcome,
            nodeType: open.nodeType, nodeLabel: open.nodeLabel,
            rounds: open.rounds,
            hostiles, party,
            kills: sum((t) => t.kills),
            eddies: open.eddies,
            fenced: 0,
            xp: sum((t) => t.xpGained),
            damageDealt: sum((t) => t.damageDealt),
            damageTaken: sum((t) => t.damageTaken),
            loot: open.loot,
            gear: [],
            // Your character is never a casualty — Trauma Team always comes for them.
            casualties: open.snaps.filter((s) => !s.actor.canFight() && s.actor.hireable).map((s) => s.actor),
            kitted: false,
        };
    }
}
