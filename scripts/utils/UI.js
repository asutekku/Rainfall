define(['utils'], function (utils) {
    return {
        updateUI: function (actor) {
            utils.l("charHP").textContent = actor.health + "/" + actor.maxHealth;
            utils.l("charLvl").textContent = actor.level;
            utils.l("kills").textContent = actor.kills;
            utils.l('charExp').textContent = actor.experience + "/" + actor.maxExperience;
            utils.l('charWeapon').textContent = actor.weapon.name;
            utils.l('weaponDesc').textContent = actor.weapon.description;
            utils.l('charWeaponDamage').textContent = (actor.weapon.damage + actor.weapon.diceThrows) + " - " + ((actor.weapon.diceThrows * 6) + actor.weapon.damage) + ' * ' + actor.weapon.rateOfFire;
            utils.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
            utils.l("charCRIT").textContent = actor.weapon.crit + "%";
            utils.l('currency').textContent = actor.currency + "¥";
            utils.l('playerName').textContent = actor.name;
            utils.l('charGender').textContent = actor.gender;
            utils.l('charRole').textContent = actor.role.name;
            utils.l('charSkill').textContent = actor.role.skill;
            utils.l('skillDesc').textContent = actor.role.skillDescription;
            utils.l('charWeaponDamage').textContent = (actor.weapon.damage + actor.weapon.diceThrows) + " - " + ((actor.weapon.diceThrows * 6) + actor.weapon.damage) + " * " + actor.weapon.rateOfFire;
            utils.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
            utils.l('charWeaponType').textContent = actor.weapon.weaponType;
            utils.l('armorStoppingPower').textContent = actor.armor + '%';
            utils.l('playerPosition').textContent = actor.position;
        }
    };
});
