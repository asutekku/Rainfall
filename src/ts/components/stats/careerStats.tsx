import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Bar} from "../general/bar";

export interface CareerStatsProps {
    party: Actor[];
    enemy: Actor;
}

/** Career telemetry: squad totals up top, then a per-member breakdown. */
export class CareerStats extends React.Component<CareerStatsProps, {}> {

    private cell(label: string, value: string | number) {
        return (
            <div className={"redStat"}>
                <span className={"redStatLabel"}>{label}</span>
                <span className={"redStatValue"}>{value}</span>
            </div>);
    }

    private member(a: Actor, i: number) {
        const cond = a.mortallyWounded ? "vital-critical" : a.isSeriouslyWounded() ? "vital-warn" : "vital-good";
        return (
            <div className={"redSection"} key={i}>
                <div className={"redSectionTitle"}>{a.name} · {a.role.name} · Lvl {a.level}</div>
                <div className={"redRow"}>
                    <span className={"redRowMeta"}>Kills</span>
                    <span className={"redRowName"}>{a.kills}</span>
                    <span className={"redRowMeta " + cond}>
                        {a.mortallyWounded ? "MORTAL" : a.isSeriouslyWounded() ? "WOUNDED" : "OK"}
                    </span>
                </div>
                <Bar label={"HP"} value={a.health} max={a.maxHealth} kind={"hp"}/>
                <Bar label={"XP"} value={a.experience} max={a.maxExperience} kind={"xp"}/>
                <Bar label={"HUM"} value={a.humanity} max={a.maxHumanity} kind={"hum"}/>
                <div className={"redRow"}>
                    <span className={"redRowMeta"}>Eddies</span><span className={"redRowName"}>{a.currency}¥</span>
                    <span className={"redRowMeta"}>Rep</span><span className={"redRowName"}>{a.reputation}/10</span>
                    <span className={"redRowMeta"}>Luck</span><span className={"redRowName"}>{a.luck}/{a.maxLuck}</span>
                </div>
            </div>);
    }

    public render() {
        const party = this.props.party || [];
        const kills = party.reduce((n, a) => n + (a.kills || 0), 0);
        const eddies = party.reduce((n, a) => n + (a.currency || 0), 0);
        const topLvl = party.reduce((n, a) => Math.max(n, a.level), 0);
        const standing = party.filter((a) => a.canFight()).length;
        return (
            <div className={"redPanel"}>
                <div className={"redSection"}>
                    <div className={"redSectionTitle"}>Career</div>
                    <div className={"redStatGrid"}>
                        {this.cell("KILLS", kills)}
                        {this.cell("EDDIES", eddies + "¥")}
                        {this.cell("TOP LVL", topLvl)}
                        {this.cell("STANDING", standing + "/" + party.length)}
                        {this.cell("SQUAD", party.length)}
                        {this.cell("THREAT", this.props.enemy ? "Lvl " + this.props.enemy.level : "—")}
                    </div>
                </div>
                {party.map((a, i) => this.member(a, i))}
            </div>);
    }
}
