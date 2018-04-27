define(["require", "exports", "../items/Weapons", "../items/items", "../Utils/Utils", "../items/armors", "./messages", "../actors/resources/stats", "../utils/UI"], function (require, exports, Weapons_1, items_1, Utils_1, armors_1, messages_1, stats_1, UI_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var itemID = 0;
    var element = document.getElementById(':hover');
    var getItem = /** @class */ (function () {
        function getItem() {
        }
        getItem.weapon = function () {
            return Utils_1.Utils.pickRandom(Weapons_1.default);
        };
        getItem.item = function () {
            var randomItem = Math.floor(Math.random() * 4);
            switch (randomItem) {
                case 0:
                    return Utils_1.Utils.pickRandom(armors_1.default);
                case 1:
                    return Utils_1.Utils.pickRandom(Weapons_1.default);
                case 2:
                    return Utils_1.Utils.pickRandom(items_1.default);
                case 3:
                    return Utils_1.Utils.pickRandom(items_1.default);
            }
        };
        getItem.updateCurrency = function (money, actor, target) {
            if (money >= 0) {
                messages_1.Messages.combat('getMoney', actor, target);
                actor.currency += money;
            }
            else {
                if (actor.currency < -(money)) {
                    messages_1.Messages.combat('noMoney', actor, target);
                }
                else if (actor.currency < money) {
                    stats_1.Stats.money += money;
                    console.log("Does it work 2?");
                }
            }
        };
        getItem.addItemToInventory = function (item, actor) {
            var text = item.name;
            var ul = document.getElementById("inventoryItems");
            var inventoryItem = document.createElement("li");
            inventoryItem.innerHTML = text + " - " + item.price + "¥";
            inventoryItem.onclick = function () {
                if (actor.health != 0) {
                    this.parentNode.removeChild(this);
                    if (item.type == "medical") {
                        actor.health += item.restorePoints;
                        if (actor.health >= actor.maxHealth) {
                            actor.health = actor.maxHealth;
                        }
                    }
                    else {
                        stats_1.Stats.money += item.price;
                    }
                    UI_1.updateUI(actor);
                }
            };
            if (ul.childElementCount == 0) {
                ul.appendChild(inventoryItem);
            }
            else {
                ul.insertBefore(inventoryItem, ul.firstChild);
            }
        };
        return getItem;
    }());
    exports.getItem = getItem;
});
