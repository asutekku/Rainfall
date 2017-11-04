define(function () {
    var spanId = 0;
    var spanIdToRemove = 1;
    return {
        l: function (what) {
            return document.getElementById(what);
        },
        choose: function (arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        },
        save: function (what, string) {
            return localStorage.setItem(what, string);
        },
        colorize: function (what) {
            var randomColor = '#' + Math.random().toString(16).substr(-3);
            return '<span style="color:' + randomColor + '">' + what + '</span>';
        },
        printLine: function (line) {
            spanId += 1;
            var node = document.createElement("span");
            var content = document.getElementById("actions");
            node.id = "message_" + spanId;
            node.style.whiteSpace= "normal";
            node.innerHTML = '<span class="iClass">></span>' + line + "<br>";
            content.insertBefore(node, content.childNodes[0]);
            var childNodes = document.getElementById("actions").childElementCount;
            if (childNodes >= 50) {
                var oldNode = document.getElementById("message_" + spanIdToRemove);
                oldNode.remove();
                spanIdToRemove += 1;
            }
        },
        span: function (line, color) {
            return "<span style=color:" + color + ">" + line + "</span>"
        },
        dice: function (times) {
            return (Math.floor(Math.random() * 5) + 1) * times;
        },
        chance: function (what) {
            var value = Math.ceil(Math.random() * 100);
            if (value <= what) {
                return true;
            } else {
                return false;
            }
        },
    };
});
