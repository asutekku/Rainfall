import {Actor} from "../actors/Actor";
import {AugLine, AugTier, Cyberware, INSTALL_HL, upgradeHL} from "../items/Cyberware";
import AUG_LINES from "../../objects/cyberware";
import {GetItem} from "./getItem";
import {applyStatus} from "./statuses";

/** One thing a ripperdoc / boss can put in front of the player. */
export interface AugOffer {
    line: AugLine;
    mk: number;            // 1 for a fresh install, 2-3 for an upgrade of an owned line
    isUpgrade: boolean;
    cost: number;          // eddies (before any market discount)
    hl: number;            // Humanity the surgery costs
}

/**
 * The chrome service: the one place that knows how augs are installed,
 * upgraded, offered and armed for combat. Augs live on the PLAYER — mercs are
 * rented, chrome is forever — and every rule here leans on that: a line is
 * held at most once, upgrading swaps the mark in place, and the Humanity bill
 * (install at full tier price, upgrades at a third) never refunds itself.
 */
export class Chrome {

    public static all(): AugLine[] { return AUG_LINES; }

    public static line(id: string): AugLine | null {
        return AUG_LINES.find((l) => l.id === id) || null;
    }

    /** The installed instance of a line, if the actor holds it. */
    public static owned(actor: Actor, lineId: string): Cyberware | null {
        return actor.cybernetics.find((c) => c.lineId === lineId) || null;
    }

    /** Build an instance at a mark without touching anyone's Humanity (restores). */
    public static build(lineId: string, mk: number): Cyberware | null {
        const line = Chrome.line(lineId);
        return line ? new Cyberware(line, mk) : null;
    }

    /** Cyberpsychosis locks the chair: no Humanity left means no more chrome. */
    public static canInstall(actor: Actor): boolean {
        return actor.humanity > 0 && !actor.cyberpsychosis;
    }

    /** Eddie price to upgrade to a line's given mark (cheaper than installing fresh). */
    public static upgradeCost(line: AugLine, toMk: number): number {
        const mark = line.marks[Math.max(0, Math.min(2, toMk - 1))]!;
        return Math.max(10, Math.round((mark.cost * 0.6) / 10) * 10);
    }

    public static installHL(line: AugLine): number { return INSTALL_HL[line.tier]; }
    public static upgradeHL(line: AugLine): number { return upgradeHL(line.tier); }

    /**
     * Install a line at Mk.I, paying its Humanity. Returns the instance, or
     * null if the line is already held / the wearer is past the point where a
     * ripperdoc will operate. `extraHL` is the back-alley surcharge.
     */
    public static install(actor: Actor, lineId: string, extraHL: number = 0): Cyberware | null {
        const line = Chrome.line(lineId);
        if (!line || Chrome.owned(actor, lineId) || !Chrome.canInstall(actor)) { return null; }
        const cw = new Cyberware(line, 1);
        cw.humanityLoss += extraHL;
        actor.installCyberware(cw);
        return cw;
    }

    /**
     * Upgrade an owned line one mark: swap the instance in place, pay the
     * upgrade Humanity, and re-apply only what changed between the marks.
     */
    public static upgrade(actor: Actor, lineId: string, extraHL: number = 0): Cyberware | null {
        const line = Chrome.line(lineId);
        const cur = line ? Chrome.owned(actor, lineId) : null;
        if (!line || !cur || cur.mk >= 3 || !Chrome.canInstall(actor)) { return null; }
        const next = new Cyberware(line, cur.mk + 1);
        next.humanityLoss = cur.humanityLoss + Chrome.upgradeHL(line) + extraHL;
        actor.cybernetics[actor.cybernetics.indexOf(cur)] = next;
        actor.shiftHumanity(-(Chrome.upgradeHL(line) + extraHL));
        // stat-bearing effects apply as a delta so the upgrade doesn't double-pay
        const dBody = (next.effects.body || 0) - (cur.effects.body || 0);
        if (dBody) { actor.stats.bt += dBody; actor.recalculateHealth(); }
        const dLuck = (next.effects.luckMax || 0) - (cur.effects.luckMax || 0);
        if (dLuck) { actor.maxLuck += dLuck; actor.luck = Math.min(actor.maxLuck, actor.luck + Math.max(0, dLuck)); }
        // cyberweapons live on the chrome list, not in a bag — the only thing
        // to fix up is a blade that is in the wielder's hand right now
        if (cur.effects.grantsWeapon && cur.effects.grantsWeapon !== next.effects.grantsWeapon
            && actor.weapon.name === cur.effects.grantsWeapon) {
            actor.weapon = GetItem.weapon(next.effects.grantsWeapon || "Fists");
        }
        return next;
    }

