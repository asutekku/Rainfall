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
        }
    };
});
