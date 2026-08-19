import {classFromLegacyRole} from "../actors/resources/classes";
import {Actor} from "../actors/Actor";
import {Merc} from "../actors/Merc";
import {Player} from "../actors/player";
import {CharacterSpec} from "../actors/resources/CharacterCreation";
import {Armor} from "../items/Armor";
import {Medical, Scrap} from "../items/Scrap";
import {Chrome} from "./chrome";
import {Crew, StashBag, emptyStash} from "./crew";
import {Kit, reviveKit} from "./loadout";
import {GetItem} from "./getItem";
import type {MercOffer} from "./mercMarket";
import type {RunState} from "./runMap";

/**
 * Run persistence. A run is checkpointed to localStorage whenever the squad
 * stands on the map (never mid-fight or mid-overlay), and the boot screen
 * offers to continue it. Death deletes the save — a lost run stays lost.
 *
 * The snapshot is rebuilt through the same constructors that made the
 * originals (Player from its spec, Merc from its retained market offer),
 * then the mutated state is stamped on top — so behaviour-bearing class
 * instances never travel through JSON, only plain data does.
 */

interface ArmorSnap { part: string; name: string; sp: number; maxSp: number; cost: number; }

/** Chrome travels as line + mark — the catalog rebuilds the instance. */
interface ChromeSnap { line: string; mk: number; }

export interface MemberSnap {
    kind: "player" | "merc";
    offer: MercOffer | null;              // mercs only
    level: number; experience: number; maxExperience: number;
    health: number; maxHealth: number;
    luck: number; maxLuck: number;
    humanity: number; maxHumanity: number;
    reputation: number; kills: number; grenades: number;
    temperament: string; auto: boolean;
    mortallyWounded: boolean; cyberpsychosis: boolean;
    stats: any; skills: any;
    weapon: string;
    upper: ArmorSnap | null; headgear: ArmorSnap | null;
    /**
     * Per-member packs, written by checkpoints from before The Stash. Current
     * saves don't write them — all spare gear lives in the one shared stash —
     * but old ones are still read, and whatever they carried is swept into The
     * Stash on load (see `sweepPacksIntoStash`).
     */
    invWeapons?: string[];
    invArmor?: ArmorSnap[];
    invMeds?: Array<{name: string; cost: number; restore: number; desc: string}>;
    invMisc?: Array<{name: string; cost: number; desc: string}>;
    chrome: ChromeSnap[];
}

interface StashSnap {
    weapons: string[];
    armor: ArmorSnap[];
    meds: Array<{name: string; cost: number; restore: number; desc: string}>;
    misc: Array<{name: string; cost: number; desc: string}>;
}

interface SaveData {
    v: 2;
    spec: CharacterSpec;
    members: MemberSnap[];
    funds: number;
    kit?: Kit;                            // absent in checkpoints written before the crate
    stash?: StashSnap;                    // absent in checkpoints written before the crew duffel
    usedEvents: string[];
    run: RunState;                        // plain data throughout (node saved as null)
    savedAt?: number;                     // wall clock, for "12 min ago" on the boot screen
}

/**
 * What the boot screen needs to describe the checkpoint without rebuilding a
 * single actor: who's out there, how far they got, what they're carrying.
 * Every field is derived from the payload, so saves written before this
 * existed still describe themselves.
 */
export interface SaveHeader {
    name: string;
    role: string;
    level: number;
    sector: number;
    depth: number;
    funds: number;
    squad: number;
    savedAt: number;                      // 0 when the save predates the stamp
}

export interface RestoredGame {
    character: Actor;
    party: Actor[];
    crew: Crew;
    run: RunState;
    usedEvents: string[];
    spec: CharacterSpec;
}

const KEY = "rainfall.run.v1";

const armorSnap = (a: Armor | null): ArmorSnap | null => a ? {
    part: a.bodyPart, name: a.name, sp: a.stoppingPower, maxSp: a.maxStoppingPower, cost: a.cost || 0,
} : null;

