import { Utils } from "../utils/utils";
import { Actor } from "../actors/Actor";
import { Map } from "../environment/Map";

export class Movement {
    static moveRandomly(area: Map, actor: Actor, distance: number) {
        let prevPos: number[] = actor.position;
        let posX: number = prevPos[0] + Math.floor(Utils.range(distance * -1, distance));
        let posY: number = prevPos[1] + Math.floor(Utils.range(distance * -1, distance));
        actor.position = [posX, posY];
        if (posX > area.width / 2 || posX < area.width * -1 / 2) {
            this.moveRandomly(area, actor, distance);
        }
        if (posY > area.height / 2 || posY < area.height * -1 / 2) {
            this.moveRandomly(area, actor, distance);
        }
    }

    static randomPosition(area: Map, range: number) {
        return [Math.floor(Utils.range(range * -1, range)), Math.floor(Utils.range(range * -1, range))];
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
    }

    static moveTo(actor: Actor, target: number[], distance) {
        let Angle = Math.atan2(target[1] - actor.position[1], target[0] - actor.position[0]);
        let Sin = Math.sin(Angle) * distance;
        let Cos = Math.cos(Angle) * distance;
        actor.position[0] += Math.floor(Cos);
        actor.position[1] += Math.floor(Sin);
    }

    mountVehicle(actor, vehicle) {
        //
    }
}
