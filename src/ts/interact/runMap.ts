import {Actor} from "../actors/Actor";
import {ActorController} from "../actors/actorController";
import {City, Pt, generateCity} from "./cityGen";

/**
 * The run graph, dungeon-style, laid over the city's road network. Waypoints
 * sit ON street junctions inside the active district; the connections between
 * them are real road routes (polylines along the streets). Movement is free:
 * the squad stands on a node and may move to any adjacent node — entering an
 * uncleared node triggers its encounter/screen, entering a cleared one just
 * relocates (so you can backtrack and take other branches). Clearing the boss
 * wins the run.
 */
export type NodeType = "combat" | "elite" | "merchant" | "rest" | "boss";

export interface RunNode {
    id: string;
    type: NodeType;
    junction: number;   // index into city.junctions
    pos: Pt;
}

export interface RunState {
    city: City;
    nodes: RunNode[];
    adj: { [id: string]: string[] };
    paths: { [key: string]: Pt[] };   // edgeKey(a,b) → street polyline
    position: string;                 // node the squad stands on
    node: RunNode | null;             // node currently being resolved
    clearedIds: string[];
    reachableIds: string[];           // neighbours of `position`
    reviveUsed: boolean;
    depth: number;
    outcome: "active" | "won" | "lost";
}

export const edgeKey = (a: string, b: string): string => (a < b ? a + "~" + b : b + "~" + a);

const NODES = 13;
const NEIGHBOURS = 2;      // road-nearest links per node (plus connectivity repairs)

export class RunMap {

    /** Build a fresh run: city → road graph → waypoints → free-roam adjacency. */
    public static generate(): RunState {
        for (let attempt = 0; attempt < 8; attempt++) {
            const state = RunMap.tryGenerate();
            if (state) { return state; }
        }
        throw new Error("run generation failed");
    }

    private static tryGenerate(): RunState | null {
        const city = generateCity();

        // adjacency of the road graph itself
        const deg: number[] = city.junctions.map(() => 0);
        const roadAdj: Array<Array<{to: number; len: number}>> = city.junctions.map(() => []);
        city.graph.forEach((e) => {
            roadAdj[e.a]!.push({to: e.b, len: e.length});
            roadAdj[e.b]!.push({to: e.a, len: e.length});
            deg[e.a]!++; deg[e.b]!++;
        });

        // candidate junctions: real crossings inside the active district
        const inActive = (p: Pt): boolean =>
            Math.hypot(p.x - city.activeCenter.x, p.z - city.activeCenter.z) < city.activeRadius * 0.92;
        const candidates: number[] = [];
        city.junctions.forEach((j, i) => { if (deg[i]! >= 2 && inActive(j)) { candidates.push(i); } });
        if (candidates.length < NODES) { return null; }

        // farthest-point sampling → spread waypoints across the district
        const chosen: number[] = [];
        chosen.push(candidates[(Math.random() * candidates.length) << 0]!);
        while (chosen.length < NODES) {
            let best = -1, bestD = -1;
            candidates.forEach((c) => {
                if (chosen.indexOf(c) >= 0) { return; }
                const j = city.junctions[c]!;
                let d = Infinity;
                chosen.forEach((s) => {
                    const q = city.junctions[s]!;
                    d = Math.min(d, Math.hypot(j.x - q.x, j.z - q.z));
                });
                if (d > bestD) { bestD = d; best = c; }
            });
            if (best < 0) { break; }
            chosen.push(best);
        }
        if (chosen.length < 8) { return null; }

        // road-network shortest paths from every chosen junction (Dijkstra)
        const routes = chosen.map((c) => RunMap.dijkstra(c, roadAdj, city.junctions.length));

        // entry = waypoint nearest the district edge; boss = farthest by road from entry
        let entryIdx = 0, edgeD = -1;
        chosen.forEach((c, i) => {
            const j = city.junctions[c]!;
            const d = Math.hypot(j.x - city.activeCenter.x, j.z - city.activeCenter.z);
            if (d > edgeD) { edgeD = d; entryIdx = i; }
        });
        let bossIdx = -1, bossD = -1;
        chosen.forEach((_c, i) => {
            const d = routes[entryIdx]!.dist[chosen[i]!]!;
            if (i !== entryIdx && isFinite(d) && d > bossD) { bossD = d; bossIdx = i; }
        });
        if (bossIdx < 0) { return null; }

        // nodes + free-roam adjacency: each node links to its road-nearest
        // neighbours; union-find repairs keep the whole graph connected
        const nodes: RunNode[] = chosen.map((c, i) => ({
            id: "n" + i, type: "combat", junction: c, pos: city.junctions[c]!,
        }));
        const adj: { [id: string]: string[] } = {};
        const paths: { [key: string]: Pt[] } = {};
        nodes.forEach((nd) => adj[nd.id] = []);

        const link = (i: number, k: number): boolean => {
            const a = nodes[i]!, b = nodes[k]!;
            if (adj[a.id]!.indexOf(b.id) >= 0) { return true; }
            const route = RunMap.tracePath(routes[i]!, chosen[i]!, chosen[k]!, city.junctions);
            if (!route) { return false; }
            adj[a.id]!.push(b.id);
            adj[b.id]!.push(a.id);
            paths[edgeKey(a.id, b.id)] = route;
            return true;
        };

        // nearest-by-road links
        nodes.forEach((_nd, i) => {
            const order = nodes.map((_m, k) => k)
                .filter((k) => k !== i && isFinite(routes[i]!.dist[chosen[k]!]!))
                .sort((x, y) => routes[i]!.dist[chosen[x]!]! - routes[i]!.dist[chosen[y]!]!);
            let made = 0;
            for (const k of order) {
                if (made >= NEIGHBOURS && !(made < NEIGHBOURS + 1 && Math.random() < 0.35)) { break; }
                if (link(i, k)) { made++; }
            }
        });
        // connectivity repair
        const root = (parent: number[], i: number): number => {
            while (parent[i]! !== i) { parent[i] = parent[parent[i]!]!; i = parent[i]!; }
            return i;
        };
        const parent = nodes.map((_n, i) => i);
        nodes.forEach((nd, i) => adj[nd.id]!.forEach((other) => {
            const k = parseInt(other.slice(1), 10);
            parent[root(parent, i)] = root(parent, k);
        }));
        for (let guard = 0; guard < NODES * 2; guard++) {
            const comps = new Set(nodes.map((_n, i) => root(parent, i)));
            if (comps.size <= 1) { break; }
            let bi = -1, bk = -1, bd = Infinity;
            nodes.forEach((_a, i) => nodes.forEach((_b, k) => {
                if (k <= i || root(parent, i) === root(parent, k)) { return; }
                const d = routes[i]!.dist[chosen[k]!]!;
                if (isFinite(d) && d < bd) { bd = d; bi = i; bk = k; }
            }));
            if (bi < 0 || !link(bi, bk)) { return null; }
            parent[root(parent, bi)] = root(parent, bk);
        }

        // types: entry is pre-cleared ground; boss farthest; spread the rest
        nodes[bossIdx]!.type = "boss";
        const others = nodes.map((_n, i) => i).filter((i) => i !== entryIdx && i !== bossIdx);
        const shuffled = others.sort(() => Math.random() - 0.5);
        shuffled.forEach((i, k) => {
            nodes[i]!.type = k === 0 ? "merchant" : k === 1 ? "rest"
                : Math.random() < 0.22 ? "elite"
                : Math.random() < 0.18 ? (Math.random() < 0.5 ? "merchant" : "rest")
                : "combat";
        });

        const entry = nodes[entryIdx]!;
        return {
            city, nodes, adj, paths,
            position: entry.id, node: null,
            clearedIds: [entry.id],
            reachableIds: adj[entry.id]!.slice(),
            reviveUsed: false, depth: 0, outcome: "active",
        };
    }

