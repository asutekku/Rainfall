import * as React from "react";
import {Player} from "../../ts/actors/player";
import quests from "../../ts/items/quests";
import {Message} from "../actionLog/messageComponent";
import {Category} from "../general/category";
import {QuestComponent} from "./questComponent";

interface QuestProps {
    player?: Player;
    messages: any;
}

interface QuestState {
    mainQuests: any;
    sideQuests: any;
    selection: string;
}

export class Quests extends React.Component<QuestProps, QuestState> {

    constructor(props: any) {
        super(props);
        this.state = {
            mainQuests: [],
            sideQuests: [],
            selection: 'Main Quests',
        };
    }

    public getMessage = (msg: Message) => {
        this.props.messages(msg);
    };

    public getQuests(selection: string) {
        if (selection === 'Main Quests') {
            return quests.mainQuests.map((e: any) => <QuestComponent key={e.name} quest={e} active={false}
                                                                     message={this.getMessage}/>);
        } else {
            return quests.sideQuests.map((e: any) => <QuestComponent key={e.name} quest={e} active={false}
                                                                     message={this.getMessage}/>);
        }
    }

    public handleClick = (selection: string) => {
        this.setState({selection});
    };

    public render() {
        return (
            <div className={"itemCollection"}>
                <div className={"itemCollectionContainer"}>
                    <div className={"itemCollectionCategories"}>
                        <Category title={"Main Quests"} update={this.handleClick} active={this.state.selection}/>
                        <Category title={"Side Quests"} update={this.handleClick} active={this.state.selection} />
                    </div>
                    <div className={"itemCollection-100"}>
                        {this.getQuests(this.state.selection)}
                    </div>
                </div>
            </div>);
    }
}