    /**
     * Rip the most recent piece back out (back-alley extraction): reverse its
     * stat effects, take its cyberweapon, refund the Humanity paid plus a
     * little peace of mind. Returns the removed piece.
     */
    public static extract(actor: Actor, bonusHumanity: number = 4): Cyberware | null {
        const cw = actor.cybernetics[actor.cybernetics.length - 1];
        if (!cw) { return null; }
        actor.cybernetics.pop();
        if (cw.effects.body) { actor.stats.bt -= cw.effects.body; actor.recalculateHealth(); }
        if (cw.effects.luckMax) {
            actor.maxLuck = Math.max(1, actor.maxLuck - cw.effects.luckMax);
            actor.luck = Math.min(actor.luck, actor.maxLuck);
        }
        if (cw.effects.grantsWeapon && actor.weapon.name === cw.effects.grantsWeapon) {
            // the blade left with the chrome — nothing to take out of a bag
            actor.weapon = GetItem.weapon("Fists");
        }
        actor.shiftHumanity(cw.humanityLoss + bonusHumanity);
        return cw;
    }

    /** Cheapest line the actor could still install (street/corp) — for the scav clinic. */
    public static cheapestInstall(actor: Actor): AugOffer | null {
        const pool = Chrome.installPool(actor, 1, ["street", "corporate"]);
        if (!pool.length || !Chrome.canInstall(actor)) { return null; }
        const line = pool.reduce((a, b) => (a.marks[0]!.cost <= b.marks[0]!.cost ? a : b));
        return Chrome.offerFor(actor, line);
    }

    /** Cheapest pending upgrade on the body — for the scav clinic. */
    public static cheapestUpgrade(actor: Actor): AugOffer | null {
        const pool = Chrome.upgradePool(actor);
        if (!pool.length || !Chrome.canInstall(actor)) { return null; }
        const offers = pool.map((c) => Chrome.offerFor(actor, Chrome.line(c.lineId)!));
        return offers.reduce((a, b) => (a.cost <= b.cost ? a : b));
    }

    /** Lines a fresh install could come from, tier-gated by sector depth. */
    private static installPool(actor: Actor, sector: number, tiers: AugTier[]): AugLine[] {
        return AUG_LINES.filter((l) => tiers.indexOf(l.tier) >= 0
            && !(l.tier === "military" && sector < 3)
            && !Chrome.owned(actor, l.id));
    }

    /** Owned lines that still have a mark to climb. */
    private static upgradePool(actor: Actor): Cyberware[] {
        return actor.cybernetics.filter((c) => c.mk < 3 && Chrome.line(c.lineId));
    }

    private static offerFor(actor: Actor, line: AugLine): AugOffer {
        const cur = Chrome.owned(actor, line.id);
        if (cur) {
            return {line, mk: cur.mk + 1, isUpgrade: true,
                cost: Chrome.upgradeCost(line, cur.mk + 1), hl: Chrome.upgradeHL(line)};
        }
        return {line, mk: 1, isUpgrade: false, cost: line.marks[0]!.cost, hl: Chrome.installHL(line)};
    }

    private static draw<T>(pool: T[], n: number): T[] {
        const bag = pool.slice();
        const out: T[] = [];
        while (out.length < n && bag.length) {
            out.push(bag.splice((Math.random() * bag.length) << 0, 1)[0]!);
        }
        return out;
    }

