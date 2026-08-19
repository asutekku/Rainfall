import {Actor} from "../actors/Actor";
import {Armor} from "../items/Armor";
import Equipment from "../items/Equipment";
import {Weapon} from "../items/Weapon";
import {BattleRecorder, GearChange} from "./battleReport";
import {Crew, Purse, Stash, crewSide} from "./crew";
import {Gear} from "./gear";
import {GetItem} from "./getItem";
import {randomJunk, randomMed} from "../items/consumables";

const WEAPONS: Weapon[] = Equipment.weapons;

/** One tier on the game's single armour ladder. */
export interface ArmorTier { name: string; sp: number; cost: number; }

/**
 * THE armour ladder. Auto-shopping climbs it, hire tiers reference it, and
 * upgrade offers quote it — one list, so a tier can't have two SPs or two
 * prices depending on which screen is asking. (The Black Market's shelf still
 * draws from the wearables catalog for variety; anything *synthesized* comes
 * from here.)
 */
export const ARMOR_LADDER: ArmorTier[] = [
    {name: "Leather", sp: 4, cost: 20},
    {name: "Kevlar", sp: 7, cost: 50},
    {name: "Light Armorjack", sp: 11, cost: 100},
    {name: "Medium Armorjack", sp: 12, cost: 500},
    {name: "Heavy Armorjack", sp: 13, cost: 1000},
    {name: "Flak", sp: 15, cost: 2500},
    {name: "MetalGear", sp: 18, cost: 6000},
];

/**
 * The gear economy: eddies from kills, spent on tier-appropriate upgrades.
 *
 * Auto-shopping stays *in the actor's weapon class* so a level's trained skill
 * carries over (a Handgun expert buys a bigger handgun, not a rifle), and is
 * gated by rarity/SP ceilings that rise with level so power tracks progression
 * rather than a lucky early windfall.
 */
export class Economy {

    /** Award a defeated foe's eddies — to the crew purse when a player killed it. */
    public static loot(killer: Actor, victim: Actor): number {
        // Fixer "Operator" / Fixer Shard chrome: every payout comes up bigger.
        const take = Math.max(5, Math.round(victim.currency * (1 + killer.eddieBonus())));
        const eddies = Purse.earn(killer, take);
        BattleRecorder.countEddies(killer, eddies);
        return eddies;
    }

    /**
     * Strip the fallen foe's gear. Higher-rank foes carry better kit and drop it
     * more often; loot lands in The Stash (auto-equip grabs the good stuff
     * between waves, or the player hands it out from the Gear tab).
     * Only the crew side scavenges — a dying enemy's take despawns with it.
     */
    public static scavenge(killer: Actor, victim: Actor): string[] {
        if (!crewSide(killer)) { return []; }           // enemies don't keep loot
        const msgs: string[] = [];
        const rank = victim.rank || 1;
        // Scavs strip a wreck to the frame — their finds come up more often.
        // Magpie Optics chrome tags salvage the same way, and they stack.
        const chance = 0.2 + 0.06 * rank + killer.scavengeBonus() + killer.chromeNum("scavBonus");
        if (victim.weapon && victim.weapon.name !== "Fists" && Math.random() < chance) {
            const w = victim.weapon.clone();
            Stash.of(killer).weapons.push(w);
            // Boss-tier hardware: armour-piercing, high availability, or off an elite foe.
            const rare = w.ap || w.rarity >= 4 || rank >= 4;
            BattleRecorder.countSalvage(killer, w, "weapon", this.weaponDetail(w), Gear.weaponValue(w), rare);
            msgs.push(rare
                ? `★ ${killer.name} scavenges a rare ${w.name}!`
                : `${killer.name} scavenges a ${w.name}.`);
        }
        const worn = victim.equipment.upper;
        if (worn && worn.stoppingPower > 0 && Math.random() < chance) {
            const a = new Armor("upper", worn.name, "", 1, worn.stoppingPower, worn.cost || 0, "");
            Stash.of(killer).armor.push(a);
            const rare = worn.stoppingPower >= 15 || rank >= 4;   // Flak / MetalGear tier
            BattleRecorder.countSalvage(killer, a, "armor", `SP ${a.stoppingPower}`, a.stoppingPower, rare);
            msgs.push(rare
                ? `★ ${killer.name} scavenges rare ${worn.name} (SP ${worn.stoppingPower})!`
                : `${killer.name} scavenges ${worn.name} (SP ${worn.stoppingPower}).`);
        }
        // A find goes in the crate, not onto the belt. Ordnance is drawn at
        // staging — two pieces per job, spent when thrown — and a mid-fight
        // top-up quietly broke that contract: you packed one frag, threw it,
        // and the crew had another one a body later. It is still a find, it
        // just gets packed for the *next* job like everything else.
        if (Math.random() < 0.08) {
            const crate = Crew.active;
            if (crate) { crate.kit.frag += 1; }
            msgs.push(`${killer.name} scavenges a frag grenade — into the crate.`);
        }
        // pocket loot: meds the crew can actually use, junk the fence will take
        if (Math.random() < 0.16) {
            const med = randomMed();
            Stash.of(killer).medical.push(med);
            msgs.push(`${killer.name} pockets a ${med.name}.`);
        } else if (Math.random() < 0.15) {
            const junk = randomJunk();
            Stash.of(killer).misc.push(junk);
            msgs.push(`${killer.name} pockets a ${junk.name} — fence fodder.`);
        }
        this.prune(killer);
        return msgs;
    }

