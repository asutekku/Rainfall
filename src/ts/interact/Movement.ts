import {Map} from "../environment/Map";
import {Utils} from "../utils/utils";

export class Movement {

    public static randomPosition(area: Map, range: number): number[] {
        return [Math.floor(Utils.range(range * -1, range)), Math.floor(Utils.range(range * -1, range))];
    }

}
