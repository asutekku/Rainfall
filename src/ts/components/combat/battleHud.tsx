import * as React from "react";
import {Actor} from "../../actors/Actor";
import {accentCss} from "../../actors/resources/factionStyles";
import {hudArmor, hudTags} from "./hudInfo";

export interface BattleHudProps {
    party: Actor[];
    enemies: Actor[];
    /** The unit acting right now (orders holder or head of the initiative queue). */
    acting: Actor | null;
    /** The hostile currently targeted, so manual aiming reads on the board. */
    target: Actor | null;
    onSelectAlly: (a: Actor) => void;
    onSelectEnemy: (a: Actor) => void;
}

/**
 * Phone battle HUD — sits where the docked feed used to, under the arena.
 * One fixed-height board: squad column left, hostiles column right, every unit
 * a two-line row (name + state chips over HP bar + armor). The acting unit
 * carries the thick outline and TURN tag via box-shadow and an absolute
 * pseudo-element, so the highlight can never nudge a neighbour — nothing in
 * here changes size mid-fight. Desktop never shows this (CSS keeps the log).
 */
export class BattleHud extends React.Component<BattleHudProps, {}> {

    private row(a: Actor, foe: boolean, i: number) {
        const acting = a === this.props.acting;
        const marked = (foe ? this.props.party : this.props.enemies).some((o) => o.marking === a);
        const out = !a.canFight() && !a.mortallyWounded;
        const hpPct = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        const hpCls = hpPct > 60 ? "h-good" : hpPct > 30 ? "h-warn" : "h-crit";
        const accent = foe ? accentCss(a.faction) : i === 0 ? "var(--cyan)" : "var(--good)";
        const cls = "bhRow" + (foe ? " foe" : i === 0 ? " you" : " pal")
            + (acting ? " on" : "") + (out ? " out" : "")
            + (foe && a === this.props.target ? " tgt" : "");
        return (
            <button key={(foe ? "e" : "p") + i} className={cls}
                    style={{borderLeftColor: accent}}
                    onClick={() => foe ? this.props.onSelectEnemy(a) : this.props.onSelectAlly(a)}>
                <span className={"bhTop"}>
                    <b className={"bhName"}>{a.name}</b>
                    <span className={"bhTags"}>
                        {hudTags(a, marked).map(([label, c], k) => <i key={k} className={c}>{label}</i>)}
                    </span>
                </span>
                <span className={"bhBot"}>
                    <span className={"bhBar"}><i className={hpCls} style={{width: hpPct + "%"}}/></span>
                    <span className={"bhSp"}>SP {hudArmor(a)}</span>
                </span>
            </button>);
    }

    public override render() {
        const living = this.props.enemies.filter((e) => e.canFight()).length;
        return (
            <div className={"bhud"}>
                <div className={"bhCol"}>
                    <h5>◈ SQUAD</h5>
                    <div className={"bhList"}>{this.props.party.map((a, i) => this.row(a, false, i))}</div>
                </div>
                <div className={"bhCol"}>
                    <h5>✦ HOSTILES {living}/{this.props.enemies.length}</h5>
                    <div className={"bhList"}>{this.props.enemies.map((a, i) => this.row(a, true, i))}</div>
                </div>
            </div>);
    }
}
