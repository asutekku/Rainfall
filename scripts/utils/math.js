define(function () {
    return {
        add: function (x, y) {
            return x + y;
        },
        multiply: function (x, y) {
            return x * y;
        },
        range: function (max, min) {
            return Math.random() * (max - min) + min;
        },
        distance: function (p1, p2) {
            return Math.sqrt(Math.pow((p1[1] - p1[0]), 2) + Math.pow((p2[1] - p2[0]), 2));
        }
    };
});
