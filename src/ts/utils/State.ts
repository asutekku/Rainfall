import { mapGenerator } from "../environment/MapGenerator";
import { Map } from "../environment/Map";
import { Player } from "../actors/player";
import { Enemy } from "../actors/Enemy";

interface gameState {
    player?: Player;
    playArea: Map;
    UI: {
        inventoryView: string;
    };
    currentEnemy?: Enemy;
}

export const State: gameState = {
    playArea: new mapGenerator("Thrive", 50, 400, 400).map,
    UI: {
        inventoryView: "weapons"
    }
};
