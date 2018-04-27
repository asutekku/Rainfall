define(["require", "exports", "../actors/Actor"], function (require, exports, Actor_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Session = /** @class */ (function () {
        function Session() {
            this._player = new Actor_1.Actor();
        }
        Object.defineProperty(Session.prototype, "player", {
            get: function () {
                return this._player;
            },
            set: function (value) {
                this._player = value;
            },
            enumerable: true,
            configurable: true
        });
        return Session;
    }());
    exports.Session = Session;
});
