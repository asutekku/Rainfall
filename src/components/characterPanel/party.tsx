import * as React from 'react';
import {Actor} from '../../ts/actors/Actor';
import {PrimaryTitle} from "../general/primaryTitle";
import {CharacterComponent} from "./characterSlide";

interface PartyProps {
    name: string;
    party: any;
    activeSelection: any;
    friendly: boolean;
}

function PartyContainer(props: { children?: any }) {
    return <div className={"partyContainer"}>
        {props.children}
    </div>;
}

export class Party extends React.Component<PartyProps> {

    constructor(props: any) {
        super(props);
        this.state = {
            activeSelection: undefined,
            selected: null,
        };
    }

    public handleClick = (actor: Actor) => {
        this.setState({activeSelection: actor, selected: actor.name});
        this.props.activeSelection(actor);
    };

    public getParty(): any {
        return this.props.party.map((e: Actor, i: number) =>
            <CharacterComponent actor={e} friendly={this.props.friendly} key={i} index={i} update={this.handleClick}/>,
        );
    }

    public render() {
        return <div id='partyComponent'>
            <PrimaryTitle title={this.props.name} noMenus={true}/>
            <div className='UIelement'>
                <PartyContainer>
                    {this.getParty()}
                </PartyContainer>
            </div>
        </div>;
    }
}
