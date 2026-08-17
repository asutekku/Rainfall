import * as React from 'react';
import {Actor} from '../../actors/Actor';
import {CharacterComponent} from "./characterSlide";

interface PartyProps {
    name: string;
    party: any;
    activeSelection: any;
    friendly: boolean;
    onCycleTemperament?: (a: Actor) => void;
    /** Open the full character sheet for a member (the › affordance). */
    onOpenSheet?: (a: Actor) => void;
}

interface PartyStats {
    activeSelection: Actor | undefined;
    selected: string;
}

/**
 * The squad roster: YOUR character pinned on top, the hired crew below a
 * divider. Tapping a card selects; the › chevron opens the full sheet.
 */
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

    private card(e: Actor, i: number) {
        return <CharacterComponent actor={e} friendly={this.props.friendly} key={i}
                                   isPlayer={this.props.friendly && i === 0}
                                   update={this.handleClick} selected={this.getSelected()}
                                   onCycleTemperament={this.props.onCycleTemperament}
                                   onOpenSheet={this.props.onOpenSheet}/>;
    }

    public override render() {
        const list: Actor[] = this.props.party;
        return <div className={"panel"}>
            <h3>{this.props.name}</h3>
            <div className={"party"}>
                {list.length > 0 && this.card(list[0]!, 0)}
                {this.props.friendly && list.length > 1 && <div className={"crewSep"}>Crew</div>}
                {list.slice(1).map((e: Actor, i: number) => this.card(e, i + 1))}
            </div>
        </div>;
    }
}
