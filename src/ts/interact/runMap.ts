import {Actor} from "../actors/Actor";
import {ActorController} from "../actors/actorController";

/**
 * Slay-the-Spire-style run map. A run is one Act: a layered graph of nodes with
 * forking forward edges that funnel from a small opening choice down to a single
 * boss. Generation is pure/deterministic-free (browser Math.random) and
 * headless-testable; the App drives navigation by tracking a RunState.
 */
export type NodeType = "combat" | "elite" | "merchant" | "rest" | "boss";

export interface MapNode {
    id: string;
    type: NodeType;
    col: number;
    row: number;
    next: string[];   // ids of reachable nodes in the following column
}

export interface RunState {
    map: MapNode[][];
    node: MapNode | null;      // the node currently being resolved (null while choosing)
    clearedIds: string[];      // resolved node ids
    reachableIds: string[];    // nodes selectable right now
    reviveUsed: boolean;       // the one-per-run Trauma Team revive
    depth: number;             // nodes cleared
    outcome: "active" | "won" | "lost";
}

// Column widths: an opening choice → forks → a single boss (14 nodes, ~one act).
const WIDTHS = [2, 3, 3, 3, 2, 1];

function weightedType(): NodeType {
    const r = Math.random();
    if (r < 0.55) { return "combat"; }
    if (r < 0.70) { return "elite"; }
    if (r < 0.85) { return "merchant"; }
    return "rest";
}

export class RunMap {
    /** Build a fresh act: layered node graph, forking paths, single boss. */
    public static generate(): MapNode[][] {
        const cols: MapNode[][] = WIDTHS.map((w, c) =>
            Array.from({length: w}, (_x, r): MapNode =>
                ({id: `n${c}_${r}`, type: "combat", col: c, row: r, next: []})));
        RunMap.assignTypes(cols);
        RunMap.link(cols);
        return cols;
    }

    /** First-column node ids — the run's opening choices. */
    public static entryIds(map: MapNode[][]): string[] {
        return (map[0] || []).map((n) => n.id);
    }

    public static find(map: MapNode[][], id: string): MapNode | null {
        for (const col of map) { for (const n of col) { if (n.id === id) { return n; } } }
        return null;
    }

    private static assignTypes(cols: MapNode[][]): void {
        const last = cols.length - 1;
        cols.forEach((col, c) => col.forEach((node) => {
            node.type = c === 0 ? "combat" : c === last ? "boss" : weightedType();
        }));
        // Guarantee a Safehouse in the column right before the boss.
        const preBoss = cols[last - 1];
        if (preBoss && preBoss.length && !preBoss.some((n) => n.type === "rest")) {
            preBoss[0]!.type = "rest";
        }
        // Guarantee at least one merchant somewhere in the middle.
        const mid = cols.slice(1, last).reduce((a, c2) => a.concat(c2), [] as MapNode[]);
        if (mid.length && !mid.some((n) => n.type === "merchant")) {
            mid[0]!.type = "merchant";
        }
    }

    /** Wire forward edges so every node is reachable and paths fork sensibly. */
    private static link(cols: MapNode[][]): void {
        for (let c = 0; c < cols.length - 1; c++) {
            const cur = cols[c]!;
            const nxt = cols[c + 1]!;
            cur.forEach((node) => {
                const center = nxt.length === 1 ? 0
                    : Math.round((node.row / Math.max(1, cur.length - 1)) * (nxt.length - 1));
                const targets = new Set<number>([center]);
                if (Math.random() < 0.5) {
                    const step = Math.random() < 0.5 ? -1 : 1;
                    targets.add(Math.max(0, Math.min(nxt.length - 1, center + step)));
                }
                node.next = Array.from(targets).map((t) => nxt[t]!.id);
            });
            // Every node in the next column needs at least one incoming edge.
            nxt.forEach((nn, t) => {
                if (!cur.some((node) => node.next.indexOf(nn.id) >= 0)) {
                    const near = Math.min(cur.length - 1,
                        Math.round((t / Math.max(1, nxt.length - 1)) * (cur.length - 1)));
                    cur[near]!.next.push(nn.id);
                }
            });
        }
    }
}

export interface EncounterSpec { boss: boolean; amount: number; level: number; }

/** How hard a node's fight is, derived from its type and the party level. */
export function encounterSpec(node: MapNode, level: number): EncounterSpec {
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
