import {CyberwareConfig} from "../ts/items/Cyberware";

// A combat-relevant subset of Cyberpunk RED cyberware. Humanity Loss (HL) and
// costs follow the RED "Chrome" tables; effects are modelled for this game's
// combat loop.
const cyberware: CyberwareConfig[] = [
    {
        name: "Neural Link",
        slot: "neuralware",
        humanityLoss: 2,
        cost: 500,
        description: "The backbone of a chromed nervous system; required to run most Neuralware.",
        effects: {},
    },
    {
        name: "Sandevistan",
        slot: "neuralware",
        humanityLoss: 7,
        cost: 500,
        description: "Speedware. When kicked in, the world slows to a crawl (+3 Initiative).",
        effects: {initiative: 3},
    },
    {
        name: "Kerenzikov",
        slot: "neuralware",
        humanityLoss: 7,
        cost: 500,
        description: "Boosted reflexes wired into the spine (+2 Initiative).",
        effects: {initiative: 2},
    },
    {
        name: "Cybereye w/ Targeting Scope",
        slot: "cyberoptics",
        humanityLoss: 2,
        cost: 200,
        description: "A cybernetic eye with a targeting scope option (+1 to Ranged attacks).",
        effects: {attackBonus: 1},
    },
    {
        name: "Subdermal Armor",
        slot: "body",
        humanityLoss: 7,
        cost: 1000,
        description: "Armour plating grafted beneath the skin (SP 7 on the body).",
        effects: {sp: 7},
    },
    {
        name: "Wolvers",
        slot: "cyberarm",
        humanityLoss: 3,
        cost: 500,
        description: "Retractable monofilament claws mounted in a cyberarm (a 3d6 melee weapon).",
        effects: {grantsWeapon: "Wolvers"},
    },
    {
        name: "Grafted Muscle and Bone Lace",
        slot: "body",
        humanityLoss: 7,
        cost: 1000,
        description: "Reinforced skeleton and muscle grafts (+2 BODY).",
        effects: {body: 2},
    },
    {
        name: "Pain Editor",
        slot: "neuralware",
        humanityLoss: 14,
        cost: 1000,
        description: "Edits pain signals out entirely; the wearer ignores wound penalties.",
        effects: {ignoreWoundPenalty: true},
    },
];

export default cyberware;
