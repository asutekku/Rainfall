import {Actor} from "../actors/Actor";

export interface FacedownResult {
    winner: Actor | null;
    loser: Actor | null;
    tie: boolean;
    aRoll: number;
    bRoll: number;
}

/**
 * Cyberpunk RED Facedown: a duel of wills before (or instead of) violence. Both
 * parties roll 1d10 + COOL + Reputation; the high roll wins, a tie resolves
 * nothing. The loser either backs down or fights the winner at -2 (fear) until
 * they beat them once.
 */
export class Facedown {
    public static resolve(a: Actor, b: Actor): FacedownResult {
        const aRoll: number = Math.floor(Math.random() * 10) + 1 + a.stats.cl + a.reputation + a.facedownBonus();
        const bRoll: number = Math.floor(Math.random() * 10) + 1 + b.stats.cl + b.reputation + b.facedownBonus();
        if (aRoll === bRoll) {
            return {winner: null, loser: null, tie: true, aRoll, bRoll};
        }
        const aWins: boolean = aRoll > bRoll;
        return {
            winner: aWins ? a : b,
            loser: aWins ? b : a,
            tie: false, aRoll, bRoll,
        };
    }

    /**
     * Apply the RED consequence: the loser backs down (leaves) if the margin is
     * large or they are badly outmatched; otherwise they stay but take -2 (fear)
     * against the winner. Returns true if the loser backed down.
     */
    public static applyOutcome(result: FacedownResult): boolean {
        if (result.tie || !result.loser || !result.winner) {
            return false;
        }
        const margin: number = Math.abs(result.aRoll - result.bRoll);
        const outmatched: boolean = result.winner.reputation - result.loser.reputation >= 3;
        if (margin >= 5 || outmatched) {
            return true; // backs down and leaves
        }
        result.loser.fearPenalty = -2; // stays, but shaken
        return false;
    }
}
