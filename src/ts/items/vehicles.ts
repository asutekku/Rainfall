import {VehicleConfig} from "./Vehicle";

// RED-scale vehicles (SDP is small in RED: bikes ~20, cars ~35-50).
const vehicles: { [name: string]: VehicleConfig } = {
    Scooter:        {name: "Scooter",        cost: 500,   sdp: 15, sp: 0,  speed: 40,  ramDamage: 1, seats: 1},
    Motorcycle:     {name: "Motorcycle",     cost: 1500,  sdp: 20, sp: 0,  speed: 100, ramDamage: 2, seats: 2},
    CityCar:        {name: "CityCar",        cost: 2000,  sdp: 35, sp: 3,  speed: 120, ramDamage: 3, seats: 4},
    SmallSubcompact:{name: "Small Subcompact", cost: 6000, sdp: 30, sp: 3, speed: 110, ramDamage: 3, seats: 4},
    MediumSedan:    {name: "Medium Sedan",   cost: 10000, sdp: 40, sp: 5,  speed: 120, ramDamage: 4, seats: 5},
    ArmoredSUV:     {name: "Armored SUV",    cost: 25000, sdp: 50, sp: 10, speed: 100, ramDamage: 5, seats: 6},
};

export default vehicles;
