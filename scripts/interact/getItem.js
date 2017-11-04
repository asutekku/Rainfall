define(['nameGen',
        'list_roles',
        'utils',
        'combat',
        'color',
        'messages',
        'UI',
        'stats',
        'list_weapons',
        'list_items',
        'list_armor'
       ],
    function (nameGen, stat, utils, combat, color, message, UI, stats, weapons, items, armor) {

        var itemID = 0;
        var element = document.getElementById(':hover');

        return {
            weapon: function () {
                weapon = utils.choose(weapons.weapons);
                return weapon;
            },

            item: function () {
                var randomItem = Math.floor(Math.random() * 4);
                switch (randomItem) {
                    case 0:
                        item = utils.choose(armor.armor);
                        return item;
                    case 1:
                        item = utils.choose(weapons.weapons);
                        return item;
                    case 2:
                        item = utils.choose(items.tools);
                        return item;
                    case 3:
                        item = utils.choose(items.medical);
                        return item;
                }
            },

            updateCurrency: function (money, actor, target) {
                if (money >= 0) {
                    message.combat('getMoney', actor, target);
                    stats.player.money += money;
                } else {
                    if (stats.player.money < -(money)) {
                        message.combat('noMoney', actor, target);
                    } else if (stats.player.money < money) {
                        stats.player.money += money;
                        console.log("Does it work 2?")
                    }
                }
            },

            addItemToInventory: function (item, actor) {
                var text = item.name;
                var ul = document.getElementById("inventoryItems");
                var inventoryItem = document.createElement("li");
                inventoryItem.data = item;
                inventoryItem.innerHTML = text + " - " + inventoryItem.data.price + "¥";
                inventoryItem.onclick = function () {
                    if (actor.health != 0) {
                        this.parentNode.removeChild(this);
                        if (inventoryItem.data.type == "medical") {
                            actor.health += inventoryItem.data.restorePoints;
                            if (actor.health >= actor.maxHealth){
                                actor.health = actor.maxHealth;
                            }
                        } else {
                            stats.player.money += inventoryItem.data.price;
                        }
                        UI.updateUI(actor);
                    }
                }
                if (ul.childElementCount == 0) {
                    ul.appendChild(inventoryItem);
                } else {
                    ul.insertBefore(inventoryItem, ul.firstChild)
                }
            },
        };
    });
