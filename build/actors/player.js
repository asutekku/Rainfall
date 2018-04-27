var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "./Actor", "./tools/nameBuilder", "./tools/nameBuilder", "./resources/Role"], function (require, exports, Actor_1, nameBuilder_1, nameBuilder_2, Role_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Player = /** @class */ (function (_super) {
        __extends(Player, _super);
        function Player() {
            var _this = _super.call(this) || this;
            _this.name = nameBuilder_1.name();
            _this.role = new Role_1.Role();
            _this.color = _this.role.color;
            _this.gender = nameBuilder_2.gender();
            return _this;
        }
        return Player;
    }(Actor_1.Actor));
    exports.Player = Player;
});
