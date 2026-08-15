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

    /** Spend eddies on the best affordable weapon + armour upgrades. Returns purchase notes. */
    public static autoEquip(actor: Actor): string[] {
        const msgs: string[] = [];
        const w = this.bestWeaponUpgrade(actor);
        if (w) {
            actor.currency -= w.cost;
            actor.weapon = w.clone();
            actor.weapon.equipped = true;
            msgs.push(`${actor.name} kits up: ${w.name} (${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}).`);
        }
        const a = this.bestArmorUpgrade(actor);
        if (a) {
            actor.currency -= a.cost;
            actor.equipment.upper = new Armor("upper", a.name, "", 1, a.sp, a.cost, "");
            msgs.push(`${actor.name} suits up: ${a.name} (SP ${a.sp}).`);
        }
        return msgs;
    }
}
