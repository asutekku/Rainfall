import {Utils} from "../utils/utils";
import {Actor} from "../actors/Actor";

export class Movement {
    static moveRandomly(actor:Actor, range:number) {
        let previousPos = actor.position;
        actor.position = [previousPos[0] + Math.floor(Utils.range(range, range * -1)),
            previousPos[1] + Math.floor(Utils.range(range, range * -1))]
    };

    move(actor:Actor, direction:string, distance:number) {
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
