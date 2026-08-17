import * as React from "react";
import {Actor} from "../../actors/Actor";
import {hudTags} from "./hudInfo";

export interface BattleHudProps {
    party: Actor[];
    enemies: Actor[];
    /** The unit acting right now (head of the initiative queue). */
    acting: Actor | null;
    /** The unit that acts after this one — the only other part of the queue worth showing. */
    next: Actor | null;
    /** The unit whose card is open, so the row it came from reads as picked. */
    selected: Actor | null;
    onSelect: (a: Actor) => void;
}

/**
 * Phone battle HUD — sits where the docked feed used to, under the arena.
 * One fixed-height board: squad column left, hostiles column right, every unit
 * a two-line row (name + state chips over HP bar + health left). Nothing in
 * here changes size mid-fight: the acting unit's outline is a box-shadow and
 * its TURN tag an absolute pseudo-element, so a highlight can never nudge a
 * neighbour. Desktop never shows this (CSS keeps the log).
 *
 * Two rules the rest of the battle UI leans on:
 *
 * - **The left border is the IFF and nothing else.** Cyan is you, green is
 *   your crew, red is theirs. Faction accents used to paint this edge, which
 *   put a Chrome ganger in the same cyan as your own merc — the one colour
 *   that must never be ambiguous. Faction identity lives in the 3D silhouette
 *   and the contact banner, exactly as factionStyles intends.
 * - **Health is a number, not a mood.** The bar shows the shape, the figure at
 *   the end says whether the 34 that just floated off someone was lethal.
 */
export class BattleHud extends React.Component<BattleHudProps, {}> {

    private row(a: Actor, foe: boolean, i: number) {
        const out = !a.canFight() && !a.mortallyWounded;
        const hpPct = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        const hpCls = hpPct > 60 ? "h-good" : hpPct > 30 ? "h-warn" : "h-crit";
        const cls = "bhRow" + (foe ? " foe" : i === 0 ? " you" : " pal")
            + (a === this.props.acting ? " on" : a === this.props.next ? " nxt" : "")
            + (out ? " out" : "")
            + (a === this.props.selected ? " sel" : "");
        return (
            <button key={(foe ? "e" : "p") + i} className={cls}
                    onClick={() => this.props.onSelect(a)}>
                <span className={"bhTop"}>
                    <b className={"bhName"}>{a.name}</b>
                    <span className={"bhTags"}>
                        {hudTags(a).map(([label, c], k) => <i key={k} className={c}>{label}</i>)}
                    </span>
                </span>
                <span className={"bhBot"}>
                    <span className={"bhBar"}><i className={hpCls} style={{width: hpPct + "%"}}/></span>
                    <b className={"bhHp " + hpCls}>{Math.max(0, Math.ceil(a.health))}</b>
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
                    <h5>✦ HOSTILES · {living} LEFT</h5>
                    <div className={"bhList"}>{this.props.enemies.map((a, i) => this.row(a, true, i))}</div>
                </div>
            </div>);
    }
}
