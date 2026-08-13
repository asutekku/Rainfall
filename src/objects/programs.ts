import {ProgramConfig} from "../ts/items/Program";

// Cyberpunk RED NET programs. The Netrunner's cyberdeck runs attackers,
// defenders and boosters; Black ICE are the programs a NET Architecture runs
// against intruders. Values follow the RED core "Netrunning" tables closely.
const programs: { [name: string]: ProgramConfig } = {
    // --- Attacker programs (reduce a target program's REZ) ---
    Zap: {
        name: "Zap", programClass: "attacker", atk: 0, def: 0, rez: 0, damage: 1,
        antiPersonnel: false, cost: 0, effect: "The basic Interface attack; 1d6 to a target's REZ.",
    },
    Sword: {
        name: "Sword", programClass: "attacker", atk: 0, def: 0, rez: 0, damage: 3,
        antiPersonnel: false, cost: 100, effect: "An anti-program blade; 3d6 to a target's REZ.",
    },
    Banhammer: {
        name: "Banhammer", programClass: "attacker", atk: 0, def: 0, rez: 0, damage: 2,
        antiPersonnel: false, cost: 500, effect: "Anti-personnel attacker; 2d6 to a target's REZ.",
    },
    Hellbolt: {
        name: "Hellbolt", programClass: "attacker", atk: 0, def: 0, rez: 0, damage: 3,
        antiPersonnel: false, cost: 500, effect: "A blast of hellfire; 3d6 to a target's REZ.",
    },
    // --- Defender programs (soak Black ICE damage) ---
    Armor: {
        name: "Armor", programClass: "defender", atk: 0, def: 4, rez: 0, damage: 0,
        antiPersonnel: false, cost: 100, effect: "Reduces the damage of Black ICE attacks by 4.",
    },
    Shield: {
        name: "Shield", programClass: "defender", atk: 0, def: 2, rez: 0, damage: 0,
        antiPersonnel: false, cost: 100, effect: "A barrier that soaks 2 damage from attacks.",
    },
    // --- Black ICE (anti-personnel unless noted) ---
    Wisp: {
        name: "Wisp", programClass: "blackice", atk: 2, def: 2, rez: 15, damage: 1,
        antiPersonnel: true, cost: 0, effect: "A weak anti-personnel ICE; 1d6 brain damage.",
    },
    Killer: {
        name: "Killer", programClass: "blackice", atk: 3, def: 6, rez: 20, damage: 0,
        antiPersonnel: false, cost: 0, effect: "Anti-program ICE that hunts other programs.",
    },
    Hellhound: {
        name: "Hellhound", programClass: "blackice", atk: 4, def: 4, rez: 25, damage: 2,
        antiPersonnel: true, cost: 0, effect: "Sets the runner's deck ablaze; 2d6 brain damage.",
    },
    Sabertooth: {
        name: "Sabertooth", programClass: "blackice", atk: 5, def: 6, rez: 20, damage: 2,
        antiPersonnel: true, cost: 0, effect: "A fast hunter-killer ICE; 2d6 brain damage.",
    },
    Kraken: {
        name: "Kraken", programClass: "blackice", atk: 8, def: 8, rez: 45, damage: 3,
        antiPersonnel: true, cost: 0, effect: "A monstrous ICE; 3d6 brain damage and hard to derez.",
    },
};

export default programs;
