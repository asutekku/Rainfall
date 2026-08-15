import * as React from "react";
import {Actor} from "../../actors/Actor";
import {MapNode, NodeType} from "../../interact/runMap";
import {Bar} from "../general/bar";

const GLYPH: { [k in NodeType]: string } = {
    combat: "✦", elite: "☠", merchant: "▤", rest: "☾", boss: "⚑",
};
const LABEL: { [k in NodeType]: string } = {
    combat: "Firefight", elite: "Elite", merchant: "Black Market", rest: "Safehouse", boss: "Boss",
};

export interface MapViewProps {
    map: MapNode[][];
    reachableIds: string[];
    clearedIds: string[];
    party: Actor[];
    onPick: (node: MapNode) => void;
    onAbandon: () => void;
}

/**
 * Full-screen run map (a Creator-style takeover). Nodes are projected onto a
 * left→right grid — column = progress, row = branch — with SVG edges between
 * linked nodes. Only nodes reachable from the squad's current position are
 * enabled; cleared nodes are marked done.
 */
export class MapView extends React.Component<MapViewProps, {}> {

    private pos(node: MapNode): { x: number; y: number } {
        const w = this.props.map[node.col]!.length;
        return {x: ((node.col + 0.5) / this.props.map.length) * 100, y: ((node.row + 0.5) / w) * 100};
    }

    private findNode(id: string): MapNode | null {
        for (const col of this.props.map) { for (const n of col) { if (n.id === id) { return n; } } }
        return null;
    }

    private edges(): React.JSX.Element[] {
        const lines: React.JSX.Element[] = [];
        this.props.map.forEach((col) => col.forEach((node) => {
            const a = this.pos(node);
            const live = this.props.reachableIds.indexOf(node.id) >= 0
                || this.props.clearedIds.indexOf(node.id) >= 0;
            node.next.forEach((id) => {
                const t = this.findNode(id);
                if (!t) { return; }
                const b = this.pos(t);
                lines.push(<line key={node.id + "-" + id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                 className={"redge" + (live ? " live" : "")}/>);
            });
        }));
        return lines;
    }

    public override render() {
        const eddies = this.props.party.reduce((n, p) => n + Math.floor(p.currency), 0);
        return (
            <div className={"runWrap"}>
                <header className={"runHead"}>
                    <span className={"brand"}>RAINFALL</span>
                    <span className={"runSub"}>THE JOB · choose your route</span>
                    <span className={"runSquad"}>
                        {this.props.party.map((p, i) => (
                            <span key={i} className={"runPip" + (p.canFight() ? "" : " down")} title={p.name}>
                                <b>{p.name.split(" ")[0]}</b>
                                <Bar value={p.health} max={p.maxHealth} kind={"hp"} showText={false}/>
                            </span>
                        ))}
                    </span>
                    <span className={"runEddies"}>{eddies}¥</span>
                    <button className={"runAbandon"} onClick={this.props.onAbandon}>Abandon</button>
                </header>
                <div className={"runMap"}>
                    <svg className={"runEdges"} viewBox={"0 0 100 100"} preserveAspectRatio={"none"}>
                        {this.edges()}
                    </svg>
                    {this.props.map.map((col) => col.map((node) => {
                        const p = this.pos(node);
                        const reachable = this.props.reachableIds.indexOf(node.id) >= 0;
                        const cleared = this.props.clearedIds.indexOf(node.id) >= 0;
                        return (
                            <button key={node.id}
                                    className={"rn " + node.type + (reachable ? " on" : "") + (cleared ? " done" : "")}
                                    style={{left: p.x + "%", top: p.y + "%"}}
                                    disabled={!reachable}
                                    title={LABEL[node.type]}
                                    onClick={() => this.props.onPick(node)}>
                                <span className={"rnG"}>{GLYPH[node.type]}</span>
                                <span className={"rnL"}>{LABEL[node.type]}</span>
                            </button>);
                    }))}
                </div>
            </div>);
    }
}