    /**
     * The boss drop: two free-install offers (owned lines show as their next
     * mark instead — the metal is free, the Humanity bill still isn't).
     * Empty when the wearer is chrome-locked or there is nothing left to fit.
     */
    public static bossOffers(actor: Actor, sector: number): AugOffer[] {
        if (!Chrome.canInstall(actor)) { return []; }
        const lines = [
            ...Chrome.installPool(actor, sector, ["street", "corporate", "military"]),
            ...Chrome.upgradePool(actor).map((c) => Chrome.line(c.lineId)!),
        ];
        return Chrome.draw(lines, 2).map((l) => Chrome.offerFor(actor, l));
    }

    /** The ripperdoc's counter stock: two street/corporate lines not yet worn. */
    public static shopOffers(actor: Actor, count: number = 2): AugOffer[] {
        return Chrome.draw(Chrome.installPool(actor, 1, ["street", "corporate"]), count)
            .map((l) => Chrome.offerFor(actor, l));
    }

    /** Every upgrade the ripperdoc could perform on what's already installed. */
    public static upgradeOffers(actor: Actor): AugOffer[] {
        return Chrome.upgradePool(actor).map((c) => Chrome.offerFor(actor, Chrome.line(c.lineId)!));
    }

    // =====================================================================
    // Arming: chrome that needs per-battle / per-sector state on the squad.
    // party[0] is the player — the only body that ever carries augs.
    // =====================================================================

    /** Battle-scoped: called from Battlefield.deploy for every fresh fight. */
    public static primeSquad(party: Actor[]): void {
        const player = party[0];
        if (!player) { return; }
        const squadInit = player.chromeNum("squadInitiative");
        const squadHit = player.chromeNum("squadHitBonus");
        const mercHit = player.chromeNum("mercHitBonus");
        party.forEach((p, i) => {
            p.squadInitRt = squadInit;
            p.squadHitRt = squadHit + (i > 0 ? mercHit : 0);
            p.actFirstPending = p.chromeHas("actFirst");
            // Sandevistan Overclock does what its name says: the opening rounds
            // are lived at double speed, not merely first.
            if (p.chromeHas("actFirst")) { applyStatus(p, "overclock", 2); }
            const spikes = p.chromeNum("thorns");
            if (spikes > 0) { applyStatus(p, "thorns", spikes); }
            p.grazeUsed = false;
            // cyberweapons need no upkeep here: they are derived from the
            // chrome list on demand (see Gear.chromeWeapons), so they can't be
            // pruned, stripped, fenced or lost in the first place
        });
    }

    /** Sector-scoped: called wherever a fresh RunState takes effect. */
    public static armRun(party: Actor[]): void {
        const player = party[0];
        if (!player) { return; }
        player.iceLeft = player.chromeNum("iceCharges");
        player.bioSavesLeft = player.chromeNum("mercStabilize") >= 2 ? 99
            : player.chromeNum("mercStabilize") >= 1 ? 1 : 0;
        party.forEach((p) => { p.bioStabilized = false; });
    }

    /**
     * Squad Biomonitor pass: pull dropping mercs back once per run. Returns
     * the names it saved this call (for the feed).
     */
    public static biomonitorPass(party: Actor[]): string[] {
        const player = party[0];
        if (!player) { return []; }
        const saved: string[] = [];
        party.forEach((p, i) => {
            if (i === 0 || !p.mortallyWounded || !p.alive) { return; }
            if (player.bioSavesLeft <= 0 || p.bioStabilized) { return; }
            p.stabilize();
            p.bioStabilized = true;
            player.bioSavesLeft -= 1;
            saved.push(p.name);
        });
        return saved;
    }

    /** How hard the party shrugs off toxins: 0 none, 1 bonus, 2 immune, 3 immune+loot. */
    public static toxinShield(party: Actor[]): number {
        const p = party[0];
        if (!p) { return 0; }
        if (p.chromeHas("toxinLoot")) { return 3; }
        if (p.chromeHas("toxinImmune")) { return 2; }
        return p.chromeNum("toxinCheckBonus") > 0 ? 1 : 0;
    }
}
