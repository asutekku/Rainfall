import {Actor} from "../actors/Actor";
import {ActorController} from "../actors/actorController";
import {City, Pt, generateCity} from "./cityGen";
import {Utils} from "../utils/utils";

/**
 * The run graph, dungeon-style, laid over the city's road network. Waypoints
 * sit ON street junctions inside the active district; the connections between
 * them are real road routes (polylines along the streets). Movement is free:
 * the squad stands on a node and may move to any adjacent node — entering an
 * uncleared node triggers its encounter/screen, entering a cleared one just
 * relocates (so you can backtrack and take other branches). Clearing the boss
 * wins the run.
 */
export type NodeType = "entry" | "combat" | "elite" | "merchant" | "rest" | "hire" | "event" | "net" | "boss";

export interface RunNode {
    id: string;
    type: NodeType;
    junction: number;   // index into city.junctions
    pos: Pt;
    /** holdout objective: survive this many rounds and the hostiles disengage */
    holdout?: number;
}

export interface RunState {
    /** Which sector of the run this map is — drives difficulty and prices. */
    sector: number;
    city: City;
    nodes: RunNode[];
    adj: { [id: string]: string[] };
    paths: { [key: string]: Pt[] };   // edgeKey(a,b) → street polyline
    position: string;                 // node the squad stands on
    node: RunNode | null;             // node currently being resolved
    clearedIds: string[];
    reachableIds: string[];           // neighbours of `position`
    revealedIds: string[];            // fog-of-war waypoints uncovered by intel
    /** The revive allowance is spent (drives every "can revive" gate). */
    reviveUsed: boolean;
    /** Trauma pickups burned this sector — Trauma Platinum chrome raises the allowance. */
    revivesUsed: number;
    depth: number;
    outcome: "active" | "won" | "lost";
}

export const edgeKey = (a: string, b: string): string => (a < b ? a + "~" + b : b + "~" + a);

const NODES = 13;
const NEIGHBOURS = 2;      // road-nearest links per node (plus connectivity repairs)

export class RunMap {

    /** Build a fresh sector: city → road graph → waypoints → free-roam adjacency. */
    public static generate(sector: number = 1): RunState {
        for (let attempt = 0; attempt < 8; attempt++) {
            const state = RunMap.tryGenerate(sector);
            if (state) { return state; }
        }
        throw new Error("run generation failed");
    }

