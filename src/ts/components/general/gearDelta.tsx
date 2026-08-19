import * as React from "react";
import type {Actor} from "../../actors/Actor";
import type {Armor} from "../../items/Armor";
import type {Weapon} from "../../items/Weapon";
import {Gear, StatDelta} from "../../interact/gear";

/**
 * The swap-decision UI, shared by every screen that changes hands.
 *
 * Every listed item prints the same one-line stat readout — absolute numbers,
 * not deltas — and when there's something in hand to compare against, each
 * number is inked by how it stacks up: green better, red worse, plain even.
 * The verdict stays honest (see Gear.verdict): a gun that hits harder but
 * reaches shorter is a trade-off, because which stat matters depends on who's
 * holding it. The head-to-head card shows both columns with delta icons; its
 * button is the only thing that commits.
 */

/** Ink for one stat: green better, red worse, plain even (or nothing to compare). */
const tone = (compared: boolean, d: StatDelta): string =>
    !compared || d.mode ? "" : d.delta > 0.05 ? " up" : d.delta < -0.05 ? " dn" : "";

/**
 * The one-line stat readout every weapon row carries: "DMG 9 · ROF 2 · RNG 50m",
 * plus AP/AUTO flags when they apply. Pass `cur` to ink each number against
 * what's in hand; leave it out for the equipped row's plain print.
 */
export function GdStats(props: {cur?: Weapon | undefined; w: Weapon}) {
    const compared = !!props.cur;
    const rows = Gear.compare(props.cur || props.w, props.w);
    const seg = (stat: string) => rows.find((r) => r.stat === stat)!;
    const line = [seg("DMG"), seg("ROF"), seg("RNG")];
    const acc = seg("ACC");
    if (acc.cur !== "0" || acc.next !== "0") { line.splice(1, 0, acc); }
    return (
        <span className={"gdStats"}>
            {line.map((d, i) => <i key={i} className={"gdStat" + tone(compared, d)}>{d.stat} {d.next}</i>)}
            {props.w.ap &&
                <i className={"gdStat" + (compared && !props.cur!.ap ? " up" : "")}>AP</i>}
            {compared && props.cur!.ap && !props.w.ap &&
                <i className={"gdStat dn"}>−AP</i>}
            {props.w.autofire && <i className={"gdStat"}>AUTO</i>}
        </span>);
}

/** Armour's readout is one number: the piece's SP, inked against the slot. */
export function GdArmorStats(props: {a?: Actor | undefined; piece: Armor}) {
    const d = props.a ? Gear.armorDelta(props.a, props.piece) : 0;
    return (
        <span className={"gdStats"}>
            <i className={"gdStat" + (props.a ? (d > 0 ? " up" : d < 0 ? " dn" : "") : "")}>
                SP {props.piece.stoppingPower}</i>
        </span>);
}

/** ▲/▼/= for one stat of the head-to-head. */
const delta = (d: StatDelta): {glyph: string; cls: string} =>
    d.mode || Math.abs(d.delta) <= 0.05 ? {glyph: "=", cls: ""}
        : d.delta > 0 ? {glyph: "▲", cls: " up"} : {glyph: "▼", cls: " dn"};

/**
 * The head-to-head: equipped vs candidate, stat by stat, each row closing on
 * a delta icon. Slides open under the tapped row at the row's own width.
 */
export function GdCard(props: {cur: Weapon; w: Weapon; act: string; onAct: () => void}) {
    return (
        <div className={"gdCard"}>
            <table className={"gdTable"}>
                <thead>
                    <tr>
                        <th/>
                        <th><em>equipped</em>{props.cur.name}</th>
                        <th>{props.w.name}</th>
                        <th/>
                    </tr>
                </thead>
                <tbody>
                    {Gear.compare(props.cur, props.w).map((d, i) => {
                        const ic = delta(d);
                        return (
                            <tr key={i}>
                                <td>{d.stat}</td>
                                <td>{d.cur}</td>
                                <td className={"gdV" + ic.cls}>{d.next}</td>
                                <td className={"gdIco" + ic.cls}>{ic.glyph}</td>
                            </tr>);
                    })}
                </tbody>
            </table>
            <button className={"gdGo"} onClick={props.onAct}>{props.act}</button>
        </div>);
}

/** Armour's smaller moment: worn vs candidate, one SP row, one icon. */
export function GdArmorCard(props: {a: Actor; piece: Armor; act: string; onAct: () => void}) {
    const old = Gear.displaced(props.a, props.piece);
    const d = props.a ? Gear.armorDelta(props.a, props.piece) : 0;
    const ic = d === 0 ? {glyph: "=", cls: ""} : d > 0 ? {glyph: "▲", cls: " up"} : {glyph: "▼", cls: " dn"};
    return (
        <div className={"gdCard"}>
            <table className={"gdTable"}>
                <thead>
                    <tr>
                        <th/>
                        <th><em>equipped</em>{old ? old.name : "nothing"}</th>
                        <th>{props.piece.name}</th>
                        <th/>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>SP</td>
                        <td>{old ? old.stoppingPower : 0}</td>
                        <td className={"gdV" + ic.cls}>{props.piece.stoppingPower}</td>
                        <td className={"gdIco" + ic.cls}>{ic.glyph}</td>
                    </tr>
                </tbody>
            </table>
            <button className={"gdGo"} onClick={props.onAct}>{props.act}</button>
        </div>);
}
