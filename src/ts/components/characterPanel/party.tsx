import * as React from 'react';
import {Actor} from '../../actors/Actor';
import {CharacterComponent} from "./characterSlide";

interface PartyProps {
    name: string;
    party: any;
    activeSelection: any;
    friendly: boolean;
    onToggleAuto?: (a: Actor) => void;
    onCycleTemperament?: (a: Actor) => void;
}

interface PartyStats {
    activeSelection: Actor | undefined;
    selected: string;
}

export class Party extends React.Component<PartyProps, PartyStats> {

    constructor(props: any) {
        super(props);
        this.state = {
            activeSelection: undefined,
            selected: '',
        };
    }

    public handleClick = (actor: Actor) => {
        this.setState({activeSelection: actor, selected: actor.name});
        this.props.activeSelection(actor);
    };

    public getSelected(): string {
        return this.state.selected !== null ? this.state.selected : '';
    }

    public render() {
        return <div className={"panel"}>
            <h3>{this.props.name}</h3>
            <div className={"party"}>
                {this.props.party.map((e: Actor, i: number) => (
                    <CharacterComponent actor={e} friendly={this.props.friendly} key={i}
                                        update={this.handleClick} selected={this.getSelected()}
                                        onToggleAuto={this.props.onToggleAuto}
                                        onCycleTemperament={this.props.onCycleTemperament}/>
                ))}
            </div>
        </div>;
    }
}
