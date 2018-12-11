import {Actor} from "../actors/Actor";
import {Map} from "../environment/Map";
import {Utils} from "../utils/utils";

export class Movement {
    public static moveRandomly(area: Map, actor: Actor, distance: number): void {
        actor.position[0] += Math.floor(Utils.range(-distance, distance));
        actor.position[1] += Math.floor(Utils.range(-distance, distance));
    }

    public static randomPosition(area: Map, range: number): number[] {
        return [Math.floor(Utils.range(range * -1, range)), Math.floor(Utils.range(range * -1, range))];
    }

    public static move(area: Map, actor: Actor, direction: string, distance: number): void {
        if (direction === "N") {
            actor.position[1] += distance;
        } else if (direction === "E") {
            actor.position[0] += distance;
        } else if (direction === "S") {
            actor.position[1] -= distance;
        } else if (direction === "W") {
            actor.position[0] -= distance;
        }
    }

    public static moveTo(actor: Actor, target: number[], distance: number): void {
        const Angle: number = Math.atan2(target[1] - actor.position[1], target[0] - actor.position[0]);
        const Sin: number = Math.sin(Angle) * distance;
        const Cos: number = Math.cos(Angle) * distance;
        actor.position[0] += Math.floor(Cos);
        actor.position[1] += Math.floor(Sin);
    }

    /*mountVehicle(currentActor:Actor, vehicle:Vehicle) {

    }*/
}
