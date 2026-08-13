import {Actor} from "../actors/Actor";

export interface TraumaResult {
    responded: boolean;
    fee: number;
    healedTo: number;
}

/**
 * Trauma Team International: a paid emergency-medical subscription. When a
 * subscriber goes down, they can call for an extraction; if the AV responds in
 * time it stabilises them, patches them up to half HP, and bills the fee.
 */
export class TraumaTeam {
    public static readonly FEE: number = 500;

    public static call(patient: Actor): TraumaResult {
        if (!patient.traumaTeam) {
            return {responded: false, fee: 0, healedTo: patient.health};
        }
        // Response roll: they don't always make it through Night City traffic.
        const response: number = Math.floor(Math.random() * 10) + 1;
        if (response < 5) {
            return {responded: false, fee: 0, healedTo: patient.health};
        }
        patient.stabilize();
        patient.health = Math.max(patient.health, Math.ceil(patient.maxHealth / 2));
        const fee: number = Math.min(patient.currency, TraumaTeam.FEE);
        patient.currency -= fee;
        return {responded: true, fee, healedTo: patient.health};
    }
}
