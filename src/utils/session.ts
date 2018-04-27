import {Actor} from "../actors/Actor";

export class Session{
    get player(): Actor {
        return this._player;
    }

    set player(value: Actor) {
        this._player = value;
    }
    private _player : Actor;
    constructor(){
        this._player = new Actor();
    }
}