import {Actor} from "../actors/Actor";
import {Merc} from "../actors/Merc";
import {Player} from "../actors/player";
import {CharacterSpec} from "../actors/resources/CharacterCreation";
import {Armor} from "../items/Armor";
import {Medical, Scrap} from "../items/Scrap";
import {Chrome} from "./chrome";
import {Crew} from "./crew";
import {Economy} from "./economy";
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

interface MemberSnap {
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
    invWeapons: string[];
    invArmor: ArmorSnap[];
    invMeds: Array<{name: string; cost: number; restore: number; desc: string}>;
    invMisc: Array<{name: string; cost: number; desc: string}>;
    chrome: ChromeSnap[];
}

interface SaveData {
    v: 2;
    spec: CharacterSpec;
    members: MemberSnap[];
    funds: number;
    usedEvents: string[];
    run: RunState;                        // plain data throughout (node saved as null)
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

const memberSnap = (m: Actor): MemberSnap => ({
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
    invWeapons: m.inventory.weapons.map((w) => w.name),
    invArmor: m.inventory.armor.map((a) => armorSnap(a)!),
    invMeds: m.inventory.medical.map((x: any) => ({name: x.name, cost: x.cost || 0, restore: x.restorePoints || 0, desc: x.description || ""})),
    invMisc: m.inventory.misc.map((x: any) => ({name: x.name, cost: x.cost || 0, desc: x.description || ""})),
    chrome: m.cybernetics.map((c) => ({line: c.lineId, mk: c.mk})),
});

/** Stamp the mutable state from a snapshot onto a freshly constructed actor. */
const stamp = (a: Actor, s: MemberSnap): Actor => {
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
    a.weapon.equipped = true;
    a.equipment.upper = s.upper ? rebuildArmor(s.upper) : null;
    a.equipment.headgear = s.headgear ? rebuildArmor(s.headgear) : null;
    a.inventory.weapons = s.invWeapons.map((n) => { const w = GetItem.weapon(n); w.equipped = false; return w; });
    a.inventory.armor = s.invArmor.map(rebuildArmor);
    a.inventory.medical = s.invMeds.map((x) => new Medical(x.name, x.cost, x.restore, x.desc));
    a.inventory.misc = s.invMisc.map((x) => new Scrap(x.name, x.cost, x.desc));
    return a;
};

export class SaveGame {

    /** A resumable run exists (cheap check for the boot screen). */
    public static exists(): boolean {
        try { return !!window.localStorage.getItem(KEY); } catch { return false; }
    }

    /** Checkpoint the run. Call only from safe moments (standing on the map). */
    public static save(spec: CharacterSpec, party: Actor[], crew: Crew, run: RunState, usedEvents: string[]): void {
        try {
            const data: SaveData = {
                v: 2, spec,
                members: party.map(memberSnap),
                funds: crew.funds,
                usedEvents: usedEvents.slice(),
                run: {...run, node: null},
            };
            window.localStorage.setItem(KEY, JSON.stringify(data));
        } catch { /* quota or private mode — a missing save is not worth crashing over */ }
        // The character outlives the run: mirror them (and what the Cryptobank
        // would salvage from the pot right now) into the meta save.
        const you = party[0];
        if (you) { MetaSave.save(you, Math.floor(crew.funds * you.chromeNum("deathBank")), spec); }
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
            const crew = new Crew(data.funds).activate();
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

// ===========================================================================
// Meta save: the character, not the run. Written at every checkpoint and on
// death, cleared only by "start over with someone new" — so chrome, levels
// and the Humanity bill survive both the wipe and the browser closing.
// ===========================================================================

interface MetaData {
    v: 1;
    spec: CharacterSpec;
    name: string;
    level: number; experience: number; maxExperience: number;
    humanity: number; maxHumanity: number;
    maxLuck: number;
    reputation: number; kills: number;
    stats: any; skills: any;
    chrome: ChromeSnap[];
    /** Eddies the Cryptobank Cortex carries across the death (0 without it). */
    bank: number;
}

/** What the boot screen needs to pitch the continue button. */
export interface MetaSummary { name: string; level: number; augs: number; humanity: number; maxHumanity: number; }

const META_KEY = "rainfall.meta.v1";

export class MetaSave {

    public static exists(): boolean {
        try { return !!window.localStorage.getItem(META_KEY); } catch { return false; }
    }

    /** Mirror the character into the meta slot. Omitting `spec` keeps the stored one. */
    public static save(you: Actor, bank: number, spec?: CharacterSpec): void {
        try {
            const prior = MetaSave.read();
            const data: MetaData = {
                v: 1,
                spec: spec || (prior ? prior.spec : {}),
                name: you.name,
                level: you.level, experience: you.experience, maxExperience: you.maxExperience,
                humanity: you.humanity, maxHumanity: you.maxHumanity,
                maxLuck: you.maxLuck,
                reputation: you.reputation, kills: you.kills,
                stats: JSON.parse(JSON.stringify(you.stats)),
                skills: you.snapshotSkills(),
                chrome: you.cybernetics.map((c) => ({line: c.lineId, mk: c.mk})),
                bank: Math.max(0, Math.floor(bank)),
            };
            window.localStorage.setItem(META_KEY, JSON.stringify(data));
        } catch { /* ignore */ }
    }

    private static read(): MetaData | null {
        try {
            const raw = window.localStorage.getItem(META_KEY);
            if (!raw) { return null; }
            const data = JSON.parse(raw) as MetaData;
            return data.v === 1 ? data : null;
        } catch { return null; }
    }

    /** One line for the boot screen: who is waiting, and how chromed they are. */
    public static summary(): MetaSummary | null {
        const d = MetaSave.read();
        return d ? {name: d.name, level: d.level, augs: d.chrome.length,
            humanity: d.humanity, maxHumanity: d.maxHumanity} : null;
    }

    /**
     * Rebuild the veteran: a fresh Player from their spec with the earned state
     * stamped on top. Chrome lands by direct assignment — its Humanity was paid
     * long ago and the saved stats already carry every effect. Gear is street
     * basics plus whatever the chrome regrows. Returns the banked eddies too.
     */
    public static restore(): {character: Player; spec: CharacterSpec; bank: number} | null {
        const d = MetaSave.read();
        if (!d) { return null; }
        const you = new Player(d.spec);
        you.name = d.name;
        you.level = d.level; you.experience = d.experience; you.maxExperience = d.maxExperience;
        you.stats = d.stats;
        you.restoreSkills(d.skills);
        you.maxHumanity = d.maxHumanity;
        you.humanity = d.humanity;
        you.stats.emp = Math.floor(you.humanity / 10);
        you.stats.hm = you.humanity;
        you.cyberpsychosis = you.humanity <= 0;
        you.maxLuck = d.maxLuck;
        you.luck = d.maxLuck;
        you.reputation = d.reputation;
        you.kills = d.kills;
        you.cybernetics = d.chrome.map((c) => Chrome.build(c.line, c.mk))
            .filter((c): c is NonNullable<typeof c> => !!c);
        you.recalculateHealth();
        Economy.stripToBasics(you);
        you.grenades = 2;
        return {character: you, spec: d.spec, bank: d.bank};
    }

    /** "Start over with someone new" — the veteran is let go. */
    public static clear(): void {
        try { window.localStorage.removeItem(META_KEY); } catch { /* ignore */ }
    }
}
