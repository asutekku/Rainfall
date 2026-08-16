import {WeaponConfig} from "../ts/items/Weapon";

/**
 * Weapons that only exist as chrome — granted by installed cyberware, never
 * sold, dropped or rolled into a spawn pool. rarity 6 keeps them above every
 * pool's rarity cap and cost 0 keeps them out of shops and worth nothing to
 * the fence (chrome regrows on the next deploy, so fencing it would be a
 * money printer).
 */
const base = {
    manufacturer: "",
    damage: 0,
    damageType: "kinetic",
    accuracyBonus: 0,
    autofire: false,
    hands: 1,
    rarity: 6,
    concealment: true,
    reliability: 3,
    quality: "Excellent",
    cost: 0,
};

const cyberweapons: WeaponConfig[] = [
    {
        ...base, weaponType: "Very Heavy Melee Weapon", weaponClass: "melee",
        name: "Wolvers Mk.II", skill: "Melee Weapon", diceThrows: 4, ap: false,
        shots: 0, rateOfFire: 2, range: 2,
        description: "Second-mark monofilament claws: 4d6 in close combat.",
    },
    {
        ...base, weaponType: "Very Heavy Melee Weapon", weaponClass: "melee",
        name: "Wolvers Mk.III", skill: "Melee Weapon", diceThrows: 4, ap: true,
        shots: 0, rateOfFire: 2, range: 2,
        description: "Milspec edge coating — 4d6 and armour parts like paper.",
    },
    {
        ...base, weaponType: "Light Melee Weapon", weaponClass: "melee",
        name: "Big Knucks", skill: "Brawling", diceThrows: 2, ap: false,
        shots: 0, rateOfFire: 2, range: 2,
        description: "Chromed knuckle plating: 2d6, always at hand.",
    },
    {
        ...base, weaponType: "Medium Melee Weapon", weaponClass: "melee",
        name: "Big Knucks Mk.II", skill: "Brawling", diceThrows: 3, ap: false,
        shots: 0, rateOfFire: 2, range: 2,
        description: "Weighted cores and wrist bracing: 3d6 brawling.",
    },
    {
        ...base, weaponType: "Medium Pistol", weaponClass: "pistol",
        name: "Popup Holdout", skill: "Handgun", diceThrows: 2, ap: false,
        shots: 8, rateOfFire: 2, range: 50,
        description: "A 2d6 holdout folded into the forearm housing.",
    },
    {
        ...base, weaponType: "Heavy Pistol", weaponClass: "pistol",
        name: "Popup SMG", skill: "Handgun", diceThrows: 3, ap: false,
        shots: 12, rateOfFire: 2, range: 50,
        description: "A 3d6 machine pistol in the forearm housing.",
    },
    {
        ...base, weaponType: "Very Heavy Pistol", weaponClass: "pistol",
        name: "Popup Burst Pistol", skill: "Handgun", diceThrows: 4, ap: false,
        accuracyBonus: 1, shots: 12, rateOfFire: 2, range: 50,
        description: "4d6 smart-linked burst fire from a hidden housing (+1 to hit).",
    },
];

export default cyberweapons;
