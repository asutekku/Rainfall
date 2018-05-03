import {Map} from "./Map";
import {Settings} from "./Settings";
import {Building} from "./Building";
import {Utils} from "../utils/utils";
import {State} from "../utils/State";

export class mapGenerator {
    public map: Map;

    constructor(mapName: string, numberOfBuildings: number, height: number, width: number, background: string) {
        this.map = new Map(mapName, height, width, 1, Settings.city, background);
        let bArr = this.map.buildings;
        for (let i = 0; i < numberOfBuildings; i++) {
            let building = new Building("Building", width / 20, height / 20, Utils.range(1, 40));
            let xpos = (Math.round(Utils.range(0, 20)) - 10) * width / 20;
            let ypos = (Math.round(Utils.range(0, 20)) - 10) * height / 20;
            let placeable = true;
            for (let j = 0; j < bArr.length; j++) {
                if (xpos == bArr[j].xpos || ypos == bArr[j].xpos) {
                    xpos = (Math.round(Utils.range(0, 20)) - 10) * width / 20;
                    ypos = (Math.round(Utils.range(0, 20)) - 10) * height / 20;
                }
            }
            if (placeable) {
                building.xpos = xpos;
                building.ypos = ypos;
                this.map.context.fillRect(xpos, ypos, building.width, building.height);
                bArr.push(building);
            }
        }
    }
}