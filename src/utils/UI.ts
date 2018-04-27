import {Utils} from "./utils";
import {Actor} from "../actors/Actor";

export function updateUI(actor:Actor) {
    Utils.l("charHP").textContent = `${actor.health}/${actor.maxHealth}`;
    Utils.l("charLvl").textContent = actor.level.toString();
    Utils.l("kills").textContent = actor.kills.toString();
    Utils.l('charExp').textContent = actor.experience + "/" + actor.maxExperience;
    Utils.l('charWeapon').textContent = actor.weapon.name;
    Utils.l('weaponDesc').textContent = actor.weapon.description;
    Utils.l('charWeaponDamage').textContent = `${actor.weapon.damage + actor.weapon.diceThrows} - ${(actor.weapon.diceThrows * 6) + actor.weapon.damage} * ${actor.weapon.rateOfFire}`;
    Utils.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
    Utils.l("charCRIT").textContent = `${actor.weapon.crit}%`;
    Utils.l('currency').textContent = actor.currency + "¥";
    Utils.l('playerName').textContent = actor.name;
    Utils.l('charGender').textContent = actor.gender;
    Utils.l('charRole').textContent = actor.role.name;
    Utils.l('charSkill').textContent = actor.role.skill;
    Utils.l('skillDesc').textContent = actor.role.skillDescription;
    Utils.l('charWeaponDamage').textContent = (actor.weapon.damage + actor.weapon.diceThrows) + " - " + ((actor.weapon.diceThrows * 6) + actor.weapon.damage) + " * " + actor.weapon.rateOfFire;
    Utils.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
    Utils.l('charWeaponType').textContent = actor.weapon.weaponType;
    Utils.l('armorStoppingPower').textContent = actor.armor + '%';
    Utils.l('playerPosition').textContent = actor.position.toString();
}

