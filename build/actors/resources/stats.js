define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Stats = /** @class */ (function () {
        function Stats() {
        }
        Object.defineProperty(Stats, "inventory", {
            get: function () {
                return this._inventory;
            },
            set: function (value) {
                this._inventory.push(value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Stats, "level", {
            get: function () {
                return this._level;
            },
            set: function (value) {
                this._level = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Stats, "money", {
            get: function () {
                return this._money;
            },
            set: function (value) {
                this._money = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Stats, "kills", {
            get: function () {
                return this._kills;
            },
            set: function (value) {
                this._kills = value;
            },
            enumerable: true,
            configurable: true
        });
        Stats._kills = 0;
        Stats._money = 0;
        Stats._level = 0;
        Stats._inventory = [];
        return Stats;
    }());
    exports.Stats = Stats;
});
