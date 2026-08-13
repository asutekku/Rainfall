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
        actor.inventory[item.type.toString()].push(item);
    }

    /**
     * Equips/uses an item by mutating the model only. Rendering the resulting
     * equipped/health state is the view layer's job (it re-reads the model),
     * which keeps this usable headless and in tests.
     */
    public static useItem(item: Item) {
        const player: Player = State.player!;
        if (item instanceof Weapon) {
            const equipWeapon = !item.equipped;
            player.inventory.weapons.forEach((w) => (w.equipped = false));
            player.weapon = equipWeapon ? (item as Weapon) : GetItem.weapon("Fists");
            item.equipped = equipWeapon;
        }
        if (item instanceof Armor) {
            const equipArmor = !item.equipped;
            player.inventory.armor
                .filter((w) => w.bodyPart === item.bodyPart)
                .forEach((e) => (e.equipped = false));
            player.equipment[item.bodyPart!] = equipArmor ? item : null;
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
