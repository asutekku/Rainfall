define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var spanId = 0;
    var spanIdToRemove = 1;
    var Utils = /** @class */ (function () {
        function Utils() {
        }
        Utils.l = function (what) {
            return document.getElementById(what);
        };
        Utils.pickRandom = function (arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        };
        Utils.save = function (what, string) {
            return localStorage.setItem(what, string);
        };
        Utils.colorize = function (what) {
            var randomColor = '#' + Math.random().toString(16).substr(-3);
            return "<span style=\"color:" + randomColor + "\">" + what + "</span>";
        };
        Utils.printLine = function (line) {
            spanId += 1;
            var node = document.createElement("span");
            var content = document.getElementById("actions");
            node.id = "message_" + spanId;
            node.style.whiteSpace = "normal";
            node.innerHTML = '<span class="iClass">></span>' + line + "<br>";
            content.insertBefore(node, content.childNodes[0]);
            var childNodes = document.getElementById("actions").childElementCount;
            if (childNodes >= 50) {
                var oldNode = document.getElementById("message_" + spanIdToRemove);
                oldNode.remove();
                spanIdToRemove += 1;
            }
        };
        Utils.span = function (line, color) {
            return "<span style=color:" + color + ">" + line + "</span>";
        };
        Utils.dice = function (times, sides) {
            return (Math.floor(Math.random() * sides) + 1) * times;
        };
        Utils.chance = function (what) {
            var value = Math.ceil(Math.random() * 100);
            return value <= what;
        };
        Utils.range = function (max, min) {
            return Math.random() * (max - min) + min;
        };
        Utils.distance = function (p1, p2) {
            return Math.sqrt(Math.pow((p1[1] - p1[0]), 2) + Math.pow((p2[1] - p2[0]), 2));
        };
        return Utils;
    }());
    exports.Utils = Utils;
});
