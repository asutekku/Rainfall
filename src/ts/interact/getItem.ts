import {Actor} from "../actors/Actor";
import {Player} from "../actors/player";
import {Armor} from "../items/Armor";
import armors from "../items/armors";
import Equipment from "../items/Equipment";
import {Item} from "../items/Item";
import items from "../items/items";
import {Medical} from "../items/Scrap";
import {Weapon} from "../items/Weapon";
import {State} from "../utils/State";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {Messages} from "./messages";

const Log = en_US.Log;

const weapons = Equipment.weapons;

export class GetItem {
    public static weapon(name?: string): Weapon {
        if (name) {
            return weapons.find((e) => e.name === name)!;
        } else {
            return Utils.pickRandom(weapons);
        }
    }

    public static item() {
        const randomItem = Math.floor(Math.random() * 3);
        if (randomItem === 0) {
            return Utils.pickRandom(armors);
        } else if (randomItem === 1) {
            return Utils.pickRandom(weapons);
        } else if (randomItem === 2) {
            return Utils.pickRandom(items);
        }
    }

    public static updateCurrency(money: number, actor: Actor) {
        if (money >= 0) {
            Messages.logMessage(Log.findMoney, actor);
            actor.currency += money;
        } else {
            Messages.logMessage(Log.insufficientFunds, actor);
        }
    }

    public static addItemToInventory(item: Item | Armor | Weapon | Medical, actor: Actor) {
        const multiple: boolean = !!actor.inventory[item.type!.toString()].find(
            (i) => i.name.toString() === item.name!.toString(),
        );
        actor.inventory[item.type.toString()].push(item);
        const inventoryContainer: HTMLElement = document.getElementById("inventoryItems")!;
        if (inventoryContainer) {
            const invItemCount = document.getElementById(item.name.toString());
            /*if (!multiple) {
                const inventoryItem: HTMLElement = Paper.paperInventoryItem(item);
                if (inventoryContainer && State.UI.inventoryView === item.type) {
                    inventoryContainer.appendChild(inventoryItem);
                }
            } else if (invItemCount) {
                const itemCount = parseInt(invItemCount!.querySelector(".itemCount")!.textContent!, 10);
                invItemCount.querySelector(".itemCount")!.textContent = `${itemCount + 1}x`;
            }*/
        }
    }

    public static clearEquips(item: Item): void {
        if (item instanceof Armor) {
            Array.from(document.getElementsByClassName("inventoryItem")).forEach((e) => {
                if (e.classList.contains(`${item.bodyPart}_node`)) {
                    e.getElementsByClassName("itemEquipped")[0].textContent = "";
                }
            });
        } else {
            Array.from(document.getElementsByClassName("inventoryItem")).forEach((e) => {
                e.getElementsByClassName("itemEquipped")[0].textContent = "";
            });
        }
    }

    public static useItem(item: Item) {
        const player: Player = State.player!;
        if (item instanceof Weapon) {
            GetItem.clearEquips(item);
            const equipDiv = document.getElementById(item.name)!.getElementsByClassName("itemEquipped")[0];
            const equipWeapon = !item.equipped;
            equipDiv.textContent = !item.equipped ? "[Equipped]" : "";
            player.weapon = equipWeapon ? (item as Weapon) : GetItem.weapon("weapon_fists");
            player.inventory.weapons.forEach((w) => (w.equipped = false));
            item.equipped = equipWeapon;
        }
        if (item instanceof Armor) {
            const equipDiv = document.getElementById(item.name)!.getElementsByClassName("itemEquipped")[0];
            const equipArmor = !item.equipped;
            GetItem.clearEquips(item);
            equipDiv.textContent = !item.equipped ? "[Equipped]" : "";
            player.equipment[item.bodyPart!] = equipArmor ? item : null;
            player.inventory.armor.filter((w) => w.bodyPart === item.bodyPart).forEach((e) => (e.equipped = false));
            item.equipped = equipArmor;
        }
        if (item instanceof Medical) {
            player.health =
                player.health >= player.maxHealth ? player.maxHealth : (player.health += item.restorePoints!);
        } else {
            // currentActor.inventory.misc.push(item);
        }
    }
}
