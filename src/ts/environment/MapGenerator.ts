import {Utils} from "../utils/utils";
import {Building} from "./Building";
import {Map} from "./Map";
import {Settings} from "./Settings";

export class MapGenerator {
    public map: Map;

    constructor(mapName: string, numberOfBuildings: number, height: number, width: number) {
        this.map = new Map(mapName, height, width, 1, Settings.city);
        const bArr = this.map.buildings;
        // Generate the building layout only (pure model). Rendering is done
        // separately in render() so the map can be generated headless.
        for (let i = 0; i < numberOfBuildings; i++) {
            const building = new Building("Building", width / 20, height / 20, Utils.range(1, 40));
            building.x = (Math.round(Utils.range(0, 20)) - 10) * width / 20;
            building.y = (Math.round(Utils.range(0, 20)) - 10) * height / 20;
            let placeable = true;
            for (let j = 0; j < bArr.length; j++) {
                if (building.x === bArr[j].x || building.y === bArr[j].x) {
                    placeable = false;
                }
            }
            if (placeable) {
                bArr.push(building);
            }
        }
    }

    /**
     * Draws the generated buildings to the map's canvas. Browser-only; call
     * from the render layer once a DOM is available.
     */
    public render(): void {
        this.map.initCanvas();
        const ctx = this.map.context!;
        this.map.buildings.forEach((building) => building.draw(ctx));
    }
}
