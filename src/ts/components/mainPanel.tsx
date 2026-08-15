import * as React from "react";
import {Actor} from "../actors/Actor";
import {Player} from "../actors/player";
import {Message} from "./actionLog/messageComponent";
import {Inventory} from "./inventory/inventory";
import {Quests} from "./quests/quests";
import {Character} from "./stats/stats";
import {Store} from "./storePanel/store";
import {Netrun} from "./net/netrun";
import {Downtime} from "./downtime/downtime";
import {CareerStats} from "./stats/careerStats";

interface MainProps {
    activeView: string;
    currentActor: Actor;
    currentEnemy?: Actor;
    party: Actor[];
    /** Which run screen is up (gear equipping is locked mid-fight). */
    screen: string;
    messages: any;
    /** A panel notice destined for the action feed. */
    onNotice: (msg: any) => void;
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
        this.props.onNotice(msg);
    };

    public renderView(view: string): any {
        switch (view) {
            case "Inventory":
                return <Inventory party={this.props.party} screen={this.props.screen}
                                  onNotice={this.props.onNotice}/>;
            case 'Quests':
                return <Quests messages={this.getMessage}/>;
            case 'Character':
                return <Character actor={this.props.currentActor}/>;
            case 'Store':
                return <Store player={this.props.currentActor} messages={this.getMessage}/>;
            case 'Netrun':
                return <Netrun actor={this.props.currentActor}/>;
            case 'Downtime':
                return <Downtime actor={this.props.currentActor}/>;
            case 'Stats':
                return <CareerStats party={this.props.party} enemy={this.props.currentEnemy}/>;
            default:
                return <div className={"redEmpty"}>This is yet to be implemented.</div>;
        }
    }

    public override render() {
        // The character sheet is reached per-member from the squad roster, so
        // its header names the merc, not the panel.
        const title = this.props.activeView === "Character"
            ? `◈ ${this.props.currentActor.name}` : this.props.activeView;
        return (
            <main className={"panel"}>
                <h3>{title}</h3>
                <div className={"panelBody"}>
                    {this.renderView(this.props.activeView)}
                </div>
            </main>);
    }
}
