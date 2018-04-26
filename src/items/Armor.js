define(function () {
    return class Armor {
        constructor(type, name, set, level, stoppingPower, cost, description) {
            this.type = type;
            this.name = name;
            this.set = set;
            this.level = level;
            this.stoppingPower = stoppingPower;
            this.cost = cost;
            this.description = description;
        }
    }
});