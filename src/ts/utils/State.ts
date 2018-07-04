import { mapGenerator } from "../environment/MapGenerator";

export const State = {
    player: undefined,
    playArea: new mapGenerator("Thrive", 50, 400, 400).map,
    UI: {
        inventoryView: "weapons"
    }
};
