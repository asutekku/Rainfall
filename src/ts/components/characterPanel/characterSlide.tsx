import * as React from "react";
import {Actor} from "../../actors/Actor";
import {ProfileBadge} from "../general/profileBadge";
import {Bar} from "../general/bar";

export interface CharCompProps {
    actor: Actor;
    friendly: boolean;
    update: any;
    selected: string;
    /** This is YOUR character (pinned on top of the roster). */
    isPlayer?: boolean | undefined;
    onCycleTemperament?: ((a: Actor) => void) | undefined;
    /** Open the member's full character sheet (the › affordance). */
    onOpenSheet?: ((a: Actor) => void) | undefined;
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

    /**
     * Playstyle, and only playstyle. There used to be an AUTO/MANUAL chip
     * beside it; every fight is fought by the AI now, so how a member fights
     * is the whole of what there is to set — and it is always on show rather
     * than hidden behind a mode the player no longer picks.
     */
    private controls(a: Actor) {
        if (!this.props.friendly || !this.props.onCycleTemperament) { return null; }
        const temper = TEMPER[a.temperament] || TEMPER["balanced"]!;
        return (
            <span className={"pcCtl"}>
                <span className={"temp " + temper[1]} title={"Playstyle — tap to change"}
                      onClick={(e) => { e.stopPropagation(); this.props.onCycleTemperament!(a); }}>
                    {temper[0]}
                </span>
            </span>);
    }

    public override render() {
        const a = this.props.actor;
        const selected = a.name === this.props.selected;
        return (
            <div className={(selected ? "pc on" : "pc") + (this.props.isPlayer ? " you" : "")}
                 onClick={() => this.props.update(a)}>
                <img src={a.role.portrait} className={"pf"} alt={a.role.name}/>
                <div className={"pcx"}>
                    <div className={"pcn"}>
                        <b>{a.name}</b>
                        {this.props.isPlayer && <span className={"youChip"}>YOU</span>}
                        <span>Lvl {a.level}</span>
                    </div>
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
                        <ProfileBadge unit={a}/>
                    </div>
                </div>
                {this.props.friendly && this.props.onOpenSheet && (
                    <button className={"pcSheet"} title={"Character sheet"}
                            onClick={(e) => { e.stopPropagation(); this.props.onOpenSheet!(a); }}>›</button>
                )}
            </div>
        );
    }
}
