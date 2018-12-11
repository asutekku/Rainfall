import * as React from 'react';
import {Actor} from '../../actors/Actor';
import {PrimaryTitle} from "../general/primaryTitle";
import {Party} from "./party";

interface CharacterPanelProps {
    party: Actor[];
    enemies: Actor[];
    activeSelection: any;
    activeEnemy: any;
}

interface CharacterPanelState {
    activeSelection: Actor | undefined;
    activeEnemy: Actor | undefined;
    selected: string;
}

export class CharacterPanel extends React.Component<CharacterPanelProps, CharacterPanelState> {

    constructor(props: any) {
        super(props);
        this.state = {
            activeSelection: undefined,
            activeEnemy: undefined,
            selected: ''
        }
    }

    getCharacter = (actor: Actor) => {
        if (!actor) {
            this.setState({activeSelection: this.props.party[0]});
            this.props.activeSelection(this.props.party[0]);
        } else {
            this.setState({activeSelection: actor});
            this.props.activeSelection(actor);
        }
    };

    getEnemy = (actor: Actor) => {
        if (!actor) {
            this.setState({activeEnemy: this.props.enemies[0]});
            this.props.activeEnemy(this.props.enemies[0]);
        } else {
            this.setState({activeEnemy: actor});
            this.props.activeEnemy(actor);
        }
    };

    render() {
        return <div id='statpane'>
            <PrimaryTitle title={'Characters'} noMenus={true}/>
            <Party name={'Friendly'} party={this.props.party} activeSelection={this.getCharacter} friendly={true}/>
            <Party name={'Enemies'} party={this.props.enemies} activeSelection={this.getEnemy} friendly={false}/>
        </div>
    }
}