    /** Human-readable damage line for a weapon: "3d6+2 AP". */
    public static weaponDetail(w: Weapon): string {
        return `${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}${w.ap ? " AP" : ""}${w.autofire ? " AUTO" : ""}`;
    }

    /** Best scavenged weapon worth equipping: same-class edge, or a big cross-class jump. */
    private static bestInventoryWeapon(actor: Actor): { w: Weapon; idx: number } | null {
        const curV = Gear.weaponValue(actor.weapon);
        const cls = actor.weapon.weaponClass;
        let best: Weapon | null = null; let bestV = 0; let idx = -1;
        Stash.of(actor).weapons.forEach((w, i) => {
            if (w.damageType !== "kinetic") { return; }
            const v = Gear.weaponValue(w);
            const threshold = w.weaponClass === cls ? curV * 1.05 : curV * 1.25;  // cross-class must be worth losing skill
            if (v > threshold && v > bestV) { bestV = v; best = w; idx = i; }
        });
        return best ? {w: best, idx} : null;
    }

    /** Best scavenged upper armour with higher SP than what's worn. */
    private static bestInventoryArmor(actor: Actor): { a: Armor; idx: number } | null {
        let bestSP = actor.equipment.upper ? actor.equipment.upper.stoppingPower : 0;
        let best: Armor | null = null; let idx = -1;
        Stash.of(actor).armor.forEach((a, i) => {
            if (a.stoppingPower > bestSP) { bestSP = a.stoppingPower; best = a; idx = i; }
        });
        return best ? {a: best, idx} : null;
    }

    /** Keep The Stash from ballooning over a long career — hold the best few.
     *  The caps are crew-wide (one shared stash), so they sit higher than the
     *  old per-pocket six. */
    private static prune(actor: Actor): void {
        const bag = Stash.of(actor);
        const w = bag.weapons;
        if (w.length > 10) { w.sort((a, b) => Gear.weaponValue(b) - Gear.weaponValue(a)); w.length = 10; }
        const a = bag.armor;
        if (a.length > 8) { a.sort((x, y) => y.stoppingPower - x.stoppingPower); a.length = 8; }
        const m = bag.medical;
        if (m.length > 8) { m.sort((x: any, y: any) => (y.cost || 0) - (x.cost || 0)); m.length = 8; }
        const j = bag.misc;
        if (j.length > 8) { j.sort((x: any, y: any) => (y.cost || 0) - (x.cost || 0)); j.length = 8; }
    }

    private static rarityCap(level: number): number { return Math.min(5, 2 + Math.floor(level / 2)); }
    /** The best armour SP a character of this level is allowed to field. */
    private static spCap(level: number): number {
        return level <= 2 ? 7 : level <= 4 ? 11 : level <= 6 ? 12 : level <= 8 ? 13 : level <= 11 ? 15 : 18;
    }

