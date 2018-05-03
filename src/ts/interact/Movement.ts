import {Utils} from "../utils/utils";
import {Actor} from "../actors/Actor";
import {Map} from "../environment/Map";

export class Movement {
    static moveRandomly(area: Map, actor: Actor, distance: number) {
        let prevPos: number[] = actor.position;
        let posX: number = prevPos[0] + Math.floor(Utils.range(distance * -1, distance));
        let posY: number = prevPos[1] + Math.floor(Utils.range(distance * -1, distance));
        actor.position = [posX, posY];
        if (actor.position[0] > area.width / 2 || actor.position[0] < (area.width * -1) / 2) {
            this.moveRandomly(area, actor, distance);
        }
        if (actor.position[1] > area.height / 2 || actor.position[1] < (area.height * -1) / 2) {
            this.moveRandomly(area, actor, distance);
        }
    };

    static randomPosition(area: Map, range: number) {
        return [Math.floor(Utils.range(range * -1, range)), Math.floor(Utils.range(range * -1, range))]
    }

    static move(area: Map, actor: Actor, direction: string, distance: number) {
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
    };

    mountVehicle(actor, vehicle) {
        //
    };

}
