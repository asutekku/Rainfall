import {Actor} from "../actors/Actor";
import {GameObject} from "./GameObject";
import {ObjectPosition} from "../utils/ObjectPosition";

export class Vehicle extends GameObject {
    name: string;
    private price: number;
    health: number;
    private maxSpeed: number;
    private driver?: Actor;
    private passengers: Actor[];

    constructor(name: string, price: number, health: number, maxSpeed: number) {
        super(new ObjectPosition(0, 0, 0));
        this.name = name;
        this.price = price;
        this.health = health;
        this.maxSpeed = maxSpeed;
        this.passengers = [];
    }
}