    private static tryGenerate(sector: number): RunState | null {
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

        const link = (i: number, k: number, force: boolean = false): boolean => {
            const a = nodes[i]!, b = nodes[k]!;
            if (adj[a.id]!.indexOf(b.id) >= 0) { return true; }
            const route = RunMap.tracePath(routes[i]!, chosen[i]!, chosen[k]!, city.junctions);
            if (!route) { return false; }
            // no tunnelling: a link may not pass THROUGH another waypoint's
            // junction — that street belongs to the waypoint standing on it
            if (!force) {
                const mid = route.slice(1, -1);
                const blocked = mid.some((p) => chosen.some((c, ci) =>
                    ci !== i && ci !== k &&
                    Math.hypot(p.x - city.junctions[c]!.x, p.z - city.junctions[c]!.z) < 1.0));
                if (blocked) { return false; }
            }
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
            // cross-component pairs by road distance; prefer clean (non-tunnelling)
            // links, fall back to a forced one only if no clean bridge exists
            const pairs: Array<[number, number, number]> = [];
            nodes.forEach((_a, i) => nodes.forEach((_b, k) => {
                if (k <= i || root(parent, i) === root(parent, k)) { return; }
                const d = routes[i]!.dist[chosen[k]!]!;
                if (isFinite(d)) { pairs.push([i, k, d]); }
            }));
            pairs.sort((x, y) => x[2] - y[2]);
            let bridged = false;
            for (const [i, k] of pairs) {
                if (link(i, k)) { parent[root(parent, i)] = root(parent, k); bridged = true; break; }
            }
            if (!bridged) {
                const first = pairs[0];
                if (!first || !link(first[0], first[1], true)) { return null; }
                parent[root(parent, first[0])] = root(parent, first[1]);
            }
        }

        // types: entry is pre-cleared ground; boss farthest; spread the rest.
        // The entry is typed for what it is. It used to keep the "combat" every
        // node is minted with, which put a firefight marker on the one waypoint
        // that can never be one — and made it impossible to count the fights a
        // squad has actually had, because the free one was always in the ledger.
        nodes[entryIdx]!.type = "entry";
        nodes[bossIdx]!.type = "boss";
        const others = nodes.map((_n, i) => i).filter((i) => i !== entryIdx && i !== bossIdx);
        const shuffled = others.sort(() => Math.random() - 0.5);
        // Four guaranteed stops — a shop, a safehouse, a hire board and a NET
        // jack-point — because each is load-bearing and none can be a map
        // lottery. The hire board most of all: crew size is the single biggest
        // lever on whether a fight is winnable (an elite runs 20% with a squad
        // of two and 70% with a squad of four), so a sector that never offers
        // one is a sector you lose.
        //
        // Everything else is trouble. The street event used to be guaranteed as
        // well, on top of a 24% roll for more of them, which left barely two
        // fights in five and made a sector read as a shopping trip with
        // occasional gunfire.
        const extra: NodeType[] = ["merchant", "rest", "hire", "net"];
        shuffled.forEach((i, k) => {
            nodes[i]!.type = k === 0 ? "merchant" : k === 1 ? "rest" : k === 2 ? "hire" : k === 3 ? "net"
                : Math.random() < 0.14 ? "event"
                : (sector > 1 && Math.random() < 0.24) ? "elite"
                : Math.random() < 0.1 ? Utils.pickRandom(extra)
                : "combat";
        });

        const entry = nodes[entryIdx]!;
        return {
            sector, city, nodes, adj, paths,
            position: entry.id, node: null,
            clearedIds: [entry.id],
            reachableIds: adj[entry.id]!.slice(),
            revealedIds: [],
            reviveUsed: false, revivesUsed: 0, depth: 0, outcome: "active",
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

export interface EncounterSpec {
    boss: boolean;
    amount: number;
    level: number;
    rank: number;
    /** firefights sometimes come with a clock: survive N rounds instead of clearing */
    holdout?: number;
}

/**
 * How many firefights a squad gets through before the street stops going easy
 * on them.
 *
 * A run opens two-strong with a sidearm and one free rookie, and the map gives
 * 19% of runs no first move that isn't a firefight — so the opening fights of a
 * run are the shakedown, not the job. Measured over 1760 of them, the two-strong
 * squad won 48%: not a difficulty, a coin toss on the faction draw, resolved
 * before the player had made a single decision.
 *
 * Counted in fights and not in waypoints on purpose. Waypoints would let a
 * shopping trip spend the allowance — walk to the fixer and the safehouse first,
 * which is exactly what a careful player does, and the shakedown is over before
 * the first shot.
 */
const SHAKEDOWN = 2;

/** Firefights the squad has already cleared this sector. */
export function fightsCleared(state: RunState): number {
    return state.nodes.filter((n) => state.clearedIds.indexOf(n.id) >= 0
        && (n.type === "combat" || n.type === "elite" || n.type === "boss")).length;
}

/**
 * How hard a node's fight is. The sector drives it, not the party's level:
 * a character who survives several runs keeps their levels but starts each run
 * in basic kit, and scaling off party level would erase that progress by
 * spawning level-20 gangers in sector 1. A strong crew still nudges it up a
 * little, so the curve doesn't go flat.
 *
 * `fought` is how many firefights the squad has already cleared this sector, and
 * it carries the ramp *inside* a sector. Without it every firefight in sector 1
 * was the same fight: the one you walk into off the boot screen with two bodies
 * and a sidearm was rolled from the same table as the one before the boss, by
 * which point you have a four-strong crew and salvage.
 */
export function encounterSpec(node: RunNode, sector: number, partyLevel: number,
                              fought: number = 0): EncounterSpec {
    const base = Math.max(1, sector + Math.floor(partyLevel / 4));
    // Boss rank climbs with the sector: sector 1 fields a ganger boss, the
    // Flak-and-MetalGear tier only shows up once the crew can punch through it.
    const bossRank = Math.max(2, Math.min(5, 1 + Math.ceil(sector / 2)));
    switch (node.type) {
        case "elite": return {boss: false, amount: 3, level: base + 1, rank: 3};
        case "boss": return {boss: true, amount: 1, level: base + 2, rank: bossRank};
        default:
            // The shakedown: street mooks. `rank: 1` forces the rank-1 archetype
            // tier the way an elite node forces rank 3 — Street punks, Scav
            // harvesters and Bozos boosters, which is what "the first enemies you
            // meet" was always meant to mean. Three of them, same as any other
            // firefight: the shakedown is the tier of the opposition, not a
            // smaller fight. Two bodies resolved in 2.6 rounds with the squad
            // barely scratched, which is a cutscene, not an opening fight.
            if (sector <= 1 && fought < SHAKEDOWN) {
                return {boss: false, amount: 3, level: base, rank: 1};
            }
            return {
                boss: false,
                // never fewer than 3 — a 2v1 auto-resolves before the street even
                // loads. The fourth body waits until the crew has had a payday or
                // two to grow into one.
                amount: 3 + (fought >= SHAKEDOWN + 2 && Math.random() < 0.35 ? 1 : 0),
                level: base, rank: 0,
                // A quarter of firefights carry a holdout clock: survive, don't
                // sweep. Never on a sector's opening fights — a clock on a fight
                // you were already losing is a second punishment, and it landed
                // on a quarter of first contacts.
                ...(fought >= SHAKEDOWN && Math.random() < 0.25 ? {holdout: 4} : {}),
            };
    }
}

/** Mint the actual enemies for an encounter spec. */
export function spawnEncounter(spec: EncounterSpec): Actor[] {
    if (spec.boss) { return ActorController.getBoss(spec.level, spec.rank); }
    // rank > 0 forces the archetype tier, which is what makes an "elite contact"
    // read as one rather than as two ordinary gangers a level higher.
    return spec.rank > 0
        ? ActorController.getEliteWave(spec.amount, spec.level, spec.rank)
        : ActorController.getEnemies(spec.amount, spec.level);
}