const rebuildArmor = (s: ArmorSnap): Armor => {
    const a = new Armor(s.part, s.name, "", 1, s.maxSp, s.cost, "");
    a.stoppingPower = s.sp;
    a.maxStoppingPower = s.maxSp;
    return a;
};

const stashSnap = (bag: StashBag): StashSnap => ({
    weapons: bag.weapons.map((w) => w.name),
    armor: bag.armor.map((a) => armorSnap(a)!),
    meds: bag.medical.map((x: any) => ({name: x.name, cost: x.cost || 0, restore: x.restorePoints || 0, desc: x.description || ""})),
    misc: bag.misc.map((x: any) => ({name: x.name, cost: x.cost || 0, desc: x.description || ""})),
});

const rebuildStash = (snap: StashSnap): StashBag => ({
    weapons: snap.weapons.map((n) => GetItem.weapon(n)),
    armor: snap.armor.map(rebuildArmor),
    medical: snap.meds.map((x) => new Medical(x.name, x.cost, x.restore, x.desc)),
    misc: snap.misc.map((x) => new Scrap(x.name, x.cost, x.desc)),
});

/**
 * There is one storage: The Stash. Older checkpoints wrote per-member packs
 * (and, for a while, kept Fists copies and cyberweapon copies in them), so
 * every load ends with a sweep: anything real a pocket still holds moves into
 * The Stash, and the two non-items are simply dropped — Fists are a state and
 * cyberweapons are derived from the chrome list, so a stored copy of either
 * is a duplicate. Pockets always come out of this empty.
 */
const sweepPacksIntoStash = (party: Actor[], stash: StashBag): void => {
    party.forEach((a) => {
        stash.weapons.push(...a.inventory.weapons.filter((w) =>
            w.name !== "Fists" && !a.cybernetics.some((c) => c.effects.grantsWeapon === w.name)));
        stash.armor.push(...(a.inventory.armor as any));
        stash.medical.push(...a.inventory.medical);
        stash.misc.push(...a.inventory.misc);
        a.inventory.weapons = [];
        a.inventory.armor = [];
        a.inventory.medical = [];
        a.inventory.misc = [];
    });
};

export const memberSnap = (m: Actor): MemberSnap => ({
    kind: m instanceof Merc ? "merc" : "player",
    offer: m instanceof Merc ? m.offer : null,
    level: m.level, experience: m.experience, maxExperience: m.maxExperience,
    health: m.health, maxHealth: m.maxHealth,
    luck: m.luck, maxLuck: m.maxLuck,
    humanity: m.humanity, maxHumanity: m.maxHumanity,
    reputation: m.reputation, kills: m.kills, grenades: m.grenades,
    temperament: m.temperament, auto: m.auto,
    mortallyWounded: m.mortallyWounded, cyberpsychosis: m.cyberpsychosis,
    stats: JSON.parse(JSON.stringify(m.stats)),
    skills: m.snapshotSkills(),
    weapon: m.weapon.name,
    upper: armorSnap(m.equipment.upper as Armor | null),
    headgear: armorSnap(m.equipment.headgear as Armor | null),
    // no inv* fields: spare gear lives in The Stash, snapped once per save
    chrome: m.cybernetics.map((c) => ({line: c.lineId, mk: c.mk})),
});

