define(['actor', 'utils', 'list_roles', 'nameGen', 'getItem', 'math'], function (Actor, utils, stat, nameGen, getItem, math) {

    return {
        enemy: new Actor(),
        updateEnemy: function () {
            currentEnemy = this.enemy;
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