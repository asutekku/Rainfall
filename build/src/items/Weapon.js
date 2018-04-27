define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Weapon = /** @class */ (function () {
        function Weapon(weaponType, name, accuracy, rarity, damage, criticalChance, diceThrows, shots, rateOfFire, reliability, range, cost, description) {
            this.type = "weapon";
            this.weaponType = weaponType;
            this.name = name;
            this.accuracy = accuracy;
            this.rarity = rarity;
            this.damage = damage;
            this.crit = criticalChance;
            this.diceThrows = diceThrows;
            this.shots = shots;
            this.rateOfFire = rateOfFire;
            this.reliability = reliability;
            this.range = range;
            this.cost = cost;
            this.description = description;
            this.level = 0;
        }
        return Weapon;
    }());
    exports.Weapon = Weapon;
});
