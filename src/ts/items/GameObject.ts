import {ObjectPosition} from "../utils/ObjectPosition";

class GameObjectController {
    static id = 0;

    public static getID(): number {
        this.id++;
        return this.id;
    }
}

export interface IGameObject {
    position: ObjectPosition;
}

export class GameObject implements IGameObject {
    id: number;
    identifier: string;
    name: string;
    color: string;
    position: ObjectPosition;
    health: number;

    constructor(position: ObjectPosition, health?: number, name?: string, color?: string) {
        this.id = GameObjectController.getID();
        this.position = position;
        this.health = health ? health : 100;
        this.color = color ? color : 'weaponBlue';
        this.name = name ? name : 'unnamed';
        this.identifier = `${this.name}_${this.id}`;
    };

    public move(newPosition: ObjectPosition) {
        this.position = newPosition;
    }

    public receiveDamage(damage: number): number {
        this.health = this.health - damage < 0 ? 0 : this.health - damage;
        return damage;
    }

    toString() {
        return this.name;
    }
}