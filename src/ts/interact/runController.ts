import type {InterfaceAppState} from "../components/app";
import {Actor} from "../actors/Actor";
import {Battlefield} from "./battlefield";
import {Economy} from "./economy";
import {RunMap, RunNode, RunState, encounterSpec, spawnEncounter} from "./runMap";

type Patch = Partial<InterfaceAppState>;

/**
 * Pure-ish state machine for a run. Movement is dungeon-style: the squad
 * stands on a waypoint and may move to any adjacent one. Entering an uncleared
 * node triggers its encounter/screen; entering a cleared node just relocates
 * (free backtracking). Each method takes the current app state and returns a
 * `setState` patch, so `App` stays a thin React shell owning the auto timer.
 */
export class RunController {
    /** Party yardstick for scaling encounters (highest member level). */
    public static levelOf(party: Actor[]): number {
        return party.reduce((m, p) => Math.max(m, p.level), 1);
    }

    /** A brand-new run: fresh city, road-graph waypoints, squad at the entry. */
    public static freshRun(): RunState {
        return RunMap.generate();
    }

    /** Move onto an adjacent node: relocate, open its screen, or start its fight. */
    public static enter(state: InterfaceAppState, node: RunNode, log: number): Patch {
        const run = state.run;
        if (!run || run.reachableIds.indexOf(node.id) < 0) { return {}; }
        if (run.clearedIds.indexOf(node.id) >= 0) {
            // already cleared — free movement, no encounter
            return {run: {...run, position: node.id, reachableIds: (run.adj[node.id] || []).slice()}};
        }
        if (node.type === "merchant") { return {run: {...run, node}, screen: "merchant"}; }
        if (node.type === "rest") { return {run: {...run, node}, screen: "rest"}; }
        // combat / elite / boss
        const enemies = spawnEncounter(encounterSpec(node, RunController.levelOf(state.party)));
        Battlefield.deploy(state.party, enemies);
        const label = node.type === "boss" ? "BOSS — hold nothing back"
            : node.type === "elite" ? "elite contact" : "firefight";
        return {
            run: {...run, node}, screen: "combat",
            currentEnemies: enemies, activeEnemy: enemies[0], activeChar: state.party[0],
            activeMainPanel: "Combat", mobileTab: "arena",
            messages: [{msg: `— ${label} —`} as any, ...state.messages].slice(0, log),
        };
    }

    /** Leave a merchant / rest node (clears it) and stand on it, back on the map. */
    public static leaveMeta(state: InterfaceAppState, log: number): Patch | null {
        const run = state.run;
        return run && run.node ? RunController.advance(state, run.node, [{msg: "— moving on —"}], log) : null;
    }

    /** Mark a node cleared and stand on it; clearing the boss wins the run. */
    public static advance(state: InterfaceAppState, node: RunNode, extra: any[], log: number): Patch {
        const run = state.run;
        if (!run) { return {}; }
        const clearedIds = run.clearedIds.indexOf(node.id) >= 0
            ? run.clearedIds : run.clearedIds.concat(node.id);
        const depth = run.depth + 1;
        const messages = [...extra, ...state.messages].slice(0, log);
        if (node.type === "boss") {
            return {run: {...run, clearedIds, depth, node: null, position: node.id, outcome: "won"}, screen: "end", messages};
        }
        return {
            run: {
                ...run, clearedIds, depth, node: null,
                position: node.id, reachableIds: (run.adj[node.id] || []).slice(),
            },
            screen: "map", messages,
        };
    }

    /** One resolved round in a combat node: wipe → end, cleared → advance, else continue. */
    public static step(state: InterfaceAppState, msgs: any[], log: number): Patch {
        const party = state.party;
        const run = state.run;
        if (!run) { return {}; }
        const alive = state.currentEnemies.filter((e) => e.health > 0);
        const feed = [...msgs, ...state.messages].slice(0, log);

        if (party.every((p) => !p.canFight())) {          // squad wiped → run over (revive offered)
            return {run: {...run, outcome: "lost"}, screen: "end", currentEnemies: alive, messages: feed};
        }
        if (alive.length <= 0) {                           // node cleared → between-node shop + advance
            const shop: any[] = [];
            party.forEach((p) => { if (p.canFight()) { Economy.autoEquip(p).forEach((m) => shop.push({msg: m})); } });
            return RunController.advance(state, run.node!, [...shop, ...msgs], log);
        }
        return {                                           // ongoing exchange
            currentEnemies: alive, activeEnemy: alive[0], messages: feed,
            unread: state.mobileTab === "feed" ? 0 : state.unread + Math.max(0, msgs.length),
        };
    }

    /** Spend the one-per-run Trauma Team revive and resume the current fight. */
    public static revive(state: InterfaceAppState, log: number): Patch | null {
        const run = state.run;
        if (!run || run.reviveUsed) { return null; }
        state.party.forEach((p) => p.revive());
        return {
            run: {...run, reviveUsed: true, outcome: "active"}, screen: "combat",
            messages: [{msg: "— Trauma Team revive (one per run) —"} as any, ...state.messages].slice(0, log),
        };
    }

    /** Convenience for callers that only have an id. */
    public static nodeById(run: RunState, id: string): RunNode | null {
        return RunMap.find(run, id);
    }
}
