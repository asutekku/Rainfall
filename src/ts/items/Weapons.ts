import en_US from "../../lang/en_US";
let _ = en_US.weapons;
import { Weapon } from "./Weapon";

let weapons = [
    //BudgetArms C-13
    new Weapon(_.pistol, _.C13.name, 40, 1, 0, 1.1, 1, 8, 2, 1, 50, 75, _.C13.desc, _.C13.brand,_.C13.id),
    //Dai Lung Cybermag 15
    new Weapon(_.pistol, _.cybermag.name, 40, 2, 1, 3.1, 1, 8, 2, 1, 50, 75, _.cybermag.desc, _.cybermag.brand,_.cybermag.id),
    //Federated Arms x-22
    new Weapon(_.pistol, _.X22.name, 50, 1, 1, 3.7, 1, 8, 2, 1, 50, 150, _.X22.desc, _.X22.brand,_.X22.id),
    //Militech Arms Avenger
    new Weapon(_.pistol, _.avenger.name, 50, 1, 1, 22, 2, 10, 2, 1, 50, 250, _.avenger.desc, _.avenger.brand,_.avenger.id),
    //Dai Lung Streetmaster
    new Weapon(_.pistol, _.streetM.name, 50, 1, 3, 24, 2, 12, 2, 1, 50, 250, _.streetM.desc, _.streetM.brand,_.streetM.id),
    //Federated Arms X-9m
    new Weapon(_.pistol, _.X9M.name, 50, 1, 1, 4, 2, 12, 2, 1, 50, 300, _.X9M.desc, _.X9M.brand,_.X9M.id),
    //BudgetArms Auto 3
    new Weapon(_.pistol, _.auto3.name, 40, 1, 0, 6.5, 3, 8, 2, 1, 50, 350, _.auto3.desc, _.auto3.brand,_.auto3.id),
    //Sternmeyer Type 35
    new Weapon(_.pistol, _.type35.name, 50, 1, 0, 7, 3, 8, 2, 1, 50, 400, _.type35.desc, _.type35.brand,_.type35.id),
    //Armalite 44
    new Weapon(_.pistol, _.armalite44.name, 50, 1, 1, 34, 4, 8, 1, 1, 50, 450, _.armalite44.desc, _.armalite44.brand,_.armalite44.id),
    //Colt AMT Model 2000
    new Weapon(_.pistol, _.colt.name, 50, 1, 1, 6.1, 4, 8, 1, 1, 50, 500, _.colt.desc, _.colt.brand,_.colt.id),
    //Uzi Miniauto 9
    new Weapon(_.submachine, _.miniauto.name, 60, 1, 1, 1.2, 2, 30, 35, 1, 150, 475, _.miniauto.desc, _.miniauto.brand,_.miniauto.id),
    //H&K MP-2013
    new Weapon(_.submachine, _.MP2013.name, 60, 1, 3, 12, 2, 35, 32, 1, 150, 450, _.MP2013.desc, _.MP2013.brand,_.MP2013.id),
    //Fed. Arms Tech Assault II
    new Weapon(_.submachine, _.assault2.name, 60, 1, 1, 5, 1, 50, 25, 1, 150, 400, _.assault2.desc, _.assault2.brand,_.assault2.id),
    //Arasaka Minami 10
    new Weapon(_.submachine, _.minami10.name, 50, 1, 3, 21, 2, 40, 20, 1, 200, 500, _.minami10.desc, _.minami10.brand,_.minami10.id),
    //H&K MPK-9
    new Weapon(_.submachine, _.MPK9.name, 60, 1, 3, 15, 1, 35, 25, 1, 200, 520, _.MPK9.desc, _.MPK9.brand,_.MPK9.id),
    //Sternmeyer SMG-21
    new Weapon(_.submachine, _.SMG21.name, 40, 1, 0, 5, 3, 30, 15, 1, 200, 500, _.SMG21.desc, _.SMG21.brand,_.SMG21.id),
    //H&K MPK-11
    new Weapon(_.submachine, _.MPK11.name, 50, 1, 1, 3, 4, 30, 20, 1, 200, 700, _.MPK11.desc, _.MPK11.brand,_.MPK11.id),
    //Ingram MAC-14
    new Weapon(_.submachine, _.MAC14.name, 30, 1, 1, 5, 4, 20, 10, 1, 200, 650, _.MAC14.desc, _.MAC14.brand,_.MAC14.id),
    //Militech Ronin Light Assault
    new Weapon(_.assaultRifle, _.roninL.name, 60, 1, 0, 4, 5, 35, 30, 1, 400, 450, _.roninL.desc, _.roninL.brand,_.roninL.id),
    //AKR-20 Medium Assault
    new Weapon(_.assaultRifle, _.AKR20.name, 50, 1, 0, 4, 5, 30, 30, 1, 400, 500, _.AKR20.desc, _.AKR20.brand,_.AKR20.id),
    //FN-RAL Hvy. AR
    new Weapon(_.assaultRifle, _.FNRAL.name, 40, 1, 2, 4, 6, 35, 30, 1, 400, 600, _.FNRAL.desc, _.FNRAL.brand,_.FNRAL.id),
    //Kalishnikov A-80 Hvy. AR
    new Weapon(_.assaultRifle, _.A80.name, 40, 1, 2, 4, 6, 35, 25, 1, 400, 550, _.A80.desc, _.A80.brand,_.A80.id),
    //Arasaka Rapid Assault 12
    new Weapon(_.shotgun, _.RA12.name, 40, 1, 0, 4, 4, 20, 10, 1, 50, 900, _.RA12.desc, _.RA12.brand,_.RA12.id),
    //Sternmeyer Stakeout 10
    new Weapon(_.shotgun, _.stakeout.name, 30, 1, 0, 4, 4, 10, 2, 1, 50, 450, _.stakeout.desc, _.stakeout.brand,_.stakeout.id),
    //Club
    new Weapon(_.melee, _.club.name, 50, 1, 0, 4, 1, 1, 1, 1, 1, 0, _.club.desc, _.club.brand,_.club.id),
    //Spoon (why not)
    new Weapon(_.melee, _.spoon.name, 100, 1, 50, 50, 1, 1, 1, 1, 1, 0, _.spoon.desc, _.spoon.brand,_.spoon.id),
    //fists :D
    new Weapon(_.melee, _.fists.name, 100, 1, 5000, 10, 1, 1, 1, 1, 1, 0, _.fists.desc, _.fists.brand,_.fists.id)
];
export default weapons;
