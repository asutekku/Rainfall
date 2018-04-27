define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Scrap = /** @class */ (function () {
        function Scrap(type, name, cost, description) {
            this.type = type;
            this.name = name;
            this.cost = cost;
            this.description = description;
            this.rarity = 1;
            this.level = 1;
        }
        return Scrap;
    }());
    exports.Scrap = Scrap;
    var Medical = /** @class */ (function () {
        function Medical(type, name, cost, description, restorePoints) {
            this.type = type;
            this.name = name;
            this.cost = cost;
            this.description = description;
            this.restorePoints = restorePoints;
            this.rarity = 0;
            this.level = 0;
        }
        return Medical;
    }());
    exports.Medical = Medical;
});
