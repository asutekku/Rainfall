import { mapGenerator } from "../environment/MapGenerator";
import { Map } from "../environment/Map";
import { Player } from "../actors/player";

interface gameState {
    player?: Player;
    playArea: Map;
    UI: {
        inventoryView: string;
    };
}

export const State: gameState = {
    playArea: new mapGenerator("Thrive", 50, 400, 400).map,
    UI: {
        inventoryView: "weapons"
    }
};
