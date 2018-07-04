import weapons from "../items/Weapons";
import items from "../items/items";
import {Utils} from "../utils/utils";
import armors from "../items/armors";
import {Messages} from "./messages";
import {Statistics} from "../actors/resources/Statistics";
import {UI} from "../utils/UI";
import {Paper} from "../utils/Paper";
import {State} from "../utils/State";
import {Item} from "../items/Item";

let itemID = 0;
let element = document.getElementById(":hover");

export class getItem {
    static weapon() {
        return Utils.pickRandom(weapons);
    }

    static item() {
        let randomItem = Math.floor(Math.random() * 4);
        switch (randomItem) {
            case 0:
                return Utils.pickRandom(armors);
            case 1:
                return Utils.pickRandom(weapons);
            case 2:
                return Utils.pickRandom(items);
            case 3:
                return Utils.pickRandom(items);
        }
    }

    static updateCurrency(money, actor, target) {
        if (money >= 0) {
            Messages.combat("getMoney", actor, target);
            actor.currency += money;
        } else {
            Messages.combat("noMoney", actor, target);
        }
    }

    static addItemToInventory(item, actor) {
        console.log(item.type);
        switch (item.type) {
            case "weapons":
                actor.inventory.weapons.push(item);
                break;
            case "armor":
                actor.inventory.armor.push(item);
                break;
            case "medical":
                actor.inventory.medical.push(item);
                break;
            default:
                actor.inventory.misc.push(item);
                break;
        }
        //UI.updateInventory(actor);
        let inventoryItem = Paper.paperInventoryItem(item);
        let ul = document.getElementById("inventoryItems");
        if (State.UI.inventoryView === item.type) {
            ul.appendChild(inventoryItem);
        }
        //let inventoryItem = document.createElement("li");
        //inventoryItem.innerHTML = text + " - " + item.price + "¥";
        /*inventoryItem.onclick = function () {
            if (actor.health != 0) {
                //this.parentNode.removeChild(this);
                if (item.type == "medical") {
                    actor.health += item.restorePoints;
                    if (actor.health >= actor.maxHealth) {
                        actor.health = actor.maxHealth;
                    }
                } else {
                    Statistics.money += item.price;
                }
                UI.updateUI(actor);
            }
        };
        if (ul.childElementCount == 0) {
            ul.appendChild(inventoryItem);
        } else {
            ul.insertBefore(inventoryItem, ul.firstChild);
        }*/
    }

    static useItem(item) {
        switch (item.type) {
            case "weapons":
                State.player.weapon = item;
                UI.updateUI(State.player);
            case "armor":
                //actor.inventory.armor.push(item);
                break;
            case "medical":
                State.player.health += item.restorePoints;
                if (State.player.health >= State.player.maxHealth) {
                    State.player.health = State.player.maxHealth;
                }
                break;
            default:
                //actor.inventory.misc.push(item);
                break;
        }
    }
}
