import * as React from "react";
import {Actor} from "../actors/Actor";
import {Bar} from "./general/bar";

export interface HudProps {
    actor: Actor;
}

/** Persistent vitals strip pinned to the top bar — always-visible HP/Humanity/eddies/rep. */
export class Hud extends React.Component<HudProps, {}> {
    public render() {
        const a = this.props.actor;
        if (!a) { return null; }
        const condition = a.mortallyWounded ? "MORTAL" : a.isSeriouslyWounded() ? "WOUNDED" : "OK";
        return (
            <div className={"hud"}>
                <div className={"hudId"}>
                    <span className={"hudName"}>{a.name}</span>
                    <span className={"hudRole"}>{a.role.name} · Lvl {a.level}</span>
                </div>
                <div className={"hudBars"}>
                    <Bar label={"HP"} value={a.health} max={a.maxHealth} kind={"hp"}/>
                    <Bar label={"HUM"} value={a.humanity} max={a.maxHumanity} kind={"hum"}/>
                    <Bar label={"XP"} value={a.experience} max={a.maxExperience} kind={"xp"}/>
                </div>
                <div className={"hudChips"}>
                    <span className={"hudChip hudEddies"}>{a.currency}¥</span>
                    <span className={"hudChip"}>REP {a.reputation}</span>
                    <span className={"hudChip"}>LUCK {a.luck}/{a.maxLuck}</span>
                    <span className={"hudChip " + (condition === "OK" ? "vital-good" : condition === "WOUNDED" ? "vital-warn" : "vital-critical")}>{condition}</span>
                </div>
            </div>);
    }
}
