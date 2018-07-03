import {Utils} from "./utils";
import {Actor} from "../actors/Actor";
import Stats from "../actors/resources/Stats";
import {stat_en_US} from "../../lang/en_US";
import {State} from "./State";
import {Paper} from "./Paper";

let _ = Utils;
let lang = stat_en_US;

export class UI {
    static updateUI(actor: Actor) {
        _.l("charHP").textContent = `${actor.health}/${actor.maxHealth}`;
        _.l("charLvl").textContent = actor.level.toString();
        _.l("kills").textContent = actor.kills.toString();
        _.l("charExp").textContent = actor.experience + "/" + actor.maxExperience;
        _.l("charWeapon").textContent = actor.weapon.name;
        _.l("weaponDesc").textContent = actor.weapon.description;
        _.l("charWeaponDamage").textContent = `${actor.weapon.damage +
        actor.weapon.diceThrows} - ${actor.weapon.diceThrows * 6 +
        actor.weapon.damage} * ${actor.weapon.rateOfFire}`;
        _.l("charWeaponAccuracy").textContent = actor.weapon.accuracy + "%";
        _.l("charWeaponRange").textContent = actor.weapon.range + "m";
        _.l("charCRIT").textContent = `${actor.weapon.crit}%`;
        _.l("currency").textContent = actor.currency + "¥";
        _.l("playerName").textContent = actor.name;
        _.l("charGender").textContent = actor.gender;
        _.l("charRole").textContent = actor.role.name;
        _.l("charSkill").textContent = actor.role.skill;
        _.l("skillDesc").textContent = actor.role.skillDescription;
        _.l("charWeaponDamage").textContent =
            actor.weapon.damage +
            actor.weapon.diceThrows +
            " - " +
            (actor.weapon.diceThrows * 6 + actor.weapon.damage) +
            " * " +
            actor.weapon.rateOfFire;
        _.l("charWeaponAccuracy").textContent = actor.weapon.accuracy + "%";
        _.l("charWeaponType").textContent = actor.weapon.weaponType;
        _.l("armorStoppingPower").textContent = actor.armor + "%";
        _.l("playerPosition").textContent = actor.position.toString();
    }

    static updateStats(actor: Actor) {
        Utils.l("INT_val").textContent = actor.stats.int.toString();
        Utils.l("REF_val").textContent = actor.stats.ref.toString();
        Utils.l("COO_val").textContent = actor.stats.tech.toString();
        Utils.l("TEC_val").textContent = actor.stats.cl.toString();
        Utils.l("LUC_val").textContent = actor.stats.lk.toString();
        Utils.l("ATT_val").textContent = actor.stats.att.toString();
        Utils.l("MOV_val").textContent = actor.stats.ma.ma.toString();
        Utils.l("RUN_val").textContent = actor.stats.ma.run.toString() + "m";
        Utils.l("LEA_val").textContent = actor.stats.ma.leap.toString() + "m";
        Utils.l("EMP_val").textContent = actor.stats.emp.toString();
        Utils.l("HUM_val").textContent = actor.stats.hm.toString();
        Utils.l("BOD_val").textContent = actor.stats.bt.toString();
        Utils.l("BOD_val").textContent = actor.stats.btm.toString();
        Utils.l("SAV_val").textContent = actor.stats.sn.toString();
    }

    static statPane() {
        let statPane = Paper.paperContainer("playareaStats", "", lang.stats);
        let statColumn = Utils.create("div");
        statColumn.classList.add("statColumn");
        statColumn.id = "statColumn1";
        statPane.appendChild(statColumn);
        Stats.map(stat => {
            statColumn.appendChild(Paper.paperStatCard(`${stat.name}:`, "", stat.description));
        });
        document.getElementById("infoPane").appendChild(statPane);
    }

    static initMap() {
        let map = State.playArea.canvas;
        let height = -(State.playArea.height / 2);
        let width = -(State.playArea.width / 2);
        let linesY = State.playArea.height / 20;
        let linesX = State.playArea.width / 20;
        for (let i = 0; i < linesY; i++) {
            let ctx = State.playArea.context;
            ctx.strokeStyle = "#13120e";
            ctx.beginPath();
            ctx.moveTo(-(State.playArea.width / 2), height);
            ctx.lineTo(State.playArea.width, height);
            ctx.stroke();
            ctx.moveTo(width, -(State.playArea.height / 2));
            ctx.lineTo(width, State.playArea.height);
            ctx.stroke();
            height += linesY;
            width += linesX;
        }
        _.l("playareaStats").appendChild(map);
    }
}