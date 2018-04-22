define(['actor', 'utils', 'list_roles', 'nameGen', 'getItem', 'math', "stats"], function (Actor, utils, stat, nameGen, getItem, math, stats) {

    return {
        enemy: new Actor(),
        updateEnemy: function () {
            currentEnemy = this.enemy;
            currentEnemy.weapon = getItem.weapon();
            currentEnemy.name = nameGen.name();
            currentEnemy.gender = nameGen.gender();
            currentEnemy.items = getItem.item();
            currentEnemy.role = stat.roleSelection(utils.choose(stat.role));
            currentEnemy.color = stat.color;
            currentEnemy.level = Math.floor((stats.player.level) + math.range(1, 3));
            currentEnemy.currency = Math.floor(math.range(50, 20));
        }
    }
});