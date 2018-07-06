import weapons from "../items/Weapons";
import items from "../items/items";
import {Utils} from "../utils/utils";
import armors from "../items/armors";
import {Messages} from "./messages";
import {UI} from "../utils/UI";
import {Paper} from "../utils/Paper";
import {State} from "../utils/State";

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
    }

    static useItem(item) {
        switch (item.type) {
            case "weapons":
                State.player.inventory.weapons.forEach(w => (w.equipped = false));
                State.player.weapon = item;
                item.equipped = true;
                break;
            case "armor":
                switch (item.bodypart) {
                    case "headgear":
                        State.player.inventory.armor.forEach(w => {
                            w.equipped = w.bodypart !== "headgear";
                        });
                        State.player.equipment.headgear = item;
                        item.equipped = true;
                        break;
                }
                UI.updateEquipment(item);
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
        UI.updateUI();
    }
}
