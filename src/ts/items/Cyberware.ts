import {Item} from "./Item";
import {ObjectPosition} from "../utils/ObjectPosition";

/**
 * Mechanical effects a piece of chrome grants once installed. Every field is
 * honored at exactly one seam in the game code — an effect that nothing reads
 * doesn't ship. Effects are absolute per mark (a Mk.II's numbers replace the
 * Mk.I's, they don't stack on top).
 */
export interface CyberwareEffects {
    // --- combat chassis ---
    sp?: number;                  // subdermal/skinweave body armour (SP)
    initiative?: number;          // reflex boosters (Kerenzikov, Sandevistan)
    attackBonus?: number;         // targeting scope / smartgun link
    grantsWeapon?: string;        // cyberweapons (Wolvers, popup guns): a real equippable weapon
    body?: number;                // grafted muscle & bone lace (raises BODY -> HP)
    ignoreWoundPenalty?: boolean; // Pain Editor
    halveWoundPenalty?: boolean;  // Pain Dampers (Mk.I of the line)
    ignoreFearPenalty?: boolean;  // Pain Editor Ultra
    subdermalSelfRepair?: boolean; // subdermal plating regrows wherever worn armour gets patched
    actFirst?: boolean;           // Sandevistan Overclock: always first in round 1
    grazeOnMiss?: boolean;        // Smartgun Array: first miss each fight lands half damage
    squadInitiative?: number;     // Tactical Co-Processor: whole squad initiative
    squadHitBonus?: number;       // Tactical Co-Processor Mk.III: whole squad to-hit
    // --- events & checks ---
    checkBonus?: number;          // Chipware: bonus on INT/TECH event checks
    checkAllStats?: boolean;      // Polychip Array: the bonus covers every stat
    facedownBonus?: number;       // chrome that makes a stare land harder
    toxinCheckBonus?: number;     // Toxin Binders: bonus on poison/drug checks
    toxinImmune?: boolean;        // Toxin Binders Mk.II: auto-pass those checks
    toxinLoot?: boolean;          // Mk.III: a shrugged-off dose is free pharma
    // --- economy & map ---
    eddieBonus?: number;          // Fixer Shard: every eddie earned is bigger
    priceDiscount?: number;       // Expense Chip: market prices down
    deathBank?: number;           // Cryptobank Cortex: fraction of eddies surviving death
    scoutRange?: number;          // Threat-Ping: extra reveal hops on the holo-map
    scavBonus?: number;           // Magpie Optics: scavenge chance up
    stockBonus?: number;          // Vendor-Handshake: extra market stock
    stockReroll?: boolean;        // Vendor-Handshake Mk.III: one stock reroll per visit
    // --- survival ---
    iceCharges?: number;          // Self-ICE: killing blows survived per run
    iceFloor?: number;            // fraction of max HP the save leaves you at
    stabilizeDying?: boolean;     // Blood Pump: never bleed out
    medBoost?: number;            // Blood Pump: meds heal +50% / double
    healAfterCombat?: number;     // Nanosurgeons: HP back after every fight
    traumaDiscount?: number;      // Trauma Platinum: fraction shaved off the wake-up bill
    reviveRepairs?: boolean;      // Trauma Platinum Mk.II: the revive also patches armour
    extraRevives?: number;        // Trauma Platinum Mk.III: more revives per run
    luckMax?: number;             // Probability Co-Processor: max Luck up
    luckOnElite?: boolean;        // Mk.III: Luck refreshes after every elite/boss
    // --- crew-ware ---
    repBonus?: number;            // Reputation Cortex: rep gains land bigger
    hireDiscount?: number;        // Reputation Cortex: hires cost less
    mercStabilize?: number;       // Squad Biomonitor: 1 = one save per run, 2 = one per merc
    mercHealAfter?: number;       // Mk.III: mercs also heal after fights
    mercGearTier?: number;        // Command Uplink: hires arrive better armoured
    mercHitBonus?: number;        // Command Uplink Mk.II: mercs shoot straighter
    freeVeteranStarter?: boolean; // Mk.III: the post-death freebie merc is a Veteran
}

export type AugTier = "street" | "corporate" | "military";

/** One mark of an upgrade line — what's actually in the body at that level. */
export interface AugMark {
    name: string;
    cost: number;              // eddies to install straight at this mark
    description: string;
    effects: CyberwareEffects;
}

/**
 * An upgrade line: one identity, three marks. A body holds at most one
 * instance of a line — upgrading swaps the mark in place, which is the
 * anti-stacking rule (no double Sandevistans).
 */
export interface AugLine {
    id: string;
    tier: AugTier;
    slot: string;              // neuralware / cyberoptics / cyberarm / body / cyberaudio
    marks: [AugMark, AugMark, AugMark];
}

/** Humanity Loss to install a line, by tier. */
export const INSTALL_HL: { [T in AugTier]: number } = {street: 3, corporate: 6, military: 12};

/** Humanity Loss per mark upgrade: a third of the install, rounded up. */
export const upgradeHL = (tier: AugTier): number => Math.ceil(INSTALL_HL[tier] / 3);

export class Cyberware extends Item {
    public slot: string;
    /** Total Humanity paid to get this piece to its current mark. */
    public humanityLoss: number;
    public effects: CyberwareEffects;
    public lineId: string;
    public mk: number;
    public tier: AugTier;

    constructor(line: AugLine, mk: number) {
        const mark = line.marks[Math.max(0, Math.min(2, mk - 1))]!;
        super("cyberware", mark.name, mark.cost, mark.description, new ObjectPosition(0, 0, 0));
        this.slot = line.slot;
        this.lineId = line.id;
        this.mk = Math.max(1, Math.min(3, mk));
        this.tier = line.tier;
        this.humanityLoss = INSTALL_HL[line.tier] + (this.mk - 1) * upgradeHL(line.tier);
        this.effects = {...mark.effects};
    }
}