/** Stamp the mutable state from a snapshot onto a freshly constructed actor. */
export const stamp = (a: Actor, s: MemberSnap): Actor => {
    a.level = s.level; a.experience = s.experience; a.maxExperience = s.maxExperience;
    a.maxHealth = s.maxHealth; a.health = s.health;
    a.maxLuck = s.maxLuck; a.luck = s.luck;
    a.maxHumanity = s.maxHumanity; a.humanity = s.humanity;
    a.reputation = s.reputation; a.kills = s.kills; a.grenades = s.grenades;
    a.temperament = s.temperament; a.auto = s.auto;
    a.mortallyWounded = s.mortallyWounded; a.cyberpsychosis = s.cyberpsychosis;
    a.stats = s.stats;
    a.restoreSkills(s.skills);
    // chrome first: passives (cyberSP, initiative) read the list live, and the
    // direct assignment avoids re-charging Humanity for an install already paid
    a.cybernetics = s.chrome.map((c) => Chrome.build(c.line, c.mk)).filter((c): c is NonNullable<typeof c> => !!c);
    a.weapon = GetItem.weapon(s.weapon);
    a.equipment.upper = s.upper ? rebuildArmor(s.upper) : null;
    a.equipment.headgear = s.headgear ? rebuildArmor(s.headgear) : null;
    // legacy per-member packs land in the pockets here, and the load sweeps
    // them into The Stash right after — pockets never survive a load
    a.inventory.weapons = (s.invWeapons || []).map((n) => GetItem.weapon(n));
    a.inventory.armor = (s.invArmor || []).map(rebuildArmor);
    a.inventory.medical = (s.invMeds || []).map((x) => new Medical(x.name, x.cost, x.restore, x.desc));
    a.inventory.misc = (s.invMisc || []).map((x) => new Scrap(x.name, x.cost, x.desc));
    return a;
};

export class SaveGame {

    /** A resumable run exists (cheap check for the boot screen). */
    public static exists(): boolean {
        try { return !!window.localStorage.getItem(KEY); } catch { return false; }
    }

    /**
     * Describe the checkpoint without rebuilding it. The boot screen asks the
     * player to choose between continuing and starting over, and it can only
     * ask that fairly if it can say what continuing would resume.
     */
    public static peek(): SaveHeader | null {
        try {
            const raw = window.localStorage.getItem(KEY);
            if (!raw) { return null; }
            const data = JSON.parse(raw) as SaveData;
            if (data.v !== 2 || !data.members || !data.members.length || !data.run) { return null; }
            const you = data.members[0]!;
            return {
                name: data.spec.name || "Unnamed",
                // An old save names a CP:RED role; the class table maps it forward.
                role: classFromLegacyRole(data.spec.role),
                level: you.level,
                sector: data.run.sector,
                depth: data.run.depth,
                funds: data.funds,
                squad: data.members.length,
                savedAt: data.savedAt || 0,
            };
        } catch { return null; }
    }

    /** Checkpoint the run. Call only from safe moments (standing on the map). */
    public static save(spec: CharacterSpec, party: Actor[], crew: Crew, run: RunState, usedEvents: string[]): void {
        try {
            const data: SaveData = {
                v: 2, spec,
                members: party.map(memberSnap),
                funds: crew.funds,
                kit: crew.kit,
                stash: stashSnap(crew.stash),
                usedEvents: usedEvents.slice(),
                run: {...run, node: null},
                savedAt: Date.now(),
            };
            window.localStorage.setItem(KEY, JSON.stringify(data));
        } catch { /* quota or private mode — a missing save is not worth crashing over */ }
    }

    /** Rebuild the whole game from the checkpoint; null if absent or unreadable. */
    public static load(): RestoredGame | null {
        try {
            const raw = window.localStorage.getItem(KEY);
            if (!raw) { return null; }
            const data = JSON.parse(raw) as SaveData;
            if (data.v !== 2 || !data.members.length || !data.run) { return null; }
            const party = data.members.map((s) =>
                stamp(s.kind === "merc" && s.offer ? new Merc(s.offer) : new Player(data.spec), s));
            const stash = data.stash ? rebuildStash(data.stash) : emptyStash();
            const crew = new Crew(data.funds, reviveKit(data.kit), stash).activate();
            sweepPacksIntoStash(party, stash);
            const run: RunState = {...data.run, node: null, outcome: "active"};
            return {character: party[0]!, party, crew, run, usedEvents: data.usedEvents || [], spec: data.spec};
        } catch {
            SaveGame.clear();     // a corrupt save is worse than no save
            return null;
        }
    }

    /** Death, or a new character: the run is gone. */
    public static clear(): void {
        try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
    }
}

