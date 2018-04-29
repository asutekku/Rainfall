import {Utils} from "./utils";
import {Actor} from "../actors/Actor";
import Stats from "../actors/resources/Stats";
import {stat_en_US} from "../../lang/en_US";
let _ = Utils;
let lang = stat_en_US;

export function updateUI(actor: Actor) {
    _.l("charHP").textContent = `${actor.health}/${actor.maxHealth}`;
    _.l("charLvl").textContent = actor.level.toString();
    _.l("kills").textContent = actor.kills.toString();
    _.l('charExp').textContent = actor.experience + "/" + actor.maxExperience;
    _.l('charWeapon').textContent = actor.weapon.name;
    _.l('weaponDesc').textContent = actor.weapon.description;
    _.l('charWeaponDamage').textContent = `${actor.weapon.damage + actor.weapon.diceThrows} - ${(actor.weapon.diceThrows * 6) + actor.weapon.damage} * ${actor.weapon.rateOfFire}`;
    _.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
    _.l("charCRIT").textContent = `${actor.weapon.crit}%`;
    _.l('currency').textContent = actor.currency + "¥";
    _.l('playerName').textContent = actor.name;
    _.l('charGender').textContent = actor.gender;
    _.l('charRole').textContent = actor.role.name;
    _.l('charSkill').textContent = actor.role.skill;
    _.l('skillDesc').textContent = actor.role.skillDescription;
    _.l('charWeaponDamage').textContent = (actor.weapon.damage + actor.weapon.diceThrows) + " - " + ((actor.weapon.diceThrows * 6) + actor.weapon.damage) + " * " + actor.weapon.rateOfFire;
    _.l('charWeaponAccuracy').textContent = actor.weapon.accuracy + '%';
    _.l('charWeaponType').textContent = actor.weapon.weaponType;
    _.l('armorStoppingPower').textContent = actor.armor + '%';
    _.l('playerPosition').textContent = actor.position.toString();
}

export function updateStats(actor: Actor) {
    Utils.l("INTval").textContent = actor.stats.int.toString();
    Utils.l("REFval").textContent = actor.stats.ref.toString();
    Utils.l("CLval").textContent = actor.stats.tech.toString();
    Utils.l("TECHval").textContent = actor.stats.cl.toString();
    Utils.l("LKval").textContent = actor.stats.lk.toString();
    Utils.l("ATTval").textContent = actor.stats.att.toString();
    Utils.l("MAval").textContent = actor.stats.ma.ma.toString();
    Utils.l("RUNval").textContent = actor.stats.ma.run.toString() + "m";
    Utils.l("LEAPval").textContent = actor.stats.ma.leap.toString() + "m";
    Utils.l("EMPval").textContent = actor.stats.emp.toString();
    Utils.l("HMval").textContent = actor.stats.hm.toString();
    Utils.l("BTval").textContent = actor.stats.bt.toString();
    Utils.l("BTMval").textContent = actor.stats.btm.toString();
    Utils.l("SNval").textContent = actor.stats.sn.toString();
}

export function initStats() {
    let statPane = document.createElement("div");
    let statHeader = document.createElement("h2");
    let statColumn = Utils.create("div");
    statColumn.classList.add("statColumn");
    statPane.appendChild(statColumn);
    statHeader.textContent = stat_en_US.stats;
    statHeader.classList.add("statTitle","vital");
    statPane.id = "playareaStats";
    statPane.classList.add("UIelement");
    _.l("playpane").insertAdjacentElement('afterbegin', statPane);
    statColumn.appendChild(statHeader);
    for (let i = 0; i < Stats.length; i++) {
        let statCard = _.create("div");
        let tooltiptext = _.create("span");
        let statTitle = _.create("span");
        let statValue = _.create("span");
        statCard.classList.add("statCard","tooltip");
        tooltiptext.classList.add("tooltiptext");
        tooltiptext.id = `${Stats[i].short}desc`;
        tooltiptext.textContent = Stats[i].description;
        statTitle.classList.add("statTitle");
        statTitle.textContent = `${Stats[i].name}:`;
        statValue.classList.add("stat");
        statValue.id = `${Stats[i].short}val`;
        statColumn.appendChild(statCard);
        statCard.appendChild(tooltiptext);
        statCard.appendChild(statTitle);
        statCard.appendChild(statValue);
    }
}