import {Goon} from "./Enemies/Goon";
import {getRandomPositionOnMap} from "../../components/map/MapUtils";

export class ActorController {
    public static getGoons(amount: number, height: number, width: number, cell: number): Goon[] {
        let goons = [];
        for (let i = 0; i < amount; i++) {
            goons.push(new Goon(getRandomPositionOnMap(height, width, cell)),);
        }
        return goons;
    }
}