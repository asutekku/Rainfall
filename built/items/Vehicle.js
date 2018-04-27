define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Vehicle = /** @class */ (function () {
        function Vehicle() {
            this.name = null;
            this.price = null;
            this.health = null;
            this.maxSpeed = null;
            this.driver = null;
            this.passengers = [];
        }
        return Vehicle;
    }());
    exports.Vehicle = Vehicle;
});
