import * as React from "react";
import {Actor} from "../../actors/Actor";

export interface Floater { id: number; text: string; kind: string; }

export interface IsoMapProps {
    party: Actor[];
    enemies: Actor[];
    activeAlly?: string;
    activeEnemy?: string;
    mini?: boolean;
    onSelect?: (a: Actor) => void;
    floaters?: Floater[];      // shown over the active enemy token (full map only)
}

interface Unit { actor: Actor; kind: string; c: number; r: number; }

/**
 * Isometric tactical arena. Units are placed on a board (col,row) and projected
 * to iso screen space. Board cells are display-only for now — swap the layout()
 * assignment for `actor.position` once real map distance/positioning lands.
 */
export class IsoMap extends React.Component<IsoMapProps, {}> {

    /** Near edge = squad, far edge = hostiles. */
    private layout(): Unit[] {
        const out: Unit[] = [];
        this.props.party.forEach((a, i) => {
            out.push({actor: a, kind: i === 0 ? "you" : "ally", c: 2 + i * 2, r: 6 - (i % 2)});
        });
        this.props.enemies.forEach((a, i) => {
            out.push({actor: a, kind: "foe", c: 3 + (i % 5), r: 1 + (i % 2)});
        });
        return out;
    }

    /** Board (col,row) -> percentage position inside the arena, iso-projected. */
    private proj(c: number, r: number): { x: number; y: number } {
        return {x: 50 + (c - r) * 6, y: 26 + (c + r) * 5};
    }

    private token(u: Unit) {
        const p = this.proj(u.c, u.r);
        const a = u.actor;
        const foe = u.kind === "foe";
        const active = foe ? a.name === this.props.activeEnemy : a.name === this.props.activeAlly;
        const hpPct = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        const glyph = foe ? "✦" : u.kind === "you" ? "◈" : "◇";
        return (
            <button key={u.kind + a.name + u.c + u.r}
                    className={"u " + u.kind + (active ? " on" : "") + (a.canFight() ? "" : " down")}
                    style={{left: p.x + "%", top: p.y + "%"}}
                    onClick={() => this.props.onSelect && this.props.onSelect(a)}>
                <div className={"g"}>{glyph}</div>
                <div className={"stem"}/>
                <div className={"tag"}><b>{a.name}</b> <span>L{a.level}</span></div>
                {foe && <div className={"hp"}><i style={{width: hpPct + "%"}}/></div>}
            </button>);
    }

    private floaters() {
        const list = this.props.floaters || [];
        if (!list.length || !this.props.activeEnemy) { return null; }
        const foe = this.layout().filter((u) => u.kind === "foe")
            .find((u) => u.actor.name === this.props.activeEnemy);
        if (!foe) { return null; }
        const p = this.proj(foe.c, foe.r);
        return (
            <div className={"isoFloat"} style={{left: p.x + "%", top: p.y + "%"}}>
                {list.map((f) => <span key={f.id} className={"floater floater-" + f.kind}>{f.text}</span>)}
            </div>);
    }

    public render() {
        return (
            <div className={"iso" + (this.props.mini ? " mini" : " full")}>
                <div className={"floor"}/>
                {this.layout().map((u) => this.token(u))}
                {!this.props.mini && this.floaters()}
            </div>);
    }
}
