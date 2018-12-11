import * as React from 'react';
import {Actor} from '../../actors/Actor';
import {PrimaryTitle} from "../general/primaryTitle";
import {CharacterComponent} from "./characterSlide";

interface PartyProps {
    name: string;
    party: any;
    activeSelection: any;
    friendly: boolean;
}

interface PartyStats {
    activeSelection: Actor | undefined;
    selected: string;
}

class PartyContainer extends React.Component<{ party: any }> {
    render() {
        return <div className={"partyContainer"}>
            {this.props.party}
        </div>;
    }
}

export class Party extends React.Component<PartyProps, PartyStats> {

    constructor(props: any) {
        super(props);
        this.state = {
            activeSelection: undefined,
            selected: ''
        }
    }

    handleClick = (actor: Actor) => {
        this.setState({activeSelection: actor, selected: actor.name});
        this.props.activeSelection(actor);
    };

    getSelected(): string {
        return this.state.selected !== null ? this.state.selected : '';
    }

    getParty(): any {
        return this.props.party.map((e: any, i: number) => {
                return <CharacterComponent actor={e} friendly={this.props.friendly} key={i} update={this.handleClick}
                                           selected={this.getSelected()}/>;
            }
        )
    }

    render() {
        return <div id='partyComponent'>
            <PrimaryTitle title={this.props.name} noMenus={true}/>
            <div className='UIelement'>
                <PartyContainer party={this.getParty()}/>
            </div>
        </div>
    }
}