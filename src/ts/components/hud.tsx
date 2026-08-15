import * as React from "react";
import {Actor} from "../actors/Actor";

export interface HudProps {
    actor: Actor;
}

interface HudState { loot: number; }

/** Ops-console topbar: brand + always-visible vitals + eddies (with a loot pulse). */
export class Hud extends React.Component<HudProps, HudState> {

    private lastEddies = -1;
    private timer: any = null;

    constructor(props: HudProps) {
        super(props);
        this.state = {loot: 0};
        this.lastEddies = props.actor ? props.actor.currency : -1;
    }

    public componentDidUpdate() {
        const cur = this.props.actor ? this.props.actor.currency : 0;
        if (this.lastEddies >= 0 && cur > this.lastEddies) {
            const gain = cur - this.lastEddies;
            this.setState({loot: gain});
            if (this.timer) { clearTimeout(this.timer); }
            this.timer = setTimeout(() => this.setState({loot: 0}), 1400);
        }
        this.lastEddies = cur;
    }

    public componentWillUnmount() { if (this.timer) { clearTimeout(this.timer); } }

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
                <span className={"eddies" + (this.state.loot ? " looting" : "")}>
                    {this.state.loot ? <em className={"lootGain"}>+{this.state.loot}¥</em> : null}
                    {a.currency}¥
                </span>
            </header>);
    }
}
