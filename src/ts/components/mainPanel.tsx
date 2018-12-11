import * as React from "react";
import {Actor} from "../actors/Actor";
import {Player} from "../actors/player";
import {Message} from "./actionLog/messageComponent";
import {CombatMenu} from "./combat/combatMenu";
import {PrimaryTitle} from "./general/primaryTitle";
import {Inventory} from "./inventory/inventory";
import {Quests} from "./quests/quests";
import {Character} from "./stats/stats";
import {Store} from "./storePanel/store";

interface MainProps {
    activeView: string;
    currentActor: Actor;
    currentEnemy: Actor;
    messages: any;
}

interface MainState {
    actor: Player;
    messages: Message[];
}

export class MainPanel extends React.Component<MainProps, MainState> {

    constructor(props: any) {
        super(props);
        this.state = {actor: this.props.currentActor, messages: []};
    }

    /**
     * Updates the state's message[] with a new message from actions
     * Pops the oldest messages if it is longer than x
     * @param {Message} msg Messages to add into an array
     */
    public getMessage = (msg: Message) => {
        this.props.messages(msg);
    };

    public renderView(view: string): any {
        switch (view) {
            case "Inventory":
                return <Inventory player={this.props.currentActor}/>;
            case 'Combat':
                return <CombatMenu actor={this.props.currentActor} enemy={this.props.currentEnemy}
                                   messages={this.getMessage}/>;
            case 'Quests':
                return <Quests messages={this.getMessage}/>;
            case 'Character':
                return <Character actor={this.props.currentActor}/>;
            case 'Store':
                return <Store messages={this.getMessage}/>;
            default:
                return <div>This is yet to be implemented</div>;
        }
    }

    public render() {
        return (
            <div id="playPane">
                <div className="gridElement">
                    <PrimaryTitle title={this.props.activeView} noMenus={true}/>
                    <div className="infoAreaItem">
                        {this.renderView(this.props.activeView)}
                    </div>
                </div>
            </div>);
    }
}
