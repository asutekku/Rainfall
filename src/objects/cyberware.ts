import {AugLine} from "../ts/items/Cyberware";

/**
 * The chrome catalog: every aug is an upgrade line with three marks.
 *
 * Tiers set the Humanity bill (street 3 HL, corporate 6, military 12; each
 * mark upgrade costs a third of that, rounded up) and where the line shows up:
 * street/corporate lines stock the ripperdoc counter, military lines only
 * come off sector-3+ bosses. Effects are absolute per mark, and a body holds
 * one instance of a line — upgrades swap the mark in place.
 *
 * Chrome is the meta-progression: it (and the Humanity it cost) survives
 * death, unlike everything else the character carries.
 */
const AUG_LINES: AugLine[] = [

    // ================================================================ chassis
    {
        id: "wolvers", tier: "corporate", slot: "cyberarm",
        marks: [
            {name: "Wolvers", cost: 500, effects: {grantsWeapon: "Wolvers"},
                description: "Retractable monofilament claws. 3d6 up close, and nobody can ever take them off you."},
            {name: "Wolvers Mk.II", cost: 800, effects: {grantsWeapon: "Wolvers Mk.II"},
                description: "Longer blades, better servos: 4d6 in close combat."},
            {name: "Wolvers Mk.III", cost: 1200, effects: {grantsWeapon: "Wolvers Mk.III"},
                description: "Milspec edge coating — 4d6 and armour parts like paper (AP)."},
        ],
    },
    {
        id: "popup-gun", tier: "street", slot: "cyberarm",
        marks: [
            {name: "Popup Holdout", cost: 250, effects: {grantsWeapon: "Popup Holdout"},
                description: "A 2d6 holdout folded into the forearm. You are never unarmed — not even after Trauma Team strips you."},
            {name: "Popup SMG", cost: 450, effects: {grantsWeapon: "Popup SMG"},
                description: "The forearm now houses a 3d6 machine pistol."},
            {name: "Popup Burst Pistol", cost: 700, effects: {grantsWeapon: "Popup Burst Pistol"},
                description: "4d6 smart-linked burst fire from a hidden housing (+1 to hit)."},
        ],
    },
    {
        id: "subdermal", tier: "corporate", slot: "body",
        marks: [
            {name: "Subdermal Armor", cost: 1000, effects: {sp: 7},
                description: "Armour plating grafted beneath the skin (SP 7 on the body)."},
            {name: "Subdermal Armor Mk.II", cost: 1500, effects: {sp: 9},
                description: "Denser weave, wider coverage (SP 9)."},
            {name: "Reactive Subdermal Mk.III", cost: 2200, effects: {sp: 11, subdermalSelfRepair: true, thorns: 3},
                description: "Self-knitting plate (SP 11) with shaped charges under the weave — it regrows when the crew patches armour, and anything that lands a hit takes 3 straight back."},
        ],
    },
    {
        id: "muscle-lace", tier: "corporate", slot: "body",
        marks: [
            {name: "Muscle & Bone Lace", cost: 1000, effects: {body: 1},
                description: "Reinforced skeleton and muscle grafts (+1 BODY)."},
            {name: "Muscle & Bone Lace Mk.II", cost: 1400, effects: {body: 2},
                description: "Second-generation lace, deeper anchoring (+2 BODY)."},
            {name: "Muscle & Bone Lace Mk.III", cost: 1900, effects: {body: 3},
                description: "Full myomer replacement (+3 BODY)."},
        ],
    },
    {
        id: "linear-frame", tier: "military", slot: "body",
        marks: [
            {name: "Linear Frame Sigma", cost: 2500, effects: {body: 2},
                description: "An exoskeletal frame bolted to the spine (+2 BODY)."},
            {name: "Linear Frame Beta", cost: 3400, effects: {body: 3},
                description: "Milspec actuators, load-bearing chassis (+3 BODY)."},
            {name: "Linear Frame Omega", cost: 4600, effects: {body: 5},
                description: "The full lift rig. Doors are a suggestion now (+5 BODY)."},
        ],
    },
    {
        id: "big-knucks", tier: "street", slot: "cyberarm",
        marks: [
            {name: "Big Knucks", cost: 100, effects: {grantsWeapon: "Big Knucks"},
                description: "Chromed knuckle plating: 2d6 brawling, always at hand."},
            {name: "Big Knucks Mk.II", cost: 250, effects: {grantsWeapon: "Big Knucks Mk.II"},
                description: "Weighted cores and wrist bracing: 3d6 brawling."},
            {name: "Big Knucks Mk.III", cost: 450, effects: {grantsWeapon: "Big Knucks Mk.II", facedownBonus: 2},
                description: "3d6 brawling, and letting them glint carries every stare-down (+2 on facedowns)."},
        ],
    },

    // ================================================================ wetware
    {
        id: "speedware", tier: "corporate", slot: "neuralware",
        marks: [
            {name: "Kerenzikov", cost: 500, effects: {initiative: 2},
                description: "Boosted reflexes wired into the spine (+2 Initiative)."},
            {name: "Sandevistan", cost: 900, effects: {initiative: 3},
                description: "Speedware. When it kicks in, the world slows to a crawl (+3 Initiative)."},
            {name: "Sandevistan Overclock", cost: 1600, effects: {initiative: 3, actFirst: true},
                description: "+3 Initiative, and the opening round is always yours — you move before anyone."},
        ],
    },
    {
        id: "smartgun", tier: "street", slot: "cyberoptics",
        marks: [
            {name: "Targeting Scope", cost: 200, effects: {attackBonus: 1},
                description: "A cybereye with a targeting overlay (+1 to ranged attacks)."},
            {name: "Smartgun Link", cost: 500, effects: {attackBonus: 2},
                description: "Eye and trigger on the same subnet (+2 to ranged attacks)."},
            {name: "Smartgun Array", cost: 900, effects: {attackBonus: 2, grazeOnMiss: true},
                description: "+2 to hit, and the array salvages your first miss each fight into a graze."},
        ],
    },
    {
        id: "pain-editor", tier: "military", slot: "neuralware",
        marks: [
            {name: "Pain Dampers", cost: 1000, effects: {halveWoundPenalty: true},
                description: "Filters the worst of it out — wound penalties halved."},
            {name: "Pain Editor", cost: 1600, effects: {ignoreWoundPenalty: true},
                description: "Edits pain signals out entirely; the wearer ignores wound penalties."},
            {name: "Pain Editor Ultra", cost: 2400, effects: {ignoreWoundPenalty: true, ignoreFearPenalty: true},
                description: "Pain, fear — all of it, gone. Nothing rattles the hands."},
        ],
    },
    {
        id: "tactical-coproc", tier: "corporate", slot: "neuralware",
        marks: [
            {name: "Tactical Co-Processor", cost: 600, effects: {squadInitiative: 1},
                description: "You call the openings before they open — whole squad +1 Initiative."},
            {name: "Tactical Co-Processor Mk.II", cost: 1100, effects: {squadInitiative: 2},
                description: "Predictive overwatch on every earpiece — squad +2 Initiative."},
            {name: "Tactical Co-Processor Mk.III", cost: 1800, effects: {squadInitiative: 2, squadHitBonus: 1},
                description: "Squad +2 Initiative and +1 to hit — your chrome runs the fireteam."},
        ],
    },
    {
        id: "chipware", tier: "street", slot: "neuralware",
        marks: [
            {name: "Chipware Socket", cost: 300, effects: {checkBonus: 2},
                description: "A skill-chip socket behind the ear (+2 on INT and TECH checks)."},
            {name: "Chipware Socket Mk.II", cost: 500, effects: {checkBonus: 3},
                description: "Faster bus, better chips (+3 on INT and TECH checks)."},
            {name: "Polychip Array", cost: 800, effects: {checkBonus: 3, checkAllStats: true},
                description: "A whole rack of chips, hot-swapped by reflex (+3 on every stat check)."},
        ],
    },

    // ============================================================== streetware
    {
        id: "fixer-shard", tier: "street", slot: "neuralware",
        marks: [
            {name: "Agent w/ Fixer Shard", cost: 300, effects: {eddieBonus: 0.05},
                description: "A haggling subroutine rides every payout (+5% eddies earned)."},
            {name: "Fixer Shard Mk.II", cost: 600, effects: {eddieBonus: 0.10},
                description: "The shard knows what everything is really worth (+10% eddies)."},
            {name: "Fixer Shard Mk.III", cost: 1000, effects: {eddieBonus: 0.15},
                description: "It negotiates while you reload (+15% eddies earned)."},
        ],
    },
    {
        id: "expense-chip", tier: "street", slot: "neuralware",
        marks: [
            {name: "Corporate Expense Chip", cost: 300, effects: {priceDiscount: 0.05},
                description: "A liberated corpo account chip — 5% off market prices."},
            {name: "Expense Chip Mk.II", cost: 600, effects: {priceDiscount: 0.10},
                description: "Platinum clearance codes (10% off market prices)."},
            {name: "Expense Chip Mk.III", cost: 1000, effects: {priceDiscount: 0.15},
                description: "Executive tier. Somebody in accounting is covering you (15% off)."},
        ],
    },
    {
        id: "cryptobank", tier: "military", slot: "neuralware",
        marks: [
            {name: "Cryptobank Cortex", cost: 2000, effects: {deathBank: 0.10},
                description: "A shadow account woven into your brainstem — 10% of your eddies survive death."},
            {name: "Cryptobank Cortex Mk.II", cost: 3000, effects: {deathBank: 0.15},
                description: "Distributed cold storage (15% of eddies survive death)."},
            {name: "Cryptobank Cortex Mk.III", cost: 4500, effects: {deathBank: 0.20},
                description: "Not even the reaper gets your PIN (20% of eddies survive death)."},
        ],
    },
    {
        id: "threat-ping", tier: "street", slot: "cyberaudio",
        marks: [
            {name: "Threat-Ping Cyberaudio", cost: 250, effects: {scoutRange: 1},
                description: "Filtered street chatter maps one block further ahead."},
            {name: "Threat-Ping Mk.II", cost: 500, effects: {scoutRange: 2},
                description: "Wideband intercept — two extra blocks of intel."},
            {name: "Threat-Ping Mk.III", cost: 900, effects: {scoutRange: 99},
                description: "You hear the whole sector breathing — every waypoint identified."},
        ],
    },
    {
        id: "magpie-optics", tier: "street", slot: "cyberoptics",
        marks: [
            {name: "Magpie Optics", cost: 250, effects: {scavBonus: 0.06},
                description: "Salvage-tagging overlay — nothing shiny gets past you (+6% scavenge)."},
            {name: "Magpie Optics Mk.II", cost: 450, effects: {scavBonus: 0.09},
                description: "Deep-spectrum sweep (+9% scavenge chance)."},
            {name: "Magpie Optics Mk.III", cost: 750, effects: {scavBonus: 0.12},
                description: "You see the serial numbers through the smoke (+12% scavenge)."},
        ],
    },
    {
        id: "vendor-handshake", tier: "corporate", slot: "neuralware",
        marks: [
            {name: "Vendor-Handshake Chip", cost: 500, effects: {stockBonus: 1},
                description: "Merchants open the back room — one extra item in every market."},
            {name: "Vendor-Handshake Mk.II", cost: 900, effects: {stockBonus: 2},
                description: "Preferred-buyer flags on every vendor net (two extra items in stock)."},
            {name: "Vendor-Handshake Mk.III", cost: 1400, effects: {stockBonus: 2, stockReroll: true},
                description: "Two extra items, and once per visit they'll bring out the other crate."},
        ],
    },

    // ================================================================ survival
    {
        id: "self-ice", tier: "military", slot: "body",
        marks: [
            {name: "Self-ICE", cost: 2500, effects: {iceCharges: 1, iceFloor: 0.01},
                description: "A dead-man's surge protector: once per run, a killing blow leaves you at 1 HP."},
            {name: "Self-ICE Mk.II", cost: 3500, effects: {iceCharges: 1, iceFloor: 0.25},
                description: "The surge now dumps you at a quarter health instead of the brink."},
            {name: "Self-ICE Mk.III", cost: 5000, effects: {iceCharges: 2, iceFloor: 0.25},
                description: "Twice per run, death bounces off the breaker."},
        ],
    },
    {
        id: "blood-pump", tier: "corporate", slot: "body",
        marks: [
            {name: "Blood Pump", cost: 600, effects: {stabilizeDying: true},
                description: "An assisted heart that refuses to quit — you stabilise instead of bleeding out."},
            {name: "Blood Pump Mk.II", cost: 1000, effects: {stabilizeDying: true, medBoost: 0.5},
                description: "Never bleed out, and meds circulate harder (+50% healing from meds)."},
            {name: "Blood Pump Mk.III", cost: 1600, effects: {stabilizeDying: true, medBoost: 1},
                description: "Never bleed out, and every med hits double."},
        ],
    },
    {
        id: "nanosurgeons", tier: "corporate", slot: "body",
        marks: [
            {name: "Nanosurgeons", cost: 700, effects: {healAfterCombat: 3},
                description: "A colony of medical nanites closes wounds after every fight (+3 HP)."},
            {name: "Nanosurgeons Mk.II", cost: 1200, effects: {healAfterCombat: 5},
                description: "Second-gen swarm, faster triage (+5 HP after every fight)."},
            {name: "Nanosurgeons Mk.III", cost: 1800, effects: {healAfterCombat: 8},
                description: "They rebuild you while you walk (+8 HP after every fight)."},
        ],
    },
    {
        id: "toxin-binders", tier: "street", slot: "body",
        marks: [
            {name: "Toxin Binders", cost: 200, effects: {toxinCheckBonus: 2},
                description: "Filtration glands in the liver (+2 on poison and drug checks)."},
            {name: "Toxin Binders Mk.II", cost: 400, effects: {toxinImmune: true},
                description: "Full-spectrum binding — bad doses simply don't take."},
            {name: "Toxin Binders Mk.III", cost: 700, effects: {toxinImmune: true, toxinLoot: true},
                description: "Immune — and the glands re-sell what they catch as clean pharma."},
        ],
    },
    {
        id: "trauma-platinum", tier: "military", slot: "neuralware",
        marks: [
            {name: "Trauma Platinum Uplink", cost: 2000, effects: {traumaDiscount: 0.5},
                description: "Priority biotelemetry — Trauma Team's wake-up bill is halved."},
            {name: "Trauma Platinum Mk.II", cost: 3200, effects: {traumaDiscount: 1, reviveRepairs: true},
                description: "Executive coverage: no wake-up bill, and the extraction crew patches your armour."},
            {name: "Trauma Platinum Mk.III", cost: 5000, effects: {traumaDiscount: 1, reviveRepairs: true, extraRevives: 1},
                description: "The AV comes back twice. Death is a billing tier now."},
        ],
    },
    {
        id: "probability-coproc", tier: "corporate", slot: "neuralware",
        marks: [
            {name: "Probability Co-Processor", cost: 800, effects: {luckMax: 1},
                description: "It runs the numbers a half-second ahead of the world (+1 max Luck)."},
            {name: "Probability Co-Processor Mk.II", cost: 1300, effects: {luckMax: 2},
                description: "Deeper simulation stack (+2 max Luck)."},
            {name: "Probability Co-Processor Mk.III", cost: 2000, effects: {luckMax: 2, luckOnElite: true},
                description: "+2 max Luck, and hard scalps reset the odds — Luck refreshes after every elite and boss."},
        ],
    },

    // =============================================================== crew-ware
    {
        id: "rep-cortex", tier: "street", slot: "neuralware",
        marks: [
            {name: "Reputation Cortex", cost: 300, effects: {repBonus: 1},
                description: "It clips your best moments to every feed that matters (+1 on rep gains)."},
            {name: "Reputation Cortex Mk.II", cost: 600, effects: {repBonus: 1, hireDiscount: 0.10},
                description: "Mercs know your name before you say it (+1 rep gains, hires 10% off)."},
            {name: "Reputation Cortex Mk.III", cost: 1000, effects: {repBonus: 1, hireDiscount: 0.20},
                description: "People pay to be seen working for you (+1 rep gains, hires 20% off)."},
        ],
    },
    {
        id: "squad-biomonitor", tier: "corporate", slot: "cyberaudio",
        marks: [
            {name: "Squad Biomonitor", cost: 700, effects: {mercStabilize: 1},
                description: "Vitals on your HUD: once per run, a dropping merc is stabilised instead of lost."},
            {name: "Squad Biomonitor Mk.II", cost: 1200, effects: {mercStabilize: 2},
                description: "Full-crew coverage — every merc gets pulled back once per run."},
            {name: "Squad Biomonitor Mk.III", cost: 1800, effects: {mercStabilize: 2, mercHealAfter: 3},
                description: "Every merc saved once per run, and the link drip-feeds them 3 HP after each fight."},
        ],
    },
    {
        id: "command-uplink", tier: "military", slot: "neuralware",
        marks: [
            {name: "Command Uplink", cost: 2200, effects: {mercGearTier: 1},
                description: "Your requisition codes still work — hired mercs arrive a gear tier better."},
            {name: "Command Uplink Mk.II", cost: 3200, effects: {mercGearTier: 1, mercHitBonus: 1},
                description: "Better kit, and your targeting data on their HUDs (mercs +1 to hit)."},
            {name: "Command Uplink Mk.III", cost: 4500, effects: {mercGearTier: 1, mercHitBonus: 1, freeVeteranStarter: true},
                description: "When you crawl back from a wipe, a Veteran is already waiting at the corner."},
        ],
    },
];

export default AUG_LINES;
