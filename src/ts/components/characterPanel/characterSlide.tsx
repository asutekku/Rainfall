import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Bar} from "../general/bar";

export interface CharCompProps {
    actor: Actor;
    friendly: boolean;
    update: any;
    selected: string;
    onToggleAuto?: (a: Actor) => void;
    onCycleTemperament?: (a: Actor) => void;
}

const TEMPER: { [k: string]: [string, string] } = {
    aggressive: ["AGGRO", "t-aggro"], berserker: ["RUSH", "t-rush"], flanker: ["FLANK", "t-flank"],
    camper: ["CAMP", "t-camp"], balanced: ["STEADY", "t-steady"],
};

export class CharacterComponent extends React.Component<CharCompProps, {}> {

    private badge(a: Actor) {
        if (!a.canFight() || a.mortallyWounded) { return <span className={"badge bad"}>DOWN</span>; }
        if (a.isSeriouslyWounded()) { return <span className={"badge warn"}>WND</span>; }
        if (a.isCyberpsycho && a.isCyberpsycho()) { return <span className={"badge bad"}>PSY</span>; }
        return null;
    }

    private controls(a: Actor) {
        if (!this.props.friendly || !this.props.onToggleAuto) { return null; }
        const temper = TEMPER[a.temperament] || TEMPER.balanced;
        return (
            <span className={"pcCtl"}>
                <span className={"autoChip" + (a.auto ? " on" : "")}
                      title={"Toggle AI control"}
                      onClick={(e) => { e.stopPropagation(); this.props.onToggleAuto!(a); }}>
                    {a.auto ? "AUTO" : "MANUAL"}
                </span>
                {a.auto && (
                    <span className={"temp " + temper[1]} title={"Click to change AI playstyle"}
                          onClick={(e) => { e.stopPropagation(); this.props.onCycleTemperament!(a); }}>
                        {temper[0]}
                    </span>
                )}
            </span>);
    }

    public render() {
        const a = this.props.actor;
        const selected = a.name === this.props.selected;
        return (
            <div className={selected ? "pc on" : "pc"} onClick={() => this.props.update(a)}>
                <img src={a.role.portrait} className={"pf"} alt={a.role.name}/>
                <div className={"pcx"}>
                    <div className={"pcn"}><b>{a.name}</b><span>Lvl {a.level}</span></div>
                    <div className={"pcr"}>
                        {a.role.name}
                        {this.badge(a)}
                        {!this.props.friendly && selected ? <span className={"badge tgt"}>TARGET</span> : null}
                        {this.controls(a)}
                    </div>
                    <Bar value={a.health} max={a.maxHealth} kind={"hp"} showText={false}/>
                    <div className={"pcGear"}>
                        <span>{a.weapon.name} · {a.weapon.diceThrows}d6{a.weapon.damage ? "+" + a.weapon.damage : ""}{a.weapon.ap ? " AP" : ""}</span>
                        <span className={"gearSp"}>SP {a.equipment.upper ? a.equipment.upper.stoppingPower : 0}</span>
                    </div>
                </div>
            </div>
        );
    }
}
