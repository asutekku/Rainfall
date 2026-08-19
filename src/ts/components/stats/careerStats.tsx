import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Bar} from "../general/bar";
import {CareerStore} from "../../interact/career";
import {Purse} from "../../interact/crew";

export interface CareerStatsProps {
    party: Actor[];
    enemy?: Actor | undefined;
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
                    <span className={"redRowMeta"}>Eddies</span><span className={"redRowName"}>{Purse.balance(a)}¥</span>
                    <span className={"redRowMeta"}>Rep</span><span className={"redRowName"}>{a.reputation}/10</span>
                    <span className={"redRowMeta"}>Luck</span><span className={"redRowName"}>{a.luck}/{a.maxLuck}</span>
                </div>
            </div>);
    }

    /** The all-time record — what survives every wipe. Was on the title; lives here now. */
    private record() {
        const c = CareerStore.load();
        if (!c) { return null; }
        return (
            <div className={"redSection"}>
                <div className={"redSectionTitle"}>The record</div>
                <div className={"redStatGrid"}>
                    {this.cell("RUNS", c.runs)}
                    {this.cell("KILLS", c.kills)}
                    {this.cell("BEST", "Sector " + c.bestSector)}
                    {this.cell("DEEPEST", c.bestDepth + " wp")}
                    {this.cell("LAST RUN", c.lastRun ? "died S" + c.lastRun.sector : "this one")}
                    {this.cell("BANK", (c.bank || 0) + "¥")}
                </div>
            </div>);
    }

    public override render() {
        const party = this.props.party || [];
        const kills = party.reduce((n, a) => n + (a.kills || 0), 0);
        const eddies = party.length ? Purse.balance(party[0]!) : 0;   // one crew purse, not a per-merc sum
        const topLvl = party.reduce((n, a) => Math.max(n, a.level), 0);
        const standing = party.filter((a) => a.canFight()).length;
        return (
            <div className={"redPanel"}>
                {this.record()}
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
