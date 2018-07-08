import en_US from "../../lang/en_US";

let _ = en_US.armor;
import { Armor } from "./Armor";

let armors = [
    new Armor(
        "headgear",
        _.headwearCap,
        "none",
        1,
        0,
        20,
        "A baseball cap from 21st century. It has some scribbles on it.",
        "armor_cap"
    ),
    //Beanie
    new Armor("headgear", _.headwearBeanie, "none", 1, 0, 20, "It's red and slightly small.", "armor_heBean"),
    //Bicycle
    new Armor(
        "headgear",
        _.headwearCycling,
        "none",
        1.5,
        2,
        25,
        "This bicycling helmet has some nails hammered on it.",
        "armor_cycle"
    ),
    //Hockey Mask
    new Armor(
        "headgear",
        "Hockey Mask",
        "none",
        2,
        4,
        40,
        "It makes you look like a serial killer but who cares! At least ricocheting scraps won't damage your beautiful face.",
        "armor_hockeyMask"
    ),
    //Motorcycle
    new Armor(
        "headgear",
        "Motorcycle Helmet",
        "Heavy leather",
        2.5,
        6,
        50,
        "The visor of this helmet is dimmed so there's no way to identify you.",
        "armor_helmetMotor"
    ),
    //Kevlar Helmet
    new Armor(
        "headgear",
        "Kevlar Helmet",
        "Kevlar",
        3,
        8,
        60,
        `"Borrowed" from the local Private Security Company, these helmets are proven to keep your head safe from blunt attacks. Best worn with ski-goggles.`,
        "armor_helmetKevlar"
    ),
    //Steel helmet
    new Armor(
        "headgear",
        "Steel Helmet",
        "Light",
        4,
        10,
        70,
        `"Sir Jonathan III" has been engraved to the inside of this Armet helmet. The eye opening is really small so the field of view is extremely limited.`,
        "armor_helmetSteel"
    ),
    //Nylon helmet
    new Armor(
        "headgear",
        "Nylon Helmet",
        "Heavy",
        5,
        12,
        80,
        "Heavy duty protection for the head, standard for most military.",
        "armor_helmetNylon"
    ),
    //Police head
    new Armor(
        "headgear",
        "Info Helm",
        "Police",
        6,
        20,
        250,
        "Standard police helmet with lowlight infared vision.",
        "armor_helmetInfo"
    ),

    /*====================
              -----UPPER ARMOUR-----
              =====================*/

    //Leather jacket
    new Armor(
        "upper",
        "Leather Jacket",
        "Leather",
        1,
        2,
        40,
        "Basic jacket made of leather. You can be sure to gather some admiring looks with this piece. It however provides only minimal protection.",
        "armor_upperLeather"
    ),
    //Heavy leather
    new Armor(
        "upper",
        "Heavy Leather Jacket",
        "Heavy Leather",
        2,
        4,
        50,
        "A good jacket for road rash, stopping knives etc. A good .38 slug will probably rip you to bits, however.",
        "armor_upperLeatherHeavy"
    ),
    //Kevlar vest
    new Armor(
        "upper",
        "Kevlar Vest",
        "Kevlar",
        3,
        6,
        80,
        "You are sure to look like an bank robber if wear these over ripped T-shirt. Will probably block most .38 slugs.",
        "armor_upperKevlarVest"
    ),
    //Kevlar jacket
    new Armor(
        "upper",
        "Kevlar Armor Jacket",
        "Kevlar",
        3.5,
        8,
        100,
        "Personal protection for the fashion conscious, these lightweight Kevlar jackets have nylon coverings that resemble normal jackets.",
        "armor_upperKevlarJacket"
    ),
    //Light armor jacket
    new Armor(
        "upper",
        "Light Armor Jacket",
        "Light",
        4,
        12,
        140,
        "Light duty protection for the upper body, standard for most local defence forces.",
        "armor_uLiAr"
    ),
    //HEavy armor jacket
    new Armor(
        "upper",
        "Heavy Armor Jacket",
        "Heavy",
        5,
        16,
        200,
        "Heavy duty protection for the upper body, standard for most local defence forces.",
        "armor_uHeAr"
    ),
    //Police upper
    new Armor(
        "upper",
        "C-Ballistic Mesh",
        "Police",
        6,
        18,
        300,
        "Worn over Skin Tight body armor, this standard police armour provides good protection.",
        "armor_uCbal"
    ),

    /*====================
              -----LOWER ARMOUR-----
              =====================*/

    //Leather pants
    new Armor(
        "lower",
        "Leather Pants",
        "Leather",
        1,
        2,
        35,
        "Basic pants made of leather. These provide only minimal protection but at least you look cool in them.",
        "armor_loLePa"
    ),
    //Heavy leather Pants
    new Armor(
        "lower",
        "Heavy Leather Pants",
        "Heavy Leather",
        2,
        4,
        50,
        "Good pants for road rash, stopping knives etc. A good .38 slug will probably rip you to bits, however.",
        "armor_loLeHe"
    ),
    //Kevlar pants
    new Armor(
        "lower",
        "Kevlar Pants",
        "Kevlar",
        3,
        8,
        80,
        "Originally made for motorcyclists, these pants are proven to keep you safe from being dragged around the streets.",
        "armor_loKevl"
    ),
    //Light armor pants
    new Armor(
        "lower",
        "Light Armor Pants",
        "Light",
        4,
        12,
        130,
        "Light duty protection for the lower body, standard for most local defence forces.",
        "armor_LiArPa"
    ),
    //Heavy armor pants
    new Armor(
        "lower",
        "Heavy Armor Pants",
        "HEavy",
        5,
        16,
        130,
        "Heavy duty protection for the lower body, standard for most military.",
        "armor_HeArPa"
    ),
    //Police lower body
    new Armor(
        "lower",
        "Riot Pads",
        "Police",
        6,
        18,
        250,
        "Tested to 155 PSI, these pads are sure to keep your knees safe.",
        "armor_loRiPa"
    )
];

export default armors;
