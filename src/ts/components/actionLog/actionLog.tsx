import * as React from "react";
import {Actor} from "../../actors/Actor";
import {DefaultMessage} from "../../interact/messageSchema";
import {Message} from "./messageComponent";

export interface LogProps {
    actor: Actor;
    messages: Message[];
}

interface LogState {
    selection: string;
    messages: DefaultMessage[];
}

export class ActionLog extends React.Component<LogProps, LogState> {

    constructor(props: any) {
        super(props);
        this.state = {selection: 'Skills', messages: []};
    }

    handleClick = (selection: string) => {
        this.setState({selection: selection});
    };

    getMessages = (): JSX.Element[] => {
        return this.props.messages.map((m: any, i: number) => {
            let msg = !m.playerName ? m.msg : m.playerName;
            return <Message text={msg} key={i}/>;
        })
    };

    render() {
        return (
            <div id="gamearea" className="gridElement">
                <div id="initLine">
                    <span id="initChar">></span>
                </div>
                <div id="actions">{this.getMessages()}</div>
            </div>)
    }
}