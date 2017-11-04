define(['utils', 'list_roles', 'nameGen', 'getItem', 'math'], function (utils, stat, nameGen, getItem, math) {

    function Actor(type, role, skill, name, level, experience, health, weapon, damage, color, gender, items, currency) {
        this.type = type;
        this.role = utils.choose(stat.role);
        this.skill = stat.ability(this.role);
        this.name = name;
        this.level = level;
        this.experience = experience;
        this.health = health;
        this.weapon = weapon;
        this.color = stat.color;
        this.gender = gender;
        this.items = item;
        this.currency = currency;
    }

    return {
        player: {
            name: nameGen.name(),
            role: utils.choose(stat.role),
            ability: stat.ability(this.role),
            skillDesc: stat.skillDesc,
            color: stat.color,
            gender: nameGen.gender(),
            level: parseInt(localStorage.getItem("pLVL"), 10),
            experience: parseInt(localStorage.getItem("pEXP"), 10),
            maxExperience: parseInt(localStorage.getItem("pMEXP"), 10),
            health: parseInt(localStorage.getItem("pHP"), 10),
            maxHealth: parseInt(localStorage.getItem("pMHP"), 10),
            mana: localStorage.getItem("pMP"),
            stamina: localStorage.getItem("pSTM"),
            weapon: getItem.weapon(),
            helmet: {
                name: 0,
                stoppingPower: 0
            },
            upperArmor: {
                name: 0,
                stoppingPower: 0
            },
            lowerArmor: {
                name: 0,
                stoppingPower: 0
            },
            armor: 0,
            items: [],
        },
        enemy: new Actor(
            "npc", //Type
            utils.choose(stat.role), //Role
            stat.ability(stat.role), //Skill
            nameGen.name(), //Name
            10, //Level
            50, //Experience
            10,
            getItem.weapon(), //Weapon
            stat.color, //Color
            nameGen.gender(), //Gender
            getItem.item(),
            math.range(50,0)
        ),
        updatePlayer: function () {
            currentPlayer = this.player;
            currentPlayer.name = nameGen.name();
            currentPlayer.role = utils.choose(stat.role);
            currentPlayer.ability = stat.ability(currentPlayer.role);
            currentPlayer.skillDesc = stat.skillDesc;
            currentPlayer.color = stat.color;
            currentPlayer.gender = nameGen.gender();
        },
        updateEnemy: function () {
            currentEnemy = this.enemy;
            currentEnemy.weapon = getItem.weapon();
            currentEnemy.name = nameGen.name();
            currentEnemy.gender = nameGen.gender();
            currentEnemy.items = getItem.item();
            currentEnemy.role = utils.choose(stat.role);
            currentEnemy.skill = stat.ability(currentEnemy.role);
            currentEnemy.color = stat.color;
            currentEnemy.currency = Math.floor(math.range(50,20));
        }
    }
});
