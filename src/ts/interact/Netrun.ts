import {Actor} from "../actors/Actor";
import {Program} from "../items/Program";
import programData from "../../objects/programs";
import {Check} from "./check";

export type FloorType = "password" | "file" | "controlnode" | "blackice";

export interface NetFloor {
    type: FloorType;
    dv: number;
    ice: Program | null;
    reward: number;   // eddies gained on access
    defeated: boolean;
}

export interface NetArchitecture {
    difficulty: string;
    floors: NetFloor[]; // climbed from index 0 upward
}

export interface NetrunResult {
    success: boolean;
    floorsCleared: number;
    totalFloors: number;
    eddiesGained: number;
    iceDerezzed: number;
    brainDamage: number;
    flatlined: boolean;
    log: string[];
}

interface DiffSpec {
    dv: number; min: number; max: number; iceChance: number; ice: string[]; reward: number;
}

const DIFFICULTY: { [name: string]: DiffSpec } = {
    Basic:    {dv: 6,  min: 3, max: 4, iceChance: 0.25, ice: ["Wisp"], reward: 50},
    Standard: {dv: 8,  min: 5, max: 6, iceChance: 0.35, ice: ["Wisp", "Hellhound"], reward: 100},
    Uncommon: {dv: 10, min: 6, max: 7, iceChance: 0.45, ice: ["Hellhound", "Sabertooth"], reward: 150},
    Advanced: {dv: 12, min: 7, max: 8, iceChance: 0.50, ice: ["Sabertooth", "Kraken"], reward: 250},
};

const rint = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export class Netrun {
    /** Generate a RED NET Architecture: a stack of floors ending in an objective. */
    public static generate(difficulty: string = "Standard"): NetArchitecture {
        const spec: DiffSpec = DIFFICULTY[difficulty] || DIFFICULTY.Standard;
        const count: number = rint(spec.min, spec.max);
        const floors: NetFloor[] = [];
        for (let i = 0; i < count; i++) {
            const isTop: boolean = i === count - 1;
            if (!isTop && Math.random() < spec.iceChance) {
                const iceName: string = spec.ice[rint(0, spec.ice.length - 1)];
                floors.push({type: "blackice", dv: spec.dv, ice: new Program(programData[iceName]), reward: 0, defeated: false});
            } else {
                // The top floor is the objective (a File or Control Node) with a bigger payout.
                const type: FloorType = isTop
                    ? (Math.random() < 0.5 ? "file" : "controlnode")
                    : (["password", "file", "controlnode"][rint(0, 2)] as FloorType);
                floors.push({type, dv: spec.dv, ice: null, reward: isTop ? spec.reward * 3 : spec.reward, defeated: false});
            }
        }
        return {difficulty, floors};
    }

    /** A Netrunner runs an architecture from the bottom floor upward. */
    public static run(runner: Actor, arch: NetArchitecture): NetrunResult {
        const iface: number = runner.interfaceRank();
        const attacker: Program = Netrun.bestAttacker(runner);
        const soak: number = Netrun.bestDefenderSoak(runner);
        const log: string[] = [];
        let eddies = 0, cleared = 0, derez = 0, brain = 0, flat = false;

        for (const floor of arch.floors) {
            if (runner.health <= 0) { flat = true; break; }
            if (floor.type === "blackice" && floor.ice) {
                const res = Netrun.fightIce(runner, floor.ice, attacker, iface, soak);
                brain += res.brain;
                if (res.derezzed) {
                    derez += 1; cleared += 1;
                    log.push(`Derezzed ${floor.ice.name} (took ${res.brain} brain damage)`);
                } else {
                    log.push(`${floor.ice.name} flatlined the run`);
                    flat = runner.health <= 0;
                    break;
                }
            } else {
                // Up to `iface`+1 attempts (NET Actions) to beat the floor's DV.
                let passed = false;
                const tries = Math.max(1, Netrun.actionsFor(iface));
                for (let t = 0; t < tries && !passed; t++) {
                    if (Check.resolve(runner, iface, floor.dv).success) { passed = true; }
                }
                if (passed) {
                    cleared += 1; eddies += floor.reward; floor.defeated = true;
                    log.push(`Cleared ${floor.type} (DV ${floor.dv}) +${floor.reward}eb`);
                } else {
                    log.push(`Locked out at ${floor.type} (DV ${floor.dv})`);
                    break;
                }
            }
        }

        runner.currency += eddies;
        return {
            success: cleared === arch.floors.length && !flat,
            floorsCleared: cleared, totalFloors: arch.floors.length,
            eddiesGained: eddies, iceDerezzed: derez, brainDamage: brain, flatlined: flat, log,
        };
    }

    /** RED: Interface 1-3 -> 1 NET Action, 4-6 -> 2, 7-9 -> 3, 10 -> 4. */
    public static actionsFor(iface: number): number {
        if (iface >= 10) { return 4; }
        if (iface >= 7) { return 3; }
        if (iface >= 4) { return 2; }
        return 1;
    }

    private static fightIce(runner: Actor, ice: Program, attacker: Program, iface: number, soak: number)
        : { derezzed: boolean; brain: number } {
        let brain = 0, rounds = 0;
        while (ice.rez > 0 && runner.health > 0 && rounds < 20) {
            rounds += 1;
            // Runner attacks the ICE: opposed Interface vs the ICE's DEF.
            if (Check.redRoll() + iface >= Check.redRoll() + ice.def) {
                ice.rez -= attacker.rollDamage();
            }
            if (ice.rez <= 0) { break; }
            // Anti-personnel ICE strikes back at the runner's brain.
            if (ice.antiPersonnel && Check.redRoll() + ice.atk >= Check.redRoll() + iface) {
                let dmg = 0;
                for (let i = 0; i < ice.damage; i++) { dmg += Math.floor(Math.random() * 6) + 1; }
                dmg = Math.max(0, dmg - soak);
                brain += dmg;
                runner.health -= dmg;
                if (runner.health <= 0) { runner.health = 0; runner.mortallyWounded = true; }
            }
        }
        return {derezzed: ice.rez <= 0, brain};
    }

    private static bestAttacker(runner: Actor): Program {
        const attackers = runner.cyberdeck.filter((p) => p.programClass === "attacker");
        if (!attackers.length) { return new Program(programData.Zap); }
        return attackers.reduce((best, p) => (p.damage > best.damage ? p : best), attackers[0]);
    }

    private static bestDefenderSoak(runner: Actor): number {
        return runner.cyberdeck
            .filter((p) => p.programClass === "defender")
            .reduce((n, p) => Math.max(n, p.def), 0);
    }
}
