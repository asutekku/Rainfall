import {Goon} from "./Enemies/Goon";

export class ActorController {
    public static getGoons(amount: number): Goon[] {
        let goons = [];
        for (let i = 0; i < amount; i++) {
            goons.push(new Goon());
        }
        return goons;
    }
}