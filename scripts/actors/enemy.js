define("main",['actors', 'utils', 'list_roles', 'nameGen', 'getItem', 'math'], function (Actor, utils, stat, nameGen, getItem, math) {

    let grunt = new Actor("npc");
    /*function Grunt(){
        actor.call(this);
        this.name = nameGen.name(), //Name
        this.type = "pc", //Type
        this.role = utils.choose(stat.role), //Role
        this.skill = stat.ability(stat.role), //Skill
        this.level = 10, //Level
        this.experience = 50, //Experience
        this.health = 10, //health
        this.weapon = getItem.weapon(), //Weapon
        this.color = stat.color, //Color
        this.gender = nameGen.gender(), //Gender
        this.gear = getItem.item(), //gear
        this.currency = math.range(50, 0) //currency
    }*/

    return {
        grunt: grunt,
        updateEnemy: function () {
            currentEnemy = this.grunt;
            currentEnemy.weapon = getItem.weapon();
            currentEnemy.name = nameGen.name();
            currentEnemy.gender = nameGen.gender();
            currentEnemy.items = getItem.item();
            currentEnemy.role = utils.choose(stat.role);
            currentEnemy.skill = stat.ability(currentEnemy.role);
            currentEnemy.color = stat.color;
            currentEnemy.currency = Math.floor(math.range(50, 20));
        }
    }
});