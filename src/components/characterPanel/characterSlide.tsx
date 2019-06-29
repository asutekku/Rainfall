import * as React from "react";
import {Actor} from "../../ts/actors/Actor";
import {ProgressBar} from "../general/progressBar";

export interface CharCompProps {
    actor: Actor;
    friendly: boolean;
    update: any;
}

export class CharacterComponent extends React.Component<CharCompProps> {

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
        //const state = !this.state.active;
        this.props.update(this.props.actor);
    };

    public render() {
        return (
            <div
                className={this.props.actor.selected ? 'itemContainer-100 itemContainer-active' : 'itemContainer-100'}
                onClick={() => {
                    this.handleClick();
                }}>
                <div className={'itemContainerRow-top'}>
                    <span className={"itemContainer-top-left"}>{this.props.actor.name}</span>
                    <span className={"itemContainer-top-right"}>{`Lvl: ${this.props.actor.level}`}</span>
                </div>
                <div className={"itemContainerRow-middle"}>
                    <span className={"itemContainer-middle"}>{`Role: ${this.props.actor.role.name}`}</span>
                </div>
                <div className={'itemContainerRow-bottom'}>
                    <span className={"itemContainer-bottom-left"}>{`Weapon: ${this.props.actor.weapon.name}`}</span>
                    {CharacterComponent.getTarget(this.props.friendly, this.props.actor.selected)}
                </div>
                <ProgressBar title={'Health'} value={this.props.actor.health} max={this.props.actor.maxHealth}/>
            </div>
        );
    }
}
