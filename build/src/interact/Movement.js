define(["require", "exports", "../utils/utils"], function (require, exports, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Movement = /** @class */ (function () {
        function Movement() {
        }
        Movement.moveRandomly = function (actor, range) {
            var previousPos = actor.position;
            actor.position = [previousPos[0] + Math.floor(utils_1.Utils.range(range, range * -1)),
                previousPos[1] + Math.floor(utils_1.Utils.range(range, range * -1))];
        };
        ;
        Movement.prototype.move = function (actor, direction, distance) {
            var previousPos = actor.position;
            switch (direction) {
                case "N":
                    actor.position = [previousPos[0], previousPos[1] + distance];
                    break;
                case "E":
                    actor.position = [previousPos[0] + distance, previousPos[1]];
                    break;
                case "S":
                    actor.position = [previousPos[0], previousPos[1] - distance];
                    break;
                case "W":
                    actor.position = [previousPos[0] - distance, previousPos[1]];
                    break;
            }
        };
        ;
        Movement.prototype.mountVehicle = function (actor, vehicle) {
            //
        };
        ;
        return Movement;
    }());
    exports.Movement = Movement;
});
