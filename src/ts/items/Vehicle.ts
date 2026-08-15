import {Actor} from "../actors/Actor";
import {GameObject} from "./GameObject";
import {ObjectPosition} from "../utils/ObjectPosition";

export interface VehicleConfig {
    name: string;
    cost: number;
    sdp: number;       // Structural Damage Points (RED)
    sp: number;        // stopping power of the chassis
    speed: number;     // top speed (used as a chase modifier)
    ramDamage: number; // d6 of ramming damage
    seats: number;
}

export class Vehicle extends GameObject {
    public name: string;
    public cost: number;
    public sdp: number;
    public maxSdp: number;
    public sp: number;
    public speed: number;
    public ramDamage: number;
    public seats: number;
    public driver: Actor | null;
    public passengers: Actor[];

    constructor(cfg: VehicleConfig) {
        super(new ObjectPosition(0, 0, 0));
        this.name = cfg.name;
        this.cost = cfg.cost;
        this.sdp = cfg.sdp;
        this.maxSdp = cfg.sdp;
        this.sp = cfg.sp;
        this.speed = cfg.speed;
        this.ramDamage = cfg.ramDamage;
        this.seats = cfg.seats;
        this.driver = null;
        this.passengers = [];
    }

    /** RED: a vehicle with 0 SDP is Destroyed and can no longer move. */
    public isDestroyed(): boolean {
        return this.sdp <= 0;
    }
}
