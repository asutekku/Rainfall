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
        "A baseball cap from 21st century. It has some scribbles on it."
    ),
    //Beanie
    new Armor("headgear", _.headwearBeanie, "none", 1, 0, 20, "It's red and slightly small."),
    //Bicycle
    new Armor(
        "headgear",
        _.headwearCycling,
        "none",
        1.5,
        2,
        25,
        "This bicycling helmet has some nails hammered on it."
    ),
    //Hockey Mask
    new Armor(
        "headgear",
        "Hockey Mask",
        "none",
        2,
        4,
        40,
        "It makes you look like a serial killer but who cares! At least ricocheting scraps won't damage your beautiful face."
    ),
    //Motorcycle
    new Armor(
        "headgear",
        "Motorcycle Helmet",
        "heavyLeatherSet",
        2.5,
        6,
        50,
        "The visor of this helmet is dimmed so there's no way to identify you."
    ),
    //Kevlar Helmet
    new Armor(
        "headgear",
        "Kevlar Helmet",
        "kevlarSet",
        3,
        8,
        60,
        `"Borrowed" from the local Private Security Company, these helmets are proven to keep your head safe from blunt attacks. Best worn with ski-goggles.`
    ),
    //Steel helmet
    new Armor(
        "headgear",
        "Steel Helmet",
        "lightSet",
        4,
        10,
        70,
        `"Sir Jonathan III" has been engraved to the inside of this Armet helmet. The eye opening is really small so the field of view is extremely limited.`
    ),
    //Nylon helmet
    new Armor(
        "headgear",
        "Nylon Helmet",
        "heavySet",
        5,
        12,
        80,
        "Heavy duty protection for the head, standard for most military."
    ),
    //Police head
    new Armor("headgear", "Info Helm", "policeSet", 6, 20, 250, "Standard police helmet with lowlight infared vision."),

    /*====================
              -----UPPER ARMOUR-----
              =====================*/

    //Leather jacket
    new Armor(
        "upper",
        "Leather Jacket",
        "leatherSet",
        1,
        2,
        40,
        "Basic jacket made of leather. You can be sure to gather some admiring looks with this piece. It however provides only minimal protection."
    ),
    //Heavy leather
    new Armor(
        "upper",
        "Heavy Leather Jacket",
        "heavyLeatherSet",
        2,
        4,
        50,
        "A good jacket for road rash, stopping knives etc. A good .38 slug will probably rip you to bits, however."
    ),
    //Kevlar vest
    new Armor(
        "upper",
        "Kevlar Vest",
        "kevlarSet",
        3,
        6,
        80,
        "You are sure to look like an bank robber if wear these over ripped T-shirt. Will probably block most .38 slugs."
    ),
    //Kevlar jacket
    new Armor(
        "upper",
        "Kevlar Armor Jacket",
        "kevlarSet",
        3.5,
        8,
        100,
        "Personal protection for the fashion conscious, these lightweight Kevlar jackets have nylon coverings that resemble normal jackets."
    ),
    //Light armor jacket
    new Armor(
        "upper",
        "Light Armor Jacket",
        "lightSet",
        4,
        12,
        140,
        "Light duty protection for the upper body, standard for most local defence forces."
    ),
    //HEavy armor jacket
    new Armor(
        "upper",
        "Heavy Armor Jacket",
        "heavySet",
        5,
        16,
        200,
        "Heavy duty protection for the upper body, standard for most local defence forces."
    ),
    //Police upper
    new Armor(
        "upper",
        "C-Ballistic Mesh",
        "policeSet",
        6,
        18,
        300,
        "Worn over Skin Tight body armor, this standard police armour provides good protection."
    ),

    /*====================
              -----LOWER ARMOUR-----
              =====================*/

    //Leather pants
    new Armor(
        "lower",
        "Leather Pants",
        "leatherSet",
        1,
        2,
        35,
        "Basic pants made of leather. These provide only minimal protection but at least you look cool in them."
    ),
    //Heavy leather Pants
    new Armor(
        "lower",
        "Heavy Leather Pants",
        "heavyLeatherSet",
        2,
        4,
        50,
        "Good pants for road rash, stopping knives etc. A good .38 slug will probably rip you to bits, however."
    ),
    //Kevlar pants
    new Armor(
        "lower",
        "Kevlar Pants",
        "kevlarSet",
        3,
        8,
        80,
        "Originally made for motorcyclists, these pants are proven to keep you safe from being dragged around the streets."
    ),
    //Light armor pants
    new Armor(
        "lower",
        "Light Armor Pants",
        "lightSet",
        4,
        12,
        130,
        "Light duty protection for the lower body, standard for most local defence forces."
    ),
    //Heavy armor pants
    new Armor(
        "lower",
        "Heavy Armor Pants",
        "heavySet",
        5,
        16,
        130,
        "Heavy duty protection for the lower body, standard for most military."
    ),
    //Police lower body
    new Armor(
        "lower",
        "Riot Pads",
        "heavySet",
        6,
        18,
        250,
        "Tested to 155 PSI, these pads are sure to keep your knees safe."
    )
];
export default armors;
