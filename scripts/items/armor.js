define(['items/def'], function (def) {
    return {
        armor: [

            /*====================
            -------HEADGEAR-------
            =====================*/

            //Baseball
            new def.armour("helmet", "Baseball Cap", "none", 1, 0, 20, "A baseball cap from 21st century. It has some scribbles on it."),
            //Beanie
            new def.armour("helmet", "Beanie", "none", 1, 0, 20, "It's red and slightly small."),
            //Bicycle
            new def.armour("helmet", "Bicycling Helmet", "none", 1.5, 2, 25, "This bicycling halmet has some nails hammered on it."),
            //Hockey Mask
            new def.armour("helmet", "Hockey Mask", "none", 2, 4, 40, "It makes you look like a serial killer but who cares! At least ricocheting scraps won't damage your beautiful face."),
            //Motorcycle
            new def.armour("helmet", "Motorcycle Helmet", "heavyLeatherSet", 2.5, 6, 50, "The visor of this helmet is dimmed so there's no way to identify you."),
            //Kevlar Helmet
            new def.armour("helmet", "Kevlar Helmet", "kevlarSet", 3, 8, 60, '/"Borrowed/" from the local Private Security Company, these helmets are proven to keep your head safe from blunt attacks. Best worn with ski-goggles.'),
            //Steel helmet
            new def.armour("helmet", "Steel Helmet", "lightSet", 4, 10, 70, '/"Sir Jonathan III/" has been engraved to the inside of this Armet helmet. The eye opening is really small so the field of view is extremely limited.'),
            //NYlon helmet
            new def.armour("helmet", "Nylon Helmet", "heavySet", 5, 12, 80, "Heavy duty protection for the head, standard for most military."),
            //Police head
            new def.armour("helmet", "Info Helm", "policeSet", 6, 20, 250, "Standard police helmet with lowlight infared vision."),

            /*====================
            -----UPPER ARMOUR-----
            =====================*/

            //Leather jacket
            new def.armour("upper", "Leather Jacket", "leatherSet", 1, 2, 40, "Basic jacket made of leather. You can be sure to gather some admiring looks with this piece. It however provides only minimal protection."),
            //Heavy leather
            new def.armour("upper", "Heavy Leather Jacket", "heavyLeatherSet", 2, 4, 50, "A good jacket for road rash, stopping knives etc. A good .38 slug will probably rip you to bits, however."),
            //Kevlar vest
            new def.armour("upper", "Kevlar Vest", "kevlarSet", 3, 6, 80, "You are sure to look like an bank robber if wear these over ripped T-shirt. Will probably block most .38 slugs."),
            //Kevlar jacket
            new def.armour("upper", "Kevlar Armor Jacket", "kevlarSet", 3.5, 8, 100, "Personal protection for the fashion conscious, these lightweight Kevlar jackets have nylon coverings that resemble normal jackets."),
            //Light armor jacket
            new def.armour("upper", "Light Armor Jacket", "lightSet", 4, 12, 140, "Light duty protection for the upper body, standard for most local defence forces."),
            //HEavy armor jacket
            new def.armour("upper", "Heavy Armor Jacket", "heavySet", 5, 16, 200, "Heavy duty protection for the upper body, standard for most local defence forces."),
            //Police upper
            new def.armour("upper", "C-Ballistic Mesh", "policeSet", 6, 18, 300, "Worn over Skin Tight body armor, this standard police armour provides good protection."),

            /*====================
            -----LOWER ARMOUR-----
            =====================*/

            //Leather pants
            new def.armour("lower", "Leather Pants", "leatherSet", 1, 2, 35, "Basic pants made of leather. These provide only minimal protection but at least you look cool in them."),
            //Heavy leather Pants
            new def.armour("lower", "Heavy Leather Pants", "heavyLeatherSet", 2, 4, 50, "Good pants for road rash, stopping knives etc. A good .38 slug will probably rip you to bits, however."),
            //Kevlar pants
            new def.armour("lower", "Kevlar Pants", "kevlarSet", 3, 8, 80, "Originally made for motorcyclists, these pants are proven to keep you safe from being dragged around the streets."),
            //Light armor pants
            new def.armour("lower", "Light Armor Pants", "lightSet", 4, 12, 130, "Light duty protection for the lower body, standard for most local defence forces."),
            //Heavy armor pants
            new def.armour("lower", "Heavy Armor Pants", "heavySet", 5, 16, 130, "Heavy duty protection for the lower body, standard for most military."),
            //Police lower body
            new def.armour("lower", "Riot Pads", "heavySet", 6, 18, 250, "Tested to 155 PSI, these pads are sure to keep your knees safe."),
        ]
    }
});
