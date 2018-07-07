import weapons from "../items/Weapons";
import items from "../items/items";
import {Utils} from "../utils/utils";
import armors from "../items/armors";
import {Messages} from "./messages";
import {UI} from "../utils/UI";
import {Paper} from "../utils/Paper";
import {State} from "../utils/State";
import {Weapon} from "../items/Weapon";
import {Actor} from "../actors/Actor";
import {Item} from "../items/Item";
import {Player} from "../actors/player";
import {Armor} from "../items/Armor";

export class getItem {
    static weapon() {
        return Utils.pickRandom(weapons);
    }

    static item() {
        let randomItem = Math.floor(Math.random() * 3);
        if (randomItem === 0) {
            return Utils.pickRandom(armors);
        } else if (randomItem === 1) {
            return Utils.pickRandom(weapons);
        } else if (randomItem === 2) {
            return Utils.pickRandom(items);
        }
    }

    static updateCurrency(money: number, actor: Actor, target: Actor) {
        if (money >= 0) {
            Messages.combat("getMoney", actor, target);
            actor.currency += money;
        } else {
            Messages.combat("noMoney", actor, target);
        }
    }

    static addItemToInventory(item: Item, actor: Actor) {
        let multiple: boolean = false;
        switch (item.type) {
            case "weapons":
                multiple = !!actor.inventory.weapons.find(invItem => invItem.id.toString() === (item as Weapon).id.toString());
                actor.inventory.weapons.push(item as Weapon);
                break;
            case "armor":
                actor.inventory.armor.push(item as Armor);
                break;
            case "medical":
                actor.inventory.medical.push(item);
                break;
            default:
                actor.inventory.misc.push(item);
                break;
        }
        let inventoryContainer = document.getElementById("inventoryItems")!;
        if (!multiple) {
            let inventoryItem: HTMLElement = Paper.paperInventoryItem(item);
            if (inventoryContainer && State.UI.inventoryView === item.type) {
                inventoryContainer.appendChild(inventoryItem);
            }
        } else {
            let invItemCount = document.getElementById(item.id!.toString())!.querySelector(".itemCount")!;
            invItemCount!.textContent = `${(parseInt(invItemCount.textContent!, 10) + 1).toString()}x`;
        }
    }

    static getWeapon(toGet: string): Weapon {
        return weapons.find(e => e.id === toGet)!;
    }

    static useItem(item: Item) {
        const player: Player = State.player!;
        switch (item.type) {
            case "weapons":
                if (!item.equipped) {
                    player.inventory.weapons.forEach(w => (w.equipped = false));
                    player.weapon = item as Weapon;
                    item.equipped = true;
                } else {
                    player.inventory.weapons.forEach(w => (w.equipped = false));
                    player.weapon = getItem.getWeapon("weapon_fists");
                    item.equipped = false;
                }
                break;
            case "armor":
                if (!item.equipped) {
                    player.inventory.armor.forEach(w => {
                        if (w.equipped && w.bodypart == item.bodypart) w.equipped = false;
                    });
                    (player.equipment as any)[item.bodypart!] = item;
                    item.equipped = true;
                } else {
                    player.inventory.armor.forEach(w => {
                        if (w.equipped && w.bodypart == item.bodypart) w.equipped = false;
                    });
                    (player.equipment as any)[item.bodypart!] = null;
                    item.equipped = false;
                }
                UI.updateEquipment(item as Armor);
                break;
            case "medical":
                player.health = player.health >= player.maxHealth ? player.maxHealth : player.health += item.restorePoints!;
                break;
            default:
                //actor.inventory.misc.push(item);
                break;
        }
        UI.updateUI();
    }
}
