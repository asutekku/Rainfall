import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Battlefield} from "../../interact/battlefield";

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

interface Unit { actor: Actor; kind: string; }

/**
 * Isometric tactical arena. Units render at their real battlefield position
 * (metres), projected to iso screen space by Battlefield.project — the same
 * coordinates the RED range maths uses, so the picture matches the dice.
 */
export class IsoMap extends React.Component<IsoMapProps, {}> {

    /** Near edge = squad, far edge = hostiles. */
    private layout(): Unit[] {
        const out: Unit[] = [];
        this.props.party.forEach((a, i) => out.push({actor: a, kind: i === 0 ? "you" : "ally"}));
        this.props.enemies.forEach((a) => out.push({actor: a, kind: "foe"}));
        return out;
    }

    private token(u: Unit) {
        const p = Battlefield.project(u.actor.position);
        const a = u.actor;
        const foe = u.kind === "foe";
        const active = foe ? a.name === this.props.activeEnemy : a.name === this.props.activeAlly;
        const hpPct = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        const glyph = foe ? "✦" : u.kind === "you" ? "◈" : "◇";
        return (
            <button key={u.kind + a.name}
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
        const p = Battlefield.project(foe.actor.position);
        return (
            <div className={"isoFloat"} style={{left: p.x + "%", top: p.y + "%"}}>
                {list.map((f) => <span key={f.id} className={"floater floater-" + f.kind}>{f.text}</span>)}
            </div>);
    }

    private cover() {
        return Battlefield.COVER.map((c, i) => {
            const p = Battlefield.project(c);
            return <span key={"cov" + i} className={"cover"} style={{left: p.x + "%", top: p.y + "%"}}/>;
        });
    }

    public render() {
        return (
            <div className={"iso" + (this.props.mini ? " mini" : " full")}>
                <div className={"floor"}/>
                {this.cover()}
                {this.layout().map((u) => this.token(u))}
                {!this.props.mini && this.floaters()}
            </div>);
    }
}
