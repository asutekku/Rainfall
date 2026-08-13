import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Bar} from "../general/bar";

export interface CharCompProps {
    actor: Actor;
    friendly: boolean;
    update: any;
    selected: string;
}

interface CharCompState {
    actor: Actor;
    active: boolean;
    friendly: boolean;
}

export class CharacterComponent extends React.Component<CharCompProps, CharCompState> {

    public static getTarget(friendly: boolean, active: boolean) {
        if (!friendly && active) {
            return <span className={"itemContainer-bottom-right"}>{`Target`}</span>;
        }
    }

    constructor(props: CharCompProps) {
        super(props);
        this.state = {actor: this.props.actor, active: false, friendly: this.props.friendly};
    }

    public handleClick = () => {
        const state = !this.state.active;
        this.setState({active: state});
    };

    private statusBadge(a: Actor) {
        if (!a.canFight() || a.mortallyWounded) { return <span className={"slideBadge badge-down"}>DOWN</span>; }
        if (a.isSeriouslyWounded()) { return <span className={"slideBadge badge-wounded"}>WOUNDED</span>; }
        if (a.isCyberpsycho && a.isCyberpsycho()) { return <span className={"slideBadge badge-psycho"}>PSYCHO</span>; }
        return null;
    }

    public render() {
        const a = this.props.actor;
        const selected = a.name === this.props.selected;
        return (
            <div
                className={selected ? 'slideCard slideCard-active' : 'slideCard'}
                onClick={() => {
                    this.handleClick();
                    return this.props.update(a);
                }}>
                <img src={a.role.portrait} className={"slidePortrait"} alt={a.role.name}/>
                <div className={"slideInfo"}>
                    <div className={"slideTop"}>
                        <span className={"slideName"}>{a.name}</span>
                        <span className={"slideLvl"}>Lvl {a.level}</span>
                    </div>
                    <div className={"slideMeta"}>
                        <span>{a.role.name}</span>
                        {this.statusBadge(a)}
                        {!this.props.friendly && selected && <span className={"slideBadge badge-target"}>TARGET</span>}
                    </div>
                    <div className={"slideWeapon"}>{a.weapon.name}</div>
                    <Bar value={a.health} max={a.maxHealth} kind={"hp"}/>
                </div>
            </div>
        );
    }
}
