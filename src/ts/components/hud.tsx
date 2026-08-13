import * as React from "react";
import {Actor} from "../actors/Actor";

export interface HudProps {
    actor: Actor;
}

/** Ops-console topbar: brand + always-visible vitals + eddies, spanning the grid. */
export class Hud extends React.Component<HudProps, {}> {

    private mini(label: string, value: number, max: number, fill: string) {
        const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
        return (
            <span className={"mini"}>
                {label}
                <span className={"bar"} style={{width: 84}}>
                    <i style={{width: pct + "%", background: fill}}/>
                </span>
                <b>{Math.round(value)}/{max}</b>
            </span>);
    }

    public render() {
        const a = this.props.actor;
        if (!a) { return null; }
        const condition = a.mortallyWounded ? "MORTAL" : a.isSeriouslyWounded() ? "WOUNDED" : "OK";
        const condClass = condition === "OK" ? "vital-good" : condition === "WOUNDED" ? "vital-warn" : "vital-critical";
        return (
            <header>
                <span className={"brand"}>RAINFALL</span>
                {this.mini("HP", a.health, a.maxHealth, "linear-gradient(90deg,#4f9a4f,#7fd67f)")}
                {this.mini("HUM", a.humanity, a.maxHumanity, "linear-gradient(90deg,#6a37a0,#b06fe0)")}
                <span className={"mini"}>REP <b>{a.reputation}</b></span>
                <span className={"mini"}>LUCK <b>{a.luck}/{a.maxLuck}</b></span>
                <span className={"mini " + condClass}>{condition}</span>
                <span className={"eddies"}>{a.currency}¥</span>
            </header>);
    }
}
