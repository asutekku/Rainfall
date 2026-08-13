import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Bar} from "../general/bar";

export interface CharCompProps {
    actor: Actor;
    friendly: boolean;
    update: any;
    selected: string;
}

export class CharacterComponent extends React.Component<CharCompProps, {}> {

    private badge(a: Actor) {
        if (!a.canFight() || a.mortallyWounded) { return <span className={"badge bad"}>DOWN</span>; }
        if (a.isSeriouslyWounded()) { return <span className={"badge warn"}>WND</span>; }
        if (a.isCyberpsycho && a.isCyberpsycho()) { return <span className={"badge bad"}>PSY</span>; }
        return null;
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
                    </div>
                    <Bar value={a.health} max={a.maxHealth} kind={"hp"} showText={false}/>
                </div>
            </div>
        );
    }
}
