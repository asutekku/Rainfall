define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Armor = /** @class */ (function () {
        function Armor(type, name, set, level, stoppingPower, cost, description) {
            this.type = type;
            this.name = name;
            this.set = set;
            this.level = level;
            this.stoppingPower = stoppingPower;
            this.cost = cost;
            this.description = description;
            this.rarity = 0;
        }
        return Armor;
    }());
    exports.Armor = Armor;
});
