import {Actor} from "../actors/Actor";
import {Check} from "./check";

/**
 * Cyberpunk RED healing outside of a full hospital: First Aid / Paramedic to
 * stabilise the dying, and natural rest to recover Hit Points over time.
 */
export class Medicine {
    public static readonly FIRST_AID_DV: number = 13;

    /**
     * First Aid: 1d10 + TECH + First Aid skill vs DV 13. On success the patient
     * is stabilised (Death Saves stop) and recovers a little HP (1d6).
     */
    public static firstAid(healer: Actor, patient: Actor): boolean {
        const modifier: number = healer.stats.tech + healer.firstAidSkill();
        const success: boolean = Check.resolve(healer, modifier, Medicine.FIRST_AID_DV).success;
        if (success) {
            patient.stabilize();
            patient.heal(Math.floor(Math.random() * 6) + 1);
        }
        return success;
    }

    /**
     * A stretch of rest between jobs. RED: a day of rest restores HP equal to
     * BODY. A Mortally Wounded character must be stabilised before they heal.
     */
    public static rest(actor: Actor): number {
        return actor.heal(actor.stats.bt);
    }
}
