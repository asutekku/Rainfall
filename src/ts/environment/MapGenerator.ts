import { Map } from "./Map";
import { Settings } from "./Settings";
import { Building } from "./Building";
import { Utils } from "../utils/utils";
import { State } from "../utils/State";

export class mapGenerator {
    public map: Map;

    constructor(mapName: string, numberOfBuildings: number, height: number, width: number) {
        this.map = new Map(mapName, height, width, 1, Settings.city);
        let bArr = this.map.buildings;
        for (let i = 0; i < numberOfBuildings; i++) {
            let building = new Building("Building", width / 20, height / 20, Utils.range(1, 40));
            building.x = (Math.round(Utils.range(0, 20)) - 10) * width / 20;
            building.y = (Math.round(Utils.range(0, 20)) - 10) * height / 20;
            let placeable = true;
            for (let j = 0; j < bArr.length; j++) {
                if (building.x == bArr[j].x || building.y == bArr[j].x) {
                    placeable = false;
                }
            }
            if (placeable) {
                building.draw(this.map.context);
                bArr.push(building);
            }
        }
    }
}
