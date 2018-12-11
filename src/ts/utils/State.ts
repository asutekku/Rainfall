import {Enemy} from "../actors/Enemy";
import {Player} from "../actors/player";
import {Map} from "../environment/Map";
import {MapGenerator} from "../environment/MapGenerator";

interface GameState {
    player?: Player;
    playArea: Map;
    UI: {
        inventoryView: string;
    };
    currentEnemy?: Enemy;
}

export const State: GameState = {
    playArea: new MapGenerator("Thrive", 50, 400, 400).map,
    UI: {
        inventoryView: "weapons",
    },
};
