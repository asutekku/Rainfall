import { Actor } from "../actors/Actor";

export class Vehicle {
    private name: string;
    private price: number;
    private health: number;
    private maxSpeed: number;
    private driver?: Actor;
    private passengers: Actor[];

    constructor(name: string, price: number, health: number, maxSpeed: number) {
        this.name = name;
        this.price = price;
        this.health = health;
        this.maxSpeed = maxSpeed;
        this.passengers = [];
    }
}
