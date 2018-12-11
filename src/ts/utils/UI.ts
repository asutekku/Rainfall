import {Utils} from "./utils";
import Stats from "../actors/resources/Stats";
import en_US from "../../lang/en_US";
import {State} from "./State";
import {Paper} from "./Paper";
import {Armor} from "../items/Armor";
import {Player} from "../actors/player";

const _ = Utils;
const statStrings = en_US.stats;
const playerStrings = en_US.player;

export class UI {
    static updateUI() {
        const actor: Player = State.player!;
        _.l("charHP")!.textContent = `${actor.health}/${actor.maxHealth}`;
        _.l("charLvl")!.textContent = actor.level.toString();
        _.l("kills")!.textContent = actor.kills.toString();
        _.l("charExp")!.textContent = actor.experience + "/" + actor.maxExperience;
        _.l("charWeapon")!.textContent = actor.weapon.name;
        _.l("weaponDesc")!.textContent = actor.weapon.description;
        _.l("charWeaponDamage")!.textContent = `${actor.weapon.damage + actor.weapon.diceThrows} - ${actor.weapon
            .diceThrows *
        6 +
        actor.weapon.damage} * ${actor.weapon.rateOfFire}`;
        _.l("charWeaponAccuracy")!.textContent = actor.weapon.accuracy + "%";
        _.l("charWeaponRange")!.textContent = actor.weapon.range + "m";
        _.l("charCRIT")!.textContent = `${actor.weapon.crit}%`;
        _.l("currency")!.textContent = actor.currency + "¥";
        _.l("playerName")!.textContent = actor.name;
        _.l("charGender")!.textContent = actor.gender;
        _.l("charRole")!.textContent = actor.role.name;
        _.l("charSkill")!.textContent = actor.role.skill;
        _.l("skillDesc")!.textContent = actor.role.skillDescription;
        _.l("charWeaponDamage")!.textContent = `${actor.weapon.averageDamage()}`;
        _.l("charWeaponAccuracy")!.textContent = actor.weapon.accuracy + "%";
        _.l("charWeaponType")!.textContent = actor.weapon.weaponType;
        _.l("armorStoppingPower")!.textContent = `${UI.getStoppingPower()}%`;
        _.l("playerPosition")!.textContent = actor.position.toString();
    }

    static updateExp(): void {
        const actor: Player = State.player!;
        _.l("charExp")!.textContent = actor.experience + "/" + actor.maxExperience;
    }

    static updateEquipment(armor: Armor) {
        let armorDesc = armor.equipped ? armor.description : (en_US.UI.armor as any)[`${armor.type!}DescEmpty`],
            armorStop = armor.equipped ? armor.stoppingPower.toString() : "0%";
        Utils.l(`${armor.bodypart}_equipped`)!.textContent = armor.equipped ? armor.name : en_US.UI.armor.empty;
        Utils.l(`${armor.bodypart}_equipped_desc`)!.textContent = `${armorDesc} / ${armorStop}`;
    }

    static getStoppingPower() {
        const player: Player = State.player!;
        return Object.entries(player.equipment)
            .filter(e => e[1])
            .map(e => {
                return e[1];
            })
            .reduce((acc: number, b) => acc + (b! as any).stoppingPower, 0);
    }

    static updateStats() {
        let actor: Player = State.player!;
        Utils.l("INT_val")!.textContent = actor.stats.int.toString();
        Utils.l("REF_val")!.textContent = actor.stats.ref.toString();
        Utils.l("COO_val")!.textContent = actor.stats.tech.toString();
        Utils.l("TEC_val")!.textContent = actor.stats.cl.toString();
        Utils.l("LUC_val")!.textContent = actor.stats.lk.toString();
        Utils.l("ATT_val")!.textContent = actor.stats.att.toString();
        Utils.l("MOV_val")!.textContent = actor.stats.ma.ma.toString();
        Utils.l("RUN_val")!.textContent = actor.stats.ma.run.toString() + "m";
        Utils.l("LEA_val")!.textContent = actor.stats.ma.leap.toString() + "m";
        Utils.l("EMP_val")!.textContent = actor.stats.emp.toString();
        Utils.l("HUM_val")!.textContent = actor.stats.hm.toString();
        Utils.l("BOD_val")!.textContent = actor.stats.bt.toString();
        Utils.l("BOD_val")!.textContent = actor.stats.btm.toString();
        Utils.l("SAV_val")!.textContent = actor.stats.sn.toString();
    }

    static Stats() {
        let statPane = Paper.paperContainer("", "infoAreaContainer", statStrings.stats);
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
            let ctx: CanvasRenderingContext2D = State.playArea.context!;
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
        _.l("infoAreaContainer")!.appendChild(map!);
    }

