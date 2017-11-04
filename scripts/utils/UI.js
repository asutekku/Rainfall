define(['utils', 'stats'], function (utils, stats) {
    return {
        updateUI: function (actor) {
            utils.l("charHP").textContent = actor.health + "/" + actor.maxHealth;
            utils.l("charLvl").textContent = actor.level;
            utils.l("kills").textContent = stats.player.kills;
            utils.l('charExp').textContent = actor.experience + "/" + actor.maxExperience;
            utils.l('charWeapon').textContent = actor.weapon.name;
            utils.l('weaponDesc').textContent = actor.weapon.description;
            utils.l('charWeaponDamage').textContent = (actor.weapon.damage + actor.weapon.diceThrows) + " - " + ((actor.weapon.diceThrows * 6) + actor.weapon.damage) + ' * ' + actor.weapon.rateOfFire;
            utils.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
            utils.l("charCRIT").textContent = actor.weapon.crit + "%";
            utils.l('currency').textContent = stats.player.money + "¥";
            utils.l('playerName').textContent = actor.name;
            utils.l('charGender').textContent = actor.gender;
            utils.l('charRole').textContent = actor.role;
            utils.l('charSkill').textContent = actor.ability;
            utils.l('skillDesc').textContent = actor.skillDesc;
            utils.l('charWeapon').textContent = actor.weapon.name;
            utils.l('weaponDesc').textContent = actor.weapon.description;
            utils.l('charWeaponDamage').textContent = (actor.weapon.damage + actor.weapon.diceThrows) + " - " + ((actor.weapon.diceThrows * 6) + actor.weapon.damage) + " * " + actor.weapon.rateOfFire;
            utils.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
            utils.l('charWeaponType').textContent = actor.weapon.weaponType;
            utils.l('armorStoppingPower').textContent = actor.armor + '%';
        }
    };
});
