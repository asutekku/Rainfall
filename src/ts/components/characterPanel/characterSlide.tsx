import * as React from "react";
import {Actor} from "../../actors/Actor";

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

    constructor(props: any) {
        super(props);
        this.state = {actor: this.props.actor, active: false, friendly: this.props.friendly}
    }

    handleClick = () => {
        const state = !this.state.active;
        this.setState({active: state});
    };

    static getTarget(friendly: boolean, active: boolean) {
        if (!friendly && active) {
            return <span className={"itemContainer-bottom-right"}>{`Target`}</span>
        }
    }

    render() {
        return (
            <div
                className={this.state.actor.name == this.props.selected ? 'itemContainer-100 itemContainer-active' : 'itemContainer-100'}
                onClick={() => {
                    this.handleClick();
                    return this.props.update(this.props.actor);
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
                    {CharacterComponent.getTarget(this.props.friendly, this.state.actor.name == this.props.selected)}
                </div>
            </div>
        )
    }
}