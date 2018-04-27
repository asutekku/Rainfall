define(["require", "exports", "./utils"], function (require, exports, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function updateUI(actor) {
        utils_1.Utils.l("charHP").textContent = actor.health + "/" + actor.maxHealth;
        utils_1.Utils.l("charLvl").textContent = actor.level.toString();
        utils_1.Utils.l("kills").textContent = actor.kills.toString();
        utils_1.Utils.l('charExp').textContent = actor.experience + "/" + actor.maxExperience;
        utils_1.Utils.l('charWeapon').textContent = actor.weapon.name;
        utils_1.Utils.l('weaponDesc').textContent = actor.weapon.description;
        utils_1.Utils.l('charWeaponDamage').textContent = actor.weapon.damage + actor.weapon.diceThrows + " - " + ((actor.weapon.diceThrows * 6) + actor.weapon.damage) + " * " + actor.weapon.rateOfFire;
        utils_1.Utils.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
        utils_1.Utils.l("charCRIT").textContent = actor.weapon.crit + "%";
        utils_1.Utils.l('currency').textContent = actor.currency + "¥";
        utils_1.Utils.l('playerName').textContent = actor.name;
        utils_1.Utils.l('charGender').textContent = actor.gender;
        utils_1.Utils.l('charRole').textContent = actor.role.name;
        utils_1.Utils.l('charSkill').textContent = actor.role.skill;
        utils_1.Utils.l('skillDesc').textContent = actor.role.skillDescription;
        utils_1.Utils.l('charWeaponDamage').textContent = (actor.weapon.damage + actor.weapon.diceThrows) + " - " + ((actor.weapon.diceThrows * 6) + actor.weapon.damage) + " * " + actor.weapon.rateOfFire;
        utils_1.Utils.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
        utils_1.Utils.l('charWeaponType').textContent = actor.weapon.weaponType;
        utils_1.Utils.l('armorStoppingPower').textContent = actor.armor + '%';
        utils_1.Utils.l('playerPosition').textContent = actor.position.toString();
    }
    exports.updateUI = updateUI;
});
