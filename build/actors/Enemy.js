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
define(["require", "exports", "./Actor", "./tools/nameBuilder", "./tools/nameBuilder", "./resources/Role", "../utils/utils", "../interact/getItem", "./resources/stats"], function (require, exports, Actor_1, nameBuilder_1, nameBuilder_2, Role_1, utils_1, getItem_1, stats_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Enemy = /** @class */ (function (_super) {
        __extends(Enemy, _super);
        function Enemy() {
            var _this = _super.call(this) || this;
            _this.weapon = getItem_1.getItem.weapon();
            _this.name = nameBuilder_1.name();
            _this.gender = nameBuilder_2.gender();
            _this.items = [getItem_1.getItem.item()];
            _this.role = new Role_1.Role();
            _this.color = _this.role.color;
            _this.level = Math.floor((stats_1.Stats.level) + utils_1.Utils.range(1, 3));
            _this.currency = Math.floor(utils_1.Utils.range(50, 20));
            _this.experience = Math.floor(utils_1.Utils.range(50, 20));
            return _this;
        }
        return Enemy;
    }(Actor_1.Actor));
    exports.Enemy = Enemy;
});
