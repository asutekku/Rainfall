define(["math"], function (math) {

    //let currentEnemy = enemy.enemy;

    return {
        moveRandomly(actor, range) {
            console.log(actor);
            let previousPos = Object.keys(actor).position;
            console.log(actor.enemy.position);
            actor.position = [previousPos[0] + Math.floor(math.range(range, range * -1)),
                previousPos[1] + Math.floor(math.range(range, range * -1))]
        },
        move: function (actor, direction, distance) {
            let previousPos = Object.keys(actor).position;
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
        getDescendantProp(obj, desc) {
            var arr = desc.split(".");
            while (arr.length && (obj = obj[arr.shift()])) ;
            return obj;
        },
        enterVehicle(actor, vehicle) {
            //
        }

    }
});