    static changeInfoPane(contentID: string) {
        let infoPane = document.getElementById("infoPane")!;
        Array.from(document.getElementsByClassName("sideBar")[0]!.childNodes)
            .filter(e => e.nodeName !== "#text")
            .forEach(e => (e as HTMLElement).classList.remove("buttonActiveSelection"));
        let pressedButton = document.getElementById(`${contentID}Button`)!;
        pressedButton.classList.add("buttonActiveSelection");
        infoPane.innerHTML = "";
        switch (contentID) {
            case "inventory":
                infoPane.appendChild(this.Inventory());
                UI.changeInventoryView(State.UI.inventoryView);
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
        let player: Player = State.player!;
        let element = Paper.paperContainer("playerInfo_container", "infoAreaContainer", "Player");
        let attributeContainer = function (): DocumentFragment {
            let frag = document.createDocumentFragment();
            let attributes = Paper.paperInfoContainer("attributes", "UIElement", "Info");
            frag.appendChild(attributes);
            let nameCard = Paper.paperStatCard(`${playerStrings.name}:`, player.name, "", "playerName");
            let genderCard = Paper.paperStatCard(`${playerStrings.gender}:`, player.gender, "", "charGender");
            let roleCard = Paper.paperStatCard(`${playerStrings.role}:`, player.role.name, "", "charRole");
            let skillCard = Paper.paperStatCard(
                `${playerStrings.skill}:`,
                player.role.skill!,
                player.role.skillDescription,
                "charSkill"
            );
            let levelCard = Paper.paperStatCard(`${playerStrings.level}:`, player.level.toString(), "", "charLvl");
            let expCard = Paper.paperStatCard(
                `${playerStrings.exp}:`,
                `${player.experience}/${player.maxExperience}`,
                "",
                "charExp"
            );
            let hpCard = Paper.paperStatCard(`${playerStrings.hp}:`, player.health.toString(), "", "charHP");
            let moneyCard = Paper.paperStatCard(`${playerStrings.money}:`, `${player.currency}¥`, "", "currency");
            attributes.appendChild(nameCard);
            attributes.appendChild(genderCard);
            attributes.appendChild(roleCard);
            attributes.appendChild(skillCard);
            attributes.appendChild(levelCard);
            attributes.appendChild(expCard);
            attributes.appendChild(hpCard);
            attributes.appendChild(moneyCard);
            return frag;
        };
        element.appendChild(attributeContainer());
        return element;
    }

    static Quests(): HTMLElement {
        return Paper.paperContainer("quest_container", "infoAreaContainer", "Quests");
    }

    static Inventory(): HTMLElement {
        let player: Player = State.player!;
        const categories = Object.keys(player.inventory);
        let element = Paper.paperContainer("inventory_container", "infoAreaContainer", "");
        let itemContainer = Paper.paperElement("inventoryItemContainer", "");
        let inventoryCategories = Paper.paperElement("inventoryCategories", "");
        let inventoryItemContainer = Paper.paperElement("inventoryItems", "");
        let itemInfoContainer = Paper.paperElement("itemInfoContainer", "");
        let itemStatsContainer = Paper.paperElement("itemStatsContainer", "");
        let itemExtraContainer = Paper.paperElement("itemExtraContainer", "");
        categories.map(cat => {
            let catItem = document.createElement("div");
            let catTitle = document.createElement("span");
            catTitle.classList.add("catTitle");
            catItem.setAttribute("class", "inventoryCategory");
            catItem.id = `${cat}Inventory`;
            catTitle.textContent = cat;
            inventoryCategories.appendChild(catItem);
            catItem.appendChild(catTitle);
            catItem.onclick = function () {
                State.UI.inventoryView = cat;
                UI.changeInventoryView(cat);
                UI.updateInventory();
            };
        });
        itemContainer.appendChild(inventoryCategories);
        itemContainer.appendChild(inventoryItemContainer);
        itemInfoContainer.appendChild(itemStatsContainer);
        itemInfoContainer.appendChild(itemExtraContainer);
        element.appendChild(itemContainer);
        element.appendChild(itemInfoContainer);
        return element;
    }

    static changeInventoryView(view: string) {
        State.UI.inventoryView = view;
        Array.from(document.getElementsByClassName("inventoryCategory")).forEach(item => {
            item.classList.remove("activeInventoryCategory");
        });
        document.getElementById(`${view}Inventory`)!.classList.add("activeInventoryCategory");
    }

    static updateInventory(): void {
        const player: Player = State.player!;
        const invArea = document.getElementById("inventoryItems");
        if (invArea) {
            while (invArea.firstChild) {
                invArea.removeChild(invArea.firstChild);
            }
            let inventoryViewItems = (player.inventory as any)[State.UI.inventoryView];
            let unique = [...new Set(inventoryViewItems)];
            unique.forEach((item: any) => {
                let inventoryItem = Paper.paperInventoryItem(item),
                    count = inventoryViewItems.reduce(function (n: number, val: number) {
                        return n + (val === item ? 1 : 0);
                    }, 0);
                if (item.equipped === true)
                    inventoryItem.getElementsByClassName("itemEquipped")[0].textContent = "[Equipped]";
                inventoryItem.getElementsByClassName("itemCount")[0].textContent = `${count}x`;
                invArea.appendChild(inventoryItem);
            });
        }
    }

    static addItemToInventory(): void {
    }

    static Store(): HTMLElement {
        return Paper.paperContainer("store_container", "infoAreaContainer", "Store");
    }

    static Raid(): HTMLElement {
        return Paper.paperContainer("raid_container", "infoAreaContainer", "Raid");
    }

    static Alliance(): HTMLElement {
        return Paper.paperContainer("alliance_container", "infoAreaContainer", "Alliance");
    }
}
