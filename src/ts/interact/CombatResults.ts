import {IDefaultMessage} from "./messageSchema";
import {ObjectPosition} from "../utils/ObjectPosition";

export class CombatResults {
    messages: IDefaultMessage[];
    hitSuccess: boolean;
    hitOrigin: ObjectPosition;
    hitEnd: ObjectPosition;

    constructor(messages: IDefaultMessage[], hitSuccess: boolean, hitOrigin: ObjectPosition, hitEnd: ObjectPosition) {
        this.messages = messages;
        this.hitSuccess = hitSuccess;
        this.hitOrigin = hitOrigin;
        this.hitEnd = hitEnd;
    }
}