define(['utils'], function (utils) {
    return {
        armour: function (type, name, set, level, stoppingPower, cost, description) {
            this.type = type;
            this.name = name;
            this.set = set;
            this.level = level;
            this.stoppingPower = stoppingPower;
            this.cost = cost;
            this.description = description;
        },
        
        weapon: function (weaponType, name, accuracy, rarity, damage, crit, diceThrows, shots, rateOfFire, reliability, range, cost, description) {
            this.type = "weapon";
            this.weaponType = weaponType;
            this.name = name;
            this.accuracy = accuracy;
            this.rarity = rarity;
            this.damage = damage;
            this.crit = crit;
            this.diceThrows = diceThrows;
            this.shots = shots;
            this.rateOfFire = rateOfFire;
            this.reliability= reliability;
            this.range = range;
            this.cost = cost;
            this.description = description;
        },
    }
});
