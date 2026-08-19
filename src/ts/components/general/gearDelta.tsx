import * as React from "react";
import type {Actor} from "../../actors/Actor";
import type {Armor} from "../../items/Armor";
import type {Weapon} from "../../items/Weapon";
import {Gear, StatDelta} from "../../interact/gear";

/**
 * The swap-decision UI, shared by every screen that changes hands: delta
 * chips for reading a list at a glance, and the head-to-head card for the
 * moment before committing. Both lean on Gear's honest verdict — a weapon
 * that hits harder but reaches shorter is a trade-off (◆), not an upgrade,
 * because which stat matters depends on who's holding it.
 */

/** "DMG +3.5", "RNG −150m", "+AP" — one moved stat, one chip. */
const chipText = (d: StatDelta): string => {
    if (d.stat === "AP" || d.stat === "AUTO") { return (d.delta > 0 ? "+" : "−") + d.stat; }
    const n = Math.round(Math.abs(d.delta) * 10) / 10;
    return `${d.stat} ${d.delta > 0 ? "+" : "−"}${n}${d.stat === "RNG" ? "m" : ""}`;
};

/** Every stat the candidate moves, colored by direction. Quiet when even. */
export function GdChips(props: {cur: Weapon; w: Weapon}) {
    const moved = Gear.compare(props.cur, props.w).filter((d) => d.delta !== 0);
    if (!moved.length) { return <span className={"gdChips"}><i className={"gdChip"}>even swap</i></span>; }
    return (
        <span className={"gdChips"}>
            {moved.map((d, i) => (
                <i key={i} className={"gdChip " + (d.mode ? "tr" : d.delta > 0 ? "up" : "dn")}>
                    {chipText(d)}</i>))}
        </span>);
}

/** Armour is one number: the SP swing in this piece's slot. */
export function GdArmorChips(props: {a: Actor; piece: Armor}) {
    const d = Gear.armorDelta(props.a, props.piece);
    return (
        <span className={"gdChips"}>
            <i className={"gdChip" + (d > 0 ? " up" : d < 0 ? " dn" : "")}>
                {d === 0 ? "SP even" : `SP ${d > 0 ? "+" : "−"}${Math.abs(d)}`}</i>
        </span>);
}

/**
 * The head-to-head: in-hand vs candidate, stat by stat, better cell lit.
 * The commit button lives here — reading comes before swapping.
 */
export function GdCard(props: {cur: Weapon; w: Weapon; act: string; onAct: () => void}) {
    const v = Gear.verdict(props.cur, props.w);
    return (
        <div className={"gdCard"}>
            <div className={"gdVs v-" + v}>{Gear.VERDICT_GLYPH[v]} {Gear.verdictLine(props.cur, props.w)}</div>
            <table className={"gdTable"}>
                <thead>
                    <tr>
                        <th/>
                        <th><em>in hand</em>{props.cur.name}</th>
                        <th><em>this one</em>{props.w.name}</th>
                    </tr>
                </thead>
                <tbody>
                    {Gear.compare(props.cur, props.w).map((d, i) => (
                        <tr key={i}>
                            <td>{d.stat}</td>
                            <td className={!d.mode && d.delta < 0 ? "win" : ""}>{d.cur}</td>
                            <td className={!d.mode && d.delta > 0 ? "win" : ""}>{d.next}</td>
                        </tr>))}
                </tbody>
            </table>
            <button className={"gdGo"} onClick={props.onAct}>{props.act}</button>
        </div>);
}

/** Armour's smaller moment: the SP swing, and where the old piece goes. */
export function GdArmorCard(props: {a: Actor; piece: Armor; act: string; onAct: () => void}) {
    const old = Gear.displaced(props.a, props.piece);
    const d = Gear.armorDelta(props.a, props.piece);
    const slot = props.piece.bodyPart === "headgear" ? "head" : "body";
    return (
        <div className={"gdCard"}>
            <div className={"gdVs " + (d > 0 ? "v-up" : d < 0 ? "v-down" : "v-same")}>
                {d > 0 ? "▲" : d < 0 ? "▼" : "="} {slot} · SP {old ? old.stoppingPower : 0} → {props.piece.stoppingPower}
            </div>
            <p className={"gdNote"}>{old
                ? `The ${old.name} goes back into The Stash.`
                : "Nothing worn there now."}</p>
            <button className={"gdGo"} onClick={props.onAct}>{props.act}</button>
        </div>);
}