    /** Best affordable same-class weapon that beats the current one by a clear margin. */
    public static bestWeaponUpgrade(actor: Actor, budget: number = Infinity): Weapon | null {
        const cls = actor.weapon.weaponClass;
        const cap = this.rarityCap(actor.level);
        let best: Weapon | null = null;
        let bestV = Gear.weaponValue(actor.weapon) * 1.15;   // require > 15% better
        for (const w of WEAPONS) {
            if (w.weaponClass !== cls || w.damageType !== "kinetic") { continue; }
            if (w.rarity > cap || w.cost > budget || !Purse.canAfford(actor, w.cost)) { continue; }
            const v = Gear.weaponValue(w);
            if (v > bestV) { bestV = v; best = w; }
        }
        return best;
    }

    /**
     * Best affordable armour tier with higher SP (within the level SP ceiling).
     * Compared against the piece's *undamaged* rating: armour ablates as it takes
     * hits, and comparing against the ablated number made the crew re-buy the
     * same tier after every fight — a treadmill that swallowed each payday whole.
     */
    public static bestArmorUpgrade(actor: Actor, budget: number = Infinity): ArmorTier | null {
        const cap = this.spCap(actor.level);
        const worn = actor.equipment.upper;
        const curSP = worn ? Math.max(worn.stoppingPower, worn.maxStoppingPower) : 0;
        let best: ArmorTier | null = null;
        for (const t of ARMOR_LADDER) {
            if (t.sp <= curSP || t.sp > cap || t.cost > budget || !Purse.canAfford(actor, t.cost)) { continue; }
            if (!best || t.sp > best.sp) { best = t; }
        }
        return best;
    }

    /**
     * Equip the best available weapon + armour, preferring free scavenged gear
     * from inventory over buying. Returns the loadout changes it made (the
     * debrief renders them; the feed prints `describe()` of each).
     */
    public static autoEquip(actor: Actor, budget: number = Infinity): GearChange[] {
        const changes: GearChange[] = [];

        // Weapon: scavenged (free) beats a store buy of equal-or-lower value.
        const invW = this.bestInventoryWeapon(actor);
        const buyW = this.bestWeaponUpgrade(actor, budget);
        if (invW && (!buyW || Gear.weaponValue(invW.w) >= Gear.weaponValue(buyW))) {
            Stash.of(actor).weapons.splice(invW.idx, 1);
            changes.push(this.equipWeapon(actor, invW.w, "salvage", 0));
        } else if (buyW) {
            Purse.spend(actor, buyW.cost);
            changes.push(this.equipWeapon(actor, buyW.clone(), "bought", buyW.cost));
        }

        // Armour: scavenged SP (free) beats an affordable store tier of equal-or-lower SP.
        const invA = this.bestInventoryArmor(actor);
        const buyA = this.bestArmorUpgrade(actor, budget);
        if (invA && (!buyA || invA.a.stoppingPower >= buyA.sp)) {
            Stash.of(actor).armor.splice(invA.idx, 1);
            changes.push(this.equipArmor(actor, invA.a, "salvage", 0));
        } else if (buyA) {
            Purse.spend(actor, buyA.cost);
            changes.push(this.equipArmor(actor, Economy.mintArmor(buyA), "bought", buyA.cost));
        }
        return changes;
    }

    /** Put a weapon in an actor's hands (via Gear's one swap rule), reporting the change. */
    public static equipWeapon(actor: Actor, weapon: Weapon, source: "salvage" | "bought", cost: number): GearChange {
        const before = actor.weapon;
        const old = Gear.swapWeapon(actor, weapon);
        return {
            actorName: actor.name, slot: "weapon", source,
            from: old ? old.name : "—", to: weapon.name,
            detail: this.weaponDetail(weapon),
            delta: Math.round(Gear.weaponValue(weapon) - (before ? Gear.weaponValue(before) : 0)),
            cost,
        };
    }

    /** Strap armour on (via Gear's one swap rule), reporting the change. */
    public static equipArmor(actor: Actor, armor: Armor, source: "salvage" | "bought", cost: number): GearChange {
        const old = Gear.swapArmor(actor, armor);
        return {
            actorName: actor.name, slot: "armor", source,
            from: old ? old.name : "—", to: armor.name,
            detail: `SP ${armor.stoppingPower}`,
            delta: armor.stoppingPower - (old ? old.stoppingPower : 0),
            cost,
        };
    }

