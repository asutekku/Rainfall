define(['enemy', 'utils', 'list_weapons', 'list_items', 'list_armor', 'messages', 'player', 'getItem', 'nameGen', 'UI', 'stats', "utils/math"], function (enemy, utils, weapons, itemList, armor, message, actors, getItem, nameGen, UI, stats, math) {

    //let currentEnemy = enemy.enemy;

    return {
        moveRandomly: function (actor, range) {
            let previousPos = actor.position;
            actor.position = [previousPos[0] + Math.floor(math.range(range, -range)),
                previousPos[1] + Math.floor(math.range(range, -range))]
        },
        move: function (actor, direction, distance) {
            let previousPos = actor.position;
            switch (direction) {
                case "N":
                    actor.position = [previousPos[0], previousPos[1] + distance];
                    break;
                case "E":
                    actor.position = [previousPos[0] + distance, previousPos[1]];
                    break;
                case "S":
                    actor.position = [previousPos[0], previousPos[1] - distance];
                    break;
                case "W":
                    actor.position = [previousPos[0] - distance, previousPos[1]];
                    break;
            }
        },
        enterVehicle: function(actor, vehicle){
            //
        }

    }
});