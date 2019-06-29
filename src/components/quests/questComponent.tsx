import * as React from "react";
import {MessageStr} from "../../ts/interact/messageSchema";
import {Quest} from "../../ts/items/Quest";

export interface QuestProps {
    quest: Quest;
    active: boolean;
    message: any;
}

interface QuestState {
    active: boolean;
}

export class QuestComponent extends React.Component<QuestProps, QuestState> {

    constructor(props: any) {
        super(props);
        this.state = {active: this.props.quest.active};
    }

    public handleClick = () => {
        const state = !this.state.active;
        if (state) {
            this.props.message(new MessageStr(`Started the quest: [${this.props.quest.name}].`));
        } else {
            this.props.message(new MessageStr(`Stopped the quest: [${this.props.quest.name}].`));
        }
        this.setState({active: state});
        this.props.quest.active = state;
    };

    public render() {
        return (
            <div className={this.props.quest.active ? "itemContainer-100 itemContainer-active" : 'itemContainer-100'}>
                <div className={'itemContainerRow-top'}>
                    <span className={"itemContainer-top-left"}>{this.props.quest.name}</span>
                    <span className={"itemContainer-top-right"}>{`Quest lvl: ${this.props.quest.level}`}</span>
                </div>
                <div className={"itemContainerRow-middle"}>
                    <span className={"itemContainer-middle"}>{this.props.quest.description}</span>
                </div>
                <div className={'itemContainerRow-bottom'}>
                    <span className={"itemContainer-bottom-left"}>{`Reward: ${this.props.quest.rewardMoney}¥`}</span>
                    <div className={"itemContainer-bottom-right noSelect"} onClick={this.handleClick}>
                        {this.state.active ? 'Stop tracking' : 'Track quest'}
                    </div>
                </div>
            </div>);
    }
}
