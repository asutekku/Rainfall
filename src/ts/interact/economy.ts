import {Actor} from "../actors/Actor";
import {Armor} from "../items/Armor";
import Equipment from "../items/Equipment";
import {Weapon} from "../items/Weapon";

const WEAPONS: Weapon[] = Equipment.weapons;

// Clean RED armour ladder for shopping (the catalog has gaps; this is the SP tree).
const ARMOR_TIERS: Array<{ name: string; sp: number; cost: number }> = [
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

    /** Award a defeated foe's eddies to the killer. */
    public static loot(killer: Actor, victim: Actor): number {
        const eddies = Math.max(5, Math.floor(victim.currency));
        killer.currency += eddies;
        return eddies;
    }

    /**
     * Strip the fallen foe's gear. Higher-rank foes carry better kit and drop it
     * more often; loot lands in the killer's inventory (auto-equip grabs the good
     * stuff between waves, or a manual player equips it from the Inventory panel).
     * Only players scavenge — a dying enemy's take despawns with it.
     */
    public static scavenge(killer: Actor, victim: Actor): string[] {
        if (killer.faction) { return []; }              // enemies don't keep loot
        const msgs: string[] = [];
        const chance = 0.2 + 0.06 * (victim.rank || 1);
        if (victim.weapon && victim.weapon.name !== "Fists" && Math.random() < chance) {
            const w = victim.weapon.clone();
            w.equipped = false;
            killer.inventory.weapons.push(w);
            msgs.push(`${killer.name} scavenges a ${w.name}.`);
        }
        const worn = victim.equipment.upper;
        if (worn && worn.stoppingPower > 0 && Math.random() < chance) {
            killer.inventory.armor.push(new Armor("upper", worn.name, "", 1, worn.stoppingPower, worn.cost || 0, ""));
            msgs.push(`${killer.name} scavenges ${worn.name} (SP ${worn.stoppingPower}).`);
        }
        this.prune(killer);
        return msgs;
    }

    /** Best scavenged weapon worth equipping: same-class edge, or a big cross-class jump. */
    private static bestInventoryWeapon(actor: Actor): { w: Weapon; idx: number } | null {
        const curV = this.weaponValue(actor.weapon);
        const cls = actor.weapon.weaponClass;
        let best: Weapon | null = null; let bestV = 0; let idx = -1;
        actor.inventory.weapons.forEach((w, i) => {
            if (w.damageType !== "kinetic") { return; }
            const v = this.weaponValue(w);
            const threshold = w.weaponClass === cls ? curV * 1.05 : curV * 1.25;  // cross-class must be worth losing skill
            if (v > threshold && v > bestV) { bestV = v; best = w; idx = i; }
        });
        return best ? {w: best, idx} : null;
    }

    /** Best scavenged upper armour with higher SP than what's worn. */
    private static bestInventoryArmor(actor: Actor): { a: Armor; idx: number } | null {
        let bestSP = actor.equipment.upper ? actor.equipment.upper.stoppingPower : 0;
        let best: Armor | null = null; let idx = -1;
        actor.inventory.armor.forEach((a, i) => {
            if (a.stoppingPower > bestSP) { bestSP = a.stoppingPower; best = a; idx = i; }
        });
        return best ? {a: best, idx} : null;
    }

    /** Keep the inventory from ballooning over a long career — hold the best few. */
    private static prune(actor: Actor): void {
        const w = actor.inventory.weapons;
        if (w.length > 6) { w.sort((a, b) => this.weaponValue(b) - this.weaponValue(a)); w.length = 6; }
        const a = actor.inventory.armor;
        if (a.length > 6) { a.sort((x, y) => y.stoppingPower - x.stoppingPower); a.length = 6; }
    }

    /** Shopping value of a weapon: mean damage, with a bonus for armour-piercing. */
    public static weaponValue(w: Weapon): number {
        return w.averageDamage() + (w.ap ? 4 : 0);
    }

    private static rarityCap(level: number): number { return Math.min(5, 2 + Math.floor(level / 2)); }
    /** The best armour SP a character of this level is allowed to field. */
    private static spCap(level: number): number {
        return level <= 2 ? 7 : level <= 4 ? 11 : level <= 6 ? 12 : level <= 8 ? 13 : level <= 11 ? 15 : 18;
    }

    /** Best affordable same-class weapon that beats the current one by a clear margin. */
    public static bestWeaponUpgrade(actor: Actor): Weapon | null {
        const cls = actor.weapon.weaponClass;
        const cap = this.rarityCap(actor.level);
        let best: Weapon | null = null;
        let bestV = this.weaponValue(actor.weapon) * 1.15;   // require > 15% better
        for (const w of WEAPONS) {
            if (w.weaponClass !== cls || w.damageType !== "kinetic") { continue; }
            if (w.rarity > cap || w.cost > actor.currency) { continue; }
            const v = this.weaponValue(w);
            if (v > bestV) { bestV = v; best = w; }
        }
        return best;
    }

    /** Best affordable armour tier with higher SP (within the level SP ceiling). */
    public static bestArmorUpgrade(actor: Actor): { name: string; sp: number; cost: number } | null {
        const cap = this.spCap(actor.level);
        const curSP = actor.equipment.upper ? actor.equipment.upper.stoppingPower : 0;
        let best: { name: string; sp: number; cost: number } | null = null;
        for (const t of ARMOR_TIERS) {
            if (t.sp <= curSP || t.sp > cap || t.cost > actor.currency) { continue; }
            if (!best || t.sp > best.sp) { best = t; }
        }
        return best;
    }

    /**
     * Equip the best available weapon + armour, preferring free scavenged gear
     * from inventory over buying. Returns purchase/equip notes.
     */
    public static autoEquip(actor: Actor): string[] {
        const msgs: string[] = [];

        // Weapon: scavenged (free) beats a store buy of equal-or-lower value.
        const invW = this.bestInventoryWeapon(actor);
        const buyW = this.bestWeaponUpgrade(actor);
        if (invW && (!buyW || this.weaponValue(invW.w) >= this.weaponValue(buyW))) {
            actor.inventory.weapons.splice(invW.idx, 1);
            actor.weapon = invW.w;
            actor.weapon.equipped = true;
            msgs.push(`${actor.name} equips a scavenged ${actor.weapon.name}.`);
        } else if (buyW) {
            actor.currency -= buyW.cost;
            actor.weapon = buyW.clone();
            actor.weapon.equipped = true;
            msgs.push(`${actor.name} kits up: ${buyW.name} (${buyW.diceThrows}d6${buyW.damage ? "+" + buyW.damage : ""}).`);
        }

        // Armour: scavenged SP (free) beats an affordable store tier of equal-or-lower SP.
        const invA = this.bestInventoryArmor(actor);
        const buyA = this.bestArmorUpgrade(actor);
        if (invA && (!buyA || invA.a.stoppingPower >= buyA.sp)) {
            actor.inventory.armor.splice(invA.idx, 1);
            actor.equipment.upper = invA.a;
            msgs.push(`${actor.name} dons scavenged ${invA.a.name} (SP ${invA.a.stoppingPower}).`);
        } else if (buyA) {
            actor.currency -= buyA.cost;
            actor.equipment.upper = new Armor("upper", buyA.name, "", 1, buyA.sp, buyA.cost, "");
            msgs.push(`${actor.name} suits up: ${buyA.name} (SP ${buyA.sp}).`);
        }
        return msgs;
    }
}
