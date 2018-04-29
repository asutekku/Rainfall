import {weapons_en_US} from '../../lang/en_US';

let _ = weapons_en_US;
import {Weapon} from "./Weapon";

let weapons = [
    /*====================
    --------PISTOLS-------
    =====================*/

    //BudgetArms C-13
    new Weapon(_.pistol, _.budgetArms, 40, 1, 0, 1.1, 1, 8, 2, 1, 50, 75, _.budgetArmsDesc),
    //Dai Lung Cybermag 15
    new Weapon(_.pistol, _.daiLungCybermag, 40, 2, 1, 3.1, 1, 8, 2, 1, 50, 75, _.daiLungCybermagDesc),
    //Federated Arms x-22
    new Weapon(_.pistol, _.federatedArms, 50, 1, 1, 3.7, 1, 8, 2, 1, 50, 150, _.federatedArmsDesc),
    //Militech Arms Avenger
    new Weapon(_.pistol, _.militechScavenger, 50, 1, 1, 22, 2, 10, 2, 1, 50, 250, _.militechScavengerDesc),
    //Dai Lung Streetmaster
    new Weapon(_.pistol, _.daiLungStreetmaster, 50, 1, 3, 24, 2, 12, 2, 1, 50, 250, _.daiLungStreetmasterDesc),
    //Federated Arms X-9m
    new Weapon(_.pistol, _.x9m, 50, 1, 1, 4, 2, 12, 2, 1, 50, 300, _.x9mDesc),
    //BudgetArms Auto 3
    new Weapon(_.pistol, _.auto3, 40, 1, 0, 6.5, 3, 8, 2, 1, 50, 350, _.auto3Desc),
    //Sternmeyer Type 35
    new Weapon(_.pistol, _.sternmeyer35, 50, 1, 0, 7, 3, 8, 2, 1, 50, 400, _.sternmeyer35Desc),
    //Armalite 44
    new Weapon(_.pistol, _.armalite, 50, 1, 1, 34, 4, 8, 1, 1, 50, 450, _.armaliteDesc),
    //Colt AMT Model 2000
    new Weapon(_.pistol, _.colt, 50, 1, 1, 6.1, 4, 8, 1, 1, 50, 500, _.coltDesc),

    /*====================
    ----SUBMACHINE GUNS---
    =====================*/

    //Uzi Miniauto 9
    new Weapon(_.submachine, "Uzi Miniauto 9", 60, 1, 1, 1.2, 2, 30, 35, 1, 150, 475, "Uzi's entry into the 21st century, all plastic, with rotary electric clip and adjustable trigger. The choice for many security solos."),
    //H&K MP-2013
    new Weapon(_.submachine, "H&K MP-2013", 60, 1, 3, 12, 2, 35, 32, 1, 150, 450, "Heckler & Koch's updating of the MP-5K classic, with compud plastics and build in silencing."),
    //Fed. Arms Tech Assault II
    new Weapon(_.submachine, "Fed. Arms Tech Assault II", 60, 1, 1, 5, 1, 50, 25, 1, 150, 400, "An updated version of the venerable Tech Assault I, features larger clip, better autofire, no melting. Honest."),
    //Arasaka Minami 10
    new Weapon(_.submachine, "Arasaka Minami 10", 50, 1, 3, 21, 2, 40, 20, 1, 200, 500, "The standard Arasaka Security weapon, found worldwide. A good, all around weapon."),
    //H&K MPK-9
    new Weapon(_.submachine, "Fed. Arms Tech Assault II", 60, 1, 3, 15, 1, 35, 25, 1, 200, 520, "A light composite Submachine gun with integral sights. Used by many Euro solos."),
    //Sternmeyer SMG-21
    new Weapon(_.submachine, "Sternmeyer SMG-21", 40, 1, 0, 5, 3, 30, 15, 1, 200, 500, "Sternmeyer's best entry in the anti-terrorist category, with wide use on C-SWAT teams and PsychoSquads."),
    //H&K MPK-11
    new Weapon(_.submachine, "H&K MPK-11", 50, 1, 1, 3, 4, 30, 20, 1, 200, 700, "Possibly the most used Solo's gun in existence, the MPK-11 can be modified into four different designs, including a bullpup configuration, standard SMG, an assault carbine and a grenade launcher mount."),
    //Ingram MAC-14
    new Weapon(_.submachine, "Ingram MAC-14", 30, 1, 1, 5, 4, 20, 10, 1, 200, 650, "Updated MAC-10, with composite body and cylindrical feeding magazine."),

    /*====================
    -----ASSAULT RIFLE----
    =====================*/

    //Militech Ronin Light Assault
    new Weapon(_.assaultRifle, "Militech Ronin Light Assault", 60, 1, 0, 4, 5, 35, 30, 1, 400, 450, "A light, all purpose update, similar to the M-16B."),
    //AKR-20 Medium Assault
    new Weapon(_.assaultRifle, "AKR-20 Medium Assault", 50, 1, 0, 4, 5, 30, 30, 1, 400, 500, "A plastic and carbon fiber update of the AKM, distributed throughout the remains of the Soviet bloc."),
    //FN-RAL Hvy. AR
    new Weapon(_.assaultRifle, "FN-RAL Hvy. AR", 40, 1, 2, 4, 6, 35, 30, 1, 400, 600, "The standard NATO assault weapon for battlefield work. Bullpup design, collapsing stock."),
    //Kalishnikov A-80 Hvy. AR
    new Weapon(_.assaultRifle, "Kalishnikov A-80 Hvy. AR", 40, 1, 2, 4, 6, 35, 25, 1, 400, 550, "Another Soviet retread, with improved sighting and lightened with composites."),

    /*====================
    -------SHOTGUNS-------
    =====================*/

    //Arasaka Rapid Assault 12
    new Weapon(_.shotgun, "Arasaka Rapid Assault 12", 40, 1, 0, 4, 4, 20, 10, 1, 50, 900, "A high powered auto-shotgun with lethal firepower. Used by Arasaka worldwide. Another good reason to avoid the Boys in Black."),
    //Sternmeyer Stakeout 10
    new Weapon(_.shotgun, "Sternmeyer Stakeout 10", 30, 1, 0, 4, 4, 10, 2, 1, 50, 450, "Light duty stakeout shotgun, used by city police departments."),

    /*====================
    ---------MELEE--------
    =====================*/

    //Club
    new Weapon(_.melee, "Club", 50, 1, 0, 4, 1, 1, 1, 1, 1, 0, "Made from scraps of a makeshift house, this club has been proved to be great in close combat."),
    //Spoon (why not)
    new Weapon(_.melee, "Spoon", 100, 1, 50, 50, 1, 1, 1, 1, 1, 0, "So many eyes have been couged with this."),
];
export default weapons;