    public static find(state: RunState, id: string): RunNode | null {
        return state.nodes.find((n) => n.id === id) || null;
    }

    // Dijkstra over the road graph from one junction.
    private static dijkstra(from: number, roadAdj: Array<Array<{to: number; len: number}>>, count: number):
        { dist: number[]; prev: number[] } {
        const dist: number[] = new Array(count).fill(Infinity);
        const prev: number[] = new Array(count).fill(-1);
        const done: boolean[] = new Array(count).fill(false);
        dist[from] = 0;
        for (;;) {
            let u = -1, du = Infinity;
            for (let i = 0; i < count; i++) {
                if (!done[i] && dist[i]! < du) { du = dist[i]!; u = i; }
            }
            if (u < 0) { break; }
            done[u] = true;
            roadAdj[u]!.forEach((e) => {
                const nd = du + e.len;
                if (nd < dist[e.to]!) { dist[e.to] = nd; prev[e.to] = u; }
            });
        }
        return {dist, prev};
    }

    /** Reconstruct the street polyline between two junctions from a Dijkstra run. */
    private static tracePath(route: { dist: number[]; prev: number[] }, from: number, to: number,
                             junctions: Pt[]): Pt[] | null {
        if (!isFinite(route.dist[to]!)) { return null; }
        const out: Pt[] = [];
        let cur = to;
        let guard = junctions.length + 2;
        while (cur !== from && guard-- > 0) {
            out.push(junctions[cur]!);
            cur = route.prev[cur]!;
            if (cur < 0) { return null; }
        }
        out.push(junctions[from]!);
        out.reverse();
        return out;
    }
}

export interface EncounterSpec { boss: boolean; amount: number; level: number; }

/** How hard a node's fight is, derived from its type and the party level. */
export function encounterSpec(node: RunNode, level: number): EncounterSpec {
    switch (node.type) {
        case "elite": return {boss: false, amount: 2, level: level + 2};
        case "boss": return {boss: true, amount: 1, level: level + 2};
        default: return {boss: false, amount: 1 + (Math.random() < 0.5 ? 1 : 0), level};
    }
}

/** Mint the actual enemies for an encounter spec. */
export function spawnEncounter(spec: EncounterSpec): Actor[] {
    return spec.boss ? ActorController.getBoss(spec.level) : ActorController.getEnemies(spec.amount, spec.level);
}
