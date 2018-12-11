import * as React from "react";
import {Category} from "../general/category";
import {Player} from "../../actors/player";
import quests from "../../items/quests";
import {QuestComponent} from "./questComponent";
import {Message} from "../actionLog/messageComponent";

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
            selection: 'Main Quests'
        }
    }

    getMessage = (msg: Message) => {
        this.props.messages(msg);
    };

    getQuests(selection: string) {
        if (selection == 'Main Quests') {
            return quests.mainQuests.map((e: any) => <QuestComponent key={e.name} quest={e} active={false} message={this.getMessage}/>)
        } else {
            return quests.sideQuests.map((e: any) => <QuestComponent key={e.name} quest={e} active={false} message={this.getMessage}/>)
        }
    }

    handleClick = (selection: string) => {
        this.setState({selection: selection});
    };

    render() {
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
            </div>)
    }
}