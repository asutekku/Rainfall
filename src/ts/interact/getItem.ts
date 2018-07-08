import Equipment from "../items/Equipment";
import items from "../items/items";
import { Utils } from "../utils/utils";
import armors from "../items/armors";
import { Messages } from "./messages";
import { UI } from "../utils/UI";
import { Paper } from "../utils/Paper";
import { State } from "../utils/State";
import { Weapon } from "../items/Weapon";
import { Actor } from "../actors/Actor";
import { Item } from "../items/Item";
import { Player } from "../actors/player";
import { Armor } from "../items/Armor";

const weapons = Equipment.weapons;

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
                multiple = !!actor.inventory.weapons.find(
                    invItem => invItem.id.toString() === (item as Weapon).id.toString()
                );
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

    static clearEquips(item: Item): void {
        if (item instanceof Armor) {
            Array.from(document.getElementsByClassName("inventoryItem")).forEach(e => {
                if (e.classList.contains(`${item.bodypart}_node`)) {
                    e.getElementsByClassName("itemEquipped")[0].textContent = "";
                }
            });
        } else {
            Array.from(document.getElementsByClassName("inventoryItem")).forEach(e => {
                e.getElementsByClassName("itemEquipped")[0].textContent = "";
            });
        }
    }

    static useItem(item: Item) {
        const player: Player = State.player!;
        if (item instanceof Weapon) {
            player.inventory.weapons.forEach(w => (w.equipped = false));
            getItem.clearEquips(item);
            if (!item.equipped) {
                player.weapon = item as Weapon;
                document.getElementById(item.id)!.getElementsByClassName("itemEquipped")[0].textContent = "[Equipped]";
                item.equipped = true;
            } else {
                player.weapon = getItem.getWeapon("weapon_fists");
                item.equipped = false;
            }
        } else if (item instanceof Armor) {
            player.inventory.armor.forEach(w => {
                if (w.equipped && w.bodypart == item.bodypart) w.equipped = false;
            });
            getItem.clearEquips(item);
            if (!item.equipped) {
                document.getElementById(item.id)!.getElementsByClassName("itemEquipped")[0].textContent = "[Equipped]";
                (player.equipment as any)[item.bodypart!] = item;
                item.equipped = true;
            } else {
                (player.equipment as any)[item.bodypart!] = null;
                item.equipped = false;
            }
            UI.updateEquipment(item as Armor);
        } else if (item.type === "medical") {
            player.health =
                player.health >= player.maxHealth ? player.maxHealth : (player.health += item.restorePoints!);
        } else {
            //actor.inventory.misc.push(item);
        }
        UI.updateUI();
    }
}
