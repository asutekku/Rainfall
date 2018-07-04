import en_US from "../../lang/en_US";

let _ = en_US.weapons;
import { Weapon } from "./Weapon";

let weapons = [
    //BudgetArms C-13
    new Weapon(_.pistol, _.C13.name, 40, 1, 0, 1.1, 1, 8, 2, 1, 50, 75, _.C13.desc, _.C13.brand),
    //Dai Lung Cybermag 15
    new Weapon(_.pistol, _.cybermag.name, 40, 2, 1, 3.1, 1, 8, 2, 1, 50, 75, _.cybermag.desc, _.cybermag.brand),
    //Federated Arms x-22
    new Weapon(_.pistol, _.X22.name, 50, 1, 1, 3.7, 1, 8, 2, 1, 50, 150, _.X22.desc, _.X22.brand),
    //Militech Arms Avenger
    new Weapon(_.pistol, _.avenger.name, 50, 1, 1, 22, 2, 10, 2, 1, 50, 250, _.avenger.desc, _.avenger.brand),
    //Dai Lung Streetmaster
    new Weapon(
        _.pistol,
        _.streetmaster.name,
        50,
        1,
        3,
        24,
        2,
        12,
        2,
        1,
        50,
        250,
        _.streetmaster.desc,
        _.streetmaster.brand
    ),
    //Federated Arms X-9m
    new Weapon(_.pistol, _.X9M.name, 50, 1, 1, 4, 2, 12, 2, 1, 50, 300, _.X9M.desc, _.X9M.brand),
    //BudgetArms Auto 3
    new Weapon(_.pistol, _.auto3.name, 40, 1, 0, 6.5, 3, 8, 2, 1, 50, 350, _.auto3.desc, _.auto3.brand),
    //Sternmeyer Type 35
    new Weapon(_.pistol, _.type35.name, 50, 1, 0, 7, 3, 8, 2, 1, 50, 400, _.type35.desc, _.type35.brand),
    //Armalite 44
    new Weapon(_.pistol, _.armalite44.name, 50, 1, 1, 34, 4, 8, 1, 1, 50, 450, _.armalite44.desc, _.armalite44.brand),
    //Colt AMT Model 2000
    new Weapon(_.pistol, _.colt.name, 50, 1, 1, 6.1, 4, 8, 1, 1, 50, 500, _.colt.desc, _.colt.brand),
    //Uzi Miniauto 9
    new Weapon(_.submachine, _.miniauto.name, 60, 1, 1, 1.2, 2, 30, 35, 1, 150, 475, _.miniauto.desc, _.miniauto.brand),
    //H&K MP-2013
    new Weapon(_.submachine, _.MP2013.name, 60, 1, 3, 12, 2, 35, 32, 1, 150, 450, _.MP2013.desc, _.MP2013.brand),
    //Fed. Arms Tech Assault II
    new Weapon(_.submachine, _.assault2.name, 60, 1, 1, 5, 1, 50, 25, 1, 150, 400, _.assault2.desc, _.assault2.brand),
    //Arasaka Minami 10
    new Weapon(_.submachine, _.minami10.name, 50, 1, 3, 21, 2, 40, 20, 1, 200, 500, _.minami10.desc, _.minami10.brand),
    //H&K MPK-9
    new Weapon(_.submachine, _.MPK9.name, 60, 1, 3, 15, 1, 35, 25, 1, 200, 520, _.MPK9.desc, _.MPK9.brand),
    //Sternmeyer SMG-21
    new Weapon(_.submachine, _.SMG21.name, 40, 1, 0, 5, 3, 30, 15, 1, 200, 500, _.SMG21.desc, _.SMG21.brand),
    //H&K MPK-11
    new Weapon(_.submachine, _.MPK11.name, 50, 1, 1, 3, 4, 30, 20, 1, 200, 700, _.MPK11.desc, _.MPK11.brand),
    //Ingram MAC-14
    new Weapon(_.submachine, _.MAC14.name, 30, 1, 1, 5, 4, 20, 10, 1, 200, 650, _.MAC14.desc, _.MAC14.brand),

    /*====================
      -----ASSAULT RIFLE----
      =====================*/

    //Militech Ronin Light Assault
    new Weapon(
        _.assaultRifle,
        "Militech Ronin Light Assault",
        60,
        1,
        0,
        4,
        5,
        35,
        30,
        1,
        400,
        450,
        "A light, all purpose update, similar to the M-16B."
    ),
    //AKR-20 Medium Assault
    new Weapon(
        _.assaultRifle,
        "AKR-20 Medium Assault",
        50,
        1,
        0,
        4,
        5,
        30,
        30,
        1,
        400,
        500,
        "A plastic and carbon fiber update of the AKM, distributed throughout the remains of the Soviet bloc."
    ),
    //FN-RAL Hvy. AR
    new Weapon(
        _.assaultRifle,
        "FN-RAL Hvy. AR",
        40,
        1,
        2,
        4,
        6,
        35,
        30,
        1,
        400,
        600,
        "The standard NATO assault weapon for battlefield work. Bullpup design, collapsing stock."
    ),
    //Kalishnikov A-80 Hvy. AR
    new Weapon(
        _.assaultRifle,
        "Kalishnikov A-80 Hvy. AR",
        40,
        1,
        2,
        4,
        6,
        35,
        25,
        1,
        400,
        550,
        "Another Soviet retread, with improved sighting and lightened with composites."
    ),

    /*====================
      -------SHOTGUNS-------
      =====================*/

    //Arasaka Rapid Assault 12
    new Weapon(
        _.shotgun,
        "Arasaka Rapid Assault 12",
        40,
        1,
        0,
        4,
        4,
        20,
        10,
        1,
        50,
        900,
        "A high powered auto-shotgun with lethal firepower. Used by Arasaka worldwide. Another good reason to avoid the Boys in Black."
    ),
    //Sternmeyer Stakeout 10
    new Weapon(
        _.shotgun,
        "Sternmeyer Stakeout 10",
        30,
        1,
        0,
        4,
        4,
        10,
        2,
        1,
        50,
        450,
        "Light duty stakeout shotgun, used by city police departments."
    ),

    /*====================
      ---------MELEE--------
      =====================*/

    //Club
    new Weapon(
        _.melee,
        "Club",
        50,
        1,
        0,
        4,
        1,
        1,
        1,
        1,
        1,
        0,
        "Made from scraps of a makeshift house, this club has been proved to be great in close combat."
    ),
    //Spoon (why not)
    new Weapon(_.melee, "Spoon", 100, 1, 50, 50, 1, 1, 1, 1, 1, 0, "So many eyes have been couged with this.")
];
export default weapons;
