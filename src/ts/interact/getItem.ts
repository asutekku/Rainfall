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
import { Medical } from "../items/Scrap";
import en_US from "./../../lang/en_US";

const Log = en_US.Log;

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
            Messages.logMessage(Log.findMoney, actor);
            actor.currency += money;
        } else {
            Messages.logMessage(Log.insufficientFunds, actor);
        }
    }

    static addItemToInventory(item: Item | Armor | Weapon | Medical, actor: Actor) {
        let multiple: boolean = !!actor.inventory[item.type!.toString()].find(
            i => i.id.toString() === item.id!.toString()
        );
        actor.inventory[item.type.toString()].push(item);
        const inventoryContainer: HTMLElement = document.getElementById("inventoryItems")!;
        if (inventoryContainer) {
            const invItemCount = document.getElementById(item.id.toString());
            if (!multiple) {
                let inventoryItem: HTMLElement = Paper.paperInventoryItem(item);
                if (inventoryContainer && State.UI.inventoryView === item.type) {
                    inventoryContainer.appendChild(inventoryItem);
                }
            } else if (invItemCount) {
                const itemCount = parseInt(invItemCount!.querySelector(".itemCount")!.textContent!, 10);
                invItemCount.querySelector(".itemCount")!.textContent = `${itemCount + 1}x`;
            }
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
            getItem.clearEquips(item);
            let equipDiv = document.getElementById(item.id)!.getElementsByClassName("itemEquipped")[0],
                equipWeapon = !item.equipped;
            equipDiv.textContent = !item.equipped ? "[Equipped]" : "";
            player.weapon = equipWeapon ? (item as Weapon) : getItem.getWeapon("weapon_fists");
            player.inventory.weapons.forEach(w => (w.equipped = false));
            item.equipped = equipWeapon;
        }
        if (item instanceof Armor) {
            let equipDiv = document.getElementById(item.id)!.getElementsByClassName("itemEquipped")[0],
                equipArmor = !item.equipped;
            getItem.clearEquips(item);
            equipDiv.textContent = !item.equipped ? "[Equipped]" : "";
            player.equipment[item.bodypart!] = equipArmor ? item : null;
            player.inventory.armor.filter(w => w.bodypart == item.bodypart).forEach(e => (e.equipped = false));
            item.equipped = equipArmor;
            UI.updateEquipment(item as Armor);
        }
        if (item.type === "medical") {
            player.health =
                player.health >= player.maxHealth ? player.maxHealth : (player.health += item.restorePoints!);
        } else {
            //actor.inventory.misc.push(item);
        }
        UI.updateUI();
    }
}