    /** The next rung up the armour ladder from a given SP (null at the top). */
    public static nextArmorTier(sp: number): ArmorTier | null {
        return ARMOR_LADDER.find((t) => t.sp > sp) || null;
    }

    /** A wearable instance of a ladder tier — the one way synthesized armour is minted. */
    public static mintArmor(tier: ArmorTier): Armor {
        return new Armor("upper", tier.name, "", 1, tier.sp, tier.cost, "");
    }

    /** A ladder tier by name, for tables that reference the ladder (hire tiers). */
    public static armorTier(name: string): ArmorTier {
        return ARMOR_LADDER.find((t) => t.name === name)!;
    }

    /**
     * The street rate: what a fence pays, as a fraction of sticker price.
     * One number for the whole game — the market fence starts here too and
     * only vendor archetypes / Operator contacts push it up.
     */
    public static readonly STREET_RATE = 0.4;

    /**
     * Field-fencing on the debrief: flat street rate, no questions. A market
     * fence can beat it (Scav Fence, Operator's cut) — selling at a fence is
     * meant to pay at least as well as selling on a curb, never worse.
     */
    public static sellValue(cost: number): number {
        return Math.max(5, Math.floor((cost || 0) * Economy.STREET_RATE));
    }

    /**
     * The sticker price after the best discount in the crew: a 6th Street
     * quartermaster's account or an Expense Chip, whichever runs deeper (they
     * don't stack). With neither, this IS the sticker price.
     */
    public static marketPrice(cost: number, party: Actor[]): number {
        const discount = party.reduce((m, p) => Math.max(m, p.canFight() ? p.marketDiscount() : 0), 0);
        return Math.ceil(cost * (1 - discount));
    }

    /**
     * What fraction of sticker price the fence pays: 40% street rate, and a
     * Street crew's "Operator" contacts make every payout 20% bigger (48%).
     */
    public static fenceRate(party: Actor[]): number {
        const cut = party.reduce((m, p) => Math.max(m, p.canFight() ? p.fixerCut() : 0), 0);
        return Economy.STREET_RATE * (1 + cut);
    }

    /** Patch worn armour back up to its rating — what a safehouse stop is for. */
    public static repairArmor(actor: Actor): void {
        [actor.equipment.upper, actor.equipment.headgear].forEach((a) => {
            if (a) { a.stoppingPower = a.maxStoppingPower; }
        });
        // Subdermal Mk.III knits its ablated plate back wherever armour gets patched.
        actor.cybernetics.forEach((c) => {
            if (c.effects.subdermalSelfRepair) {
                const spec = GetItem.cyberware(c.name);
                if (spec.effects.sp !== undefined) { c.effects.sp = spec.effects.sp; }
            }
        });
    }

    /**
     * Back to street basics: a sidearm and a jacket. Called when a run ends —
     * the character keeps everything they learned and none of what they carried.
     */
    public static stripToBasics(actor: Actor): void {
        actor.weapon = GetItem.weapon("WSA Autopistol");
        actor.equipment.upper = GetItem.armor("Light Armor Jacket");
        actor.equipment.headgear = GetItem.armor("Kevlar Helmet");
        // Pockets are not storage: Fists are a state and cyberweapons are
        // derived from the chrome list, so there is nothing to repossess and
        // nothing to regrow — the pockets just end empty.
        actor.inventory.weapons = [];
        actor.inventory.armor = [];
        actor.inventory.medical = [];
        actor.inventory.misc = [];
    }

    /** Feed line for a loadout change. */
    public static describe(c: GearChange): string {
        if (c.source === "salvage") {
            return c.slot === "weapon"
                ? `${c.actorName} equips a scavenged ${c.to}.`
                : `${c.actorName} dons scavenged ${c.to} (${c.detail}).`;
        }
        return c.slot === "weapon"
            ? `${c.actorName} kits up: ${c.to} (${c.detail}).`
            : `${c.actorName} suits up: ${c.to} (${c.detail}).`;
    }
}
