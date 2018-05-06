import {Actor} from "../actors/Actor";

export class Vehicle {
    private name: string;
    private price: number;
    private health: number;
    private maxSpeed: number;
    private driver: Actor;
    private passengers: Actor[];

    constructor() {
        this.name = null;
        this.price = null;
        this.health = null;
        this.maxSpeed = null;
        this.driver = null;
        this.passengers = [];
    }
}
