import {Actor} from "../actors/Actor";
import {Vehicle} from "../items/Vehicle";
import {Check} from "./check";

export interface RamResult {
    hit: boolean;
    damage: number;
    destroyed: boolean;
}

/**
 * Cyberpunk RED vehicle actions. Driving checks are 1d10 + REF + Drive skill.
 * Ramming (Vehicle Melee) is an opposed Driving test; escaping a fight is a
 * Driving check that a faster vehicle passes more easily.
 */
export class Driving {
    /** Driving-check modifier: REF + Drive skill, minus the wound penalty. */
    public static driveMod(actor: Actor): number {
        return actor.stats.ref + actor.driveSkill() + actor.woundPenalty();
    }

    /**
     * Vehicle Melee (ram): an opposed Driving test. On a win the attacker's
     * vehicle deals its ram damage (d6), reduced by the target chassis SP, to
     * the target's SDP.
     */
    public static ram(attacker: Actor, atkVeh: Vehicle, defender: Actor, defVeh: Vehicle): RamResult {
        const res = Check.opposed(attacker, Driving.driveMod(attacker), Driving.driveMod(defender));
        if (!res.success) {
            return {hit: false, damage: 0, destroyed: false};
        }
        let dmg = 0;
        for (let i = 0; i < atkVeh.ramDamage; i++) {
            dmg += Math.floor(Math.random() * 6) + 1;
        }
        dmg = Math.max(0, dmg - defVeh.sp);
        defVeh.sdp = Math.max(0, defVeh.sdp - dmg);
        return {hit: true, damage: dmg, destroyed: defVeh.isDestroyed()};
    }

    /**
     * Drive away from a fight. A Driving check vs the pursuer's DV; a faster
     * vehicle adds a bonus. Success means you got away clean.
     */
    public static escape(actor: Actor, vehicle: Vehicle, pursuerDV: number): boolean {
        if (vehicle.isDestroyed()) {
            return false;
        }
        const speedBonus: number = Math.floor(vehicle.speed / 20);
        return Check.resolve(actor, Driving.driveMod(actor) + speedBonus, pursuerDV).success;
    }
}
