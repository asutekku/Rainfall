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

    static Stats() {
        let statPane = Paper.paperContainer("", "infoAreaContainer", lang.stats);
        let stats = Paper.paperInfoContainer("attributes", "UIElement", "Skills");
        statPane.appendChild(stats);
        Stats.map(stat => {
            stats.appendChild(Paper.paperStatCard(`${stat.name}:`, "", stat.description));
        });
        return statPane;
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
        _.l("infoAreaContainer").appendChild(map);
    }

    static changeInfoPane(contentID: string) {
        let infoPane = document.getElementById("infoPane");
        infoPane.innerHTML = "";
        switch (contentID) {
            case "inventory":
                infoPane.appendChild(this.Inventory());
                break;
            case "quests":
                infoPane.appendChild(this.Quests());
                break;
            case "player":
                infoPane.appendChild(this.Player());
                break;
            case "store":
                infoPane.appendChild(this.Store());
                break;
            case "alliance":
                infoPane.appendChild(this.Alliance());
                break;
            case "raid":
                infoPane.appendChild(this.Raid());
                break;
            case "stats":
                infoPane.appendChild(this.Stats());
                break;
        }
    }

    static Player(): HTMLElement {
        let player = State.player;
        let element = Paper.paperContainer("playerInfo_container", "infoAreaContainer", "Player");
        let attributeContainer = function (): HTMLElement {
            let attributes = Paper.paperInfoContainer("attributes", "UIElement", "Info");
            let nameCard = Paper.paperStatCard("Name:", player.name, "", "playerName");
            let genderCard = Paper.paperStatCard("Gender:", player.gender, "", "charGender");
            let roleCard = Paper.paperStatCard("Role:", player.role.name, "", "charRole");
            let skillCard = Paper.paperStatCard("Skill:", player.role.skill, player.role.skillDescription, "charSkill");
            let levelCard = Paper.paperStatCard("Level:", player.level, "", "charLvl");
            let expCard = Paper.paperStatCard("Experience:", `${player.experience}/${player.maxExperience}`, "", "charExp");
            let hpCard = Paper.paperStatCard("Health points:", player.health, "", "charHP");
            let moneyCard = Paper.paperStatCard("Currency:", `${player.currency}¥`, "", "currency");
            attributes.append(nameCard, genderCard, roleCard, skillCard, levelCard, expCard, hpCard, moneyCard);
            return attributes;
        };
        element.appendChild(attributeContainer());
        return element;
    }

    static Quests(): HTMLElement {
        let element = Paper.paperContainer("quest_container", "infoAreaContainer", "Quests");
        return element;
    }

    static Inventory(): HTMLElement {
        const categories = ["Weapons","Armor","Misc"];
        let element = Paper.paperContainer("inventory_container", "infoAreaContainer", "");
        let itemContainer = Paper.paperElement("inventoryItemContainer","");
        let inventoryCategories = Paper.paperElement("inventoryCategories","");
        let inventoryItemContainer = Paper.paperElement("inventoryItems","");
        let itemInfoContainer = Paper.paperElement("itemInfoContainer","");
        categories.map(cat => {
            let catItem = document.createElement("div");
            catItem.setAttribute("class","inventoryCategory");
            catItem.textContent = cat;
            inventoryCategories.appendChild(catItem);
        });
        itemContainer.appendChild(inventoryCategories);
        itemContainer.appendChild(inventoryItemContainer);
        element.appendChild(itemContainer);
        element.appendChild(itemInfoContainer);
        return element;
    }

    static updateInventory(player):void {
        let inventoryState = State.UI.inventoryView;
        player.items.filter(item => item.type === inventoryState)
            .map(item => {
                let inventoryItem = Paper.paperInventoryItem(item.name);
                document.getElementById("inventoryItems").appendChild(inventoryItem);
        })
    }

    static Store(): HTMLElement {
        let element = Paper.paperContainer("store_container", "infoAreaContainer", "Store");
        return element;
    }

    static Raid(): HTMLElement {
        let element = Paper.paperContainer("raid_container", "infoAreaContainer", "Raid");
        return element;
    }

    static Alliance(): HTMLElement {
        let element = Paper.paperContainer("alliance_container", "infoAreaContainer", "Alliance");
        return element;
    }
}