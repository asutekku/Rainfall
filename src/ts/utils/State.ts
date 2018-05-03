import {Settings} from "../environment/Settings";
import {Map} from "../environment/Map";
import {mapGenerator} from "../environment/MapGenerator";

export const State = {
    playArea: new mapGenerator("Thrive",50,400,400,"#29241D").map,
};