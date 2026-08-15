import * as React from "react";
import {Actor} from "../../actors/Actor";
import {StatListItem} from "../statListItem";
import {CharacterPortrait} from "./characterPortrait";
import {Purse} from "../../interact/crew";

export interface AboutProps {
    actor: Actor;
}

interface AboutState {
    actor: Actor;
}

export class CharacterAbout extends React.Component<AboutProps, AboutState> {

    constructor(props: any) {
        super(props);
        this.state = {actor: this.props.actor};
    }

    public handleChange = () => {
        this.setState({actor: this.props.actor});
    };

    private woundLabel(a: Actor): string {
        if (a.mortallyWounded) { return "Mortally Wounded"; }
        if (a.isSeriouslyWounded()) { return "Seriously Wounded"; }
        return "Healthy";
    }

    private woundClass(a: Actor): string {
        if (a.mortallyWounded) { return "vital-critical"; }
        if (a.isSeriouslyWounded()) { return "vital-warn"; }
        return "vital-good";
    }

    private stat = (label: string, value: number) => (
        <div className={"redStat"}>
            <span className={"redStatLabel"}>{label}</span>
            <span className={"redStatValue"}>{value}</span>
        </div>
    )

    public override render() {
        const a = this.props.actor;
        return (
            <div className={"characterInfo"}>
                <CharacterPortrait imgSource={a.role.portrait}/>
                <div className={"characterAbout"}>
                    <StatListItem name={"Name:"} value={a.name}/>
                    <StatListItem name={"Role:"} value={a.role.name}/>
                    <StatListItem name={"Skill:"} value={a.role.skill!} tooltip={a.role.skillDescription}/>
                    <StatListItem name={"Level:"} value={a.level.toString()}/>
                    <StatListItem name={"Experience:"} value={`${a.experience}/${a.maxExperience}`}/>
                    <div className={"statCard"}>
                        <span className={"statTitle"}>Condition:</span>
                        <span className={"statValue " + this.woundClass(a)}>
                            {this.woundLabel(a)} ({a.health}/{a.maxHealth} HP)
                        </span>
                    </div>
                    <div className={"statCard"}>
                        <span className={"statTitle"}>Humanity:</span>
                        <span className={"statValue " + (a.humanity <= 20 ? "vital-warn" : "")}>
                            {a.humanity}/{a.maxHumanity}{a.isCyberpsycho() ? " — CYBERPSYCHO" : ""}
                        </span>
                    </div>
                    <StatListItem name={"Reputation:"} value={`${a.reputation}/10`}/>
                    <StatListItem name={"Luck:"} value={`${a.luck}/${a.maxLuck}`}/>
                    <StatListItem name={"Housing:"} value={a.housing}/>
                    <StatListItem name={"Eddies:"} value={`${Purse.balance(a)}¥`}/>

                    <div className={"redStatGrid"}>
                        {this.stat("INT", a.stats.int)}
                        {this.stat("REF", a.stats.ref)}
                        {this.stat("DEX", a.stats.dex)}
                        {this.stat("TECH", a.stats.tech)}
                        {this.stat("COOL", a.stats.cl)}
                        {this.stat("WILL", a.stats.will)}
                        {this.stat("LUCK", a.stats.lk)}
                        {this.stat("BODY", a.stats.bt)}
                        {this.stat("EMP", a.stats.emp)}
                    </div>
                </div>
            </div>);
    }
}
