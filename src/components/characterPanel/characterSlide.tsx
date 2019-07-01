import * as React from "react";
import {Actor} from "../../ts/actors/Actor";
import {ProgressBar} from "../general/progressBar";

export interface CharCompProps {
    actor: Actor;
    friendly: boolean;
    update: any;
    index: number;
}

export class CharacterComponent extends React.Component<CharCompProps> {

    constructor(props: CharCompProps) {
        super(props);
        this.state = {actor: this.props.actor, active: false, friendly: this.props.friendly};
    }

    public static getTarget(friendly: boolean, active: boolean) {
        if (!friendly && active) {
            return <span className={"itemContainer-bottom-right"}>{`Target`}</span>;
        }
    }

    public handleClick = () => {
        //const state = !this.state.active;
        this.props.update(this.props.actor);
    };

    componentDidMount() {
        if (!this.props.actor.hostile) {
            document.addEventListener("keydown", this._handleKeyDown);
        }
    }

    public render() {
        let actor = this.props.actor;
        return (
            <div
                className={actor.selected ? 'itemContainer-100 itemContainer-active' : 'itemContainer-100'}
                onClick={() => {
                    this.handleClick();
                }}>
                <div className={'itemContainerRow-top'}>
                    <span className={"itemContainer-top-left"}>{actor.name}</span>
                    <span className={"itemContainer-top-right"}>{`Lvl: ${actor.level}`}</span>
                </div>
                <div className={"itemContainerRow-middle"}>
                    <span className={"itemContainer-middle"}>{`Role: ${actor.role.name}`}</span>
                </div>
                <div className={'itemContainerRow-bottom'}>
                    <span className={"itemContainer-bottom-left"}>{`Weapon: ${actor.weapon.name}`}</span>
                    <span
                        className={"itemContainer-bottom-right"}>{`${actor.weapon.magazine.ammoCount}/${actor.weapon.magazine.maxCapacity} [${actor.weapon.clips}]`}</span>
                </div>
                <ProgressBar title={'Health'} value={actor.health} max={actor.maxHealth}/>
            </div>
        );
    }

    private _handleKeyDown = (event: any) => {
        if (event.key === (this.props.index + 1).toString()) {
            this.handleClick();
        }
    };
}
