define(["require", "exports", "./roles"], function (require, exports, roles_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var randomProperty = function (obj) {
        var keys = Object.keys(obj);
        return obj[keys[keys.length * Math.random() << 0]];
    };
    var Role = /** @class */ (function () {
        function Role() {
            var theRole = randomProperty(roles_1.default);
            this.name = theRole.name;
            this.skill = theRole.skill;
            this.skillDescription = theRole.skillDescription;
            this.color = theRole.color;
        }
        return Role;
    }());
    exports.Role = Role;
});
