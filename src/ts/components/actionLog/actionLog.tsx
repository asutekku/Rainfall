import * as React from "react";
import {Actor} from "../../actors/Actor";
import {IDefaultMessage} from "../../interact/messageSchema";
import {CombatMessage, DeathMessage} from "./combatMessage";
import {Message} from "./messageComponent";

export interface LogProps {
    actor: Actor;
    messages: Message[];
}

interface LogState {
    selection: string;
    messages: IDefaultMessage[];
}


export class ActionLog extends React.Component<LogProps, LogState> {

    constructor(props: LogProps) {
        super(props);
        this.state = {selection: "Skills", messages: []};
    }

    public handleClick = (selection: string) => {
        this.setState({selection});
    };

    public getMessages = (): JSX.Element[] => {
        return this.props.messages.map((m: any, i: number) => {
            switch (m.type) {
                case "combat" :
                    return <CombatMessage key={i} message={m}/>;
                case "death" :
                    return <DeathMessage key={i} dead={m.dead} killer={m.killer}/>;
                default:
                    const msg = !m.playerName ? m.msg : m.playerName;
                    const kind = /loots|¥/.test(msg) ? "msg-loot"
                        : /kits up|suits up/.test(msg) ? "msg-gear" : undefined;
                    return <Message text={msg} kind={kind} key={i}/>;
            }
        });
    };

    public render() {
        return (
            <div className={"panel feed"}>
                <h3>Feed</h3>
                <div className={"log"}>
                    {this.getMessages()}
                </div>
            </div>);
    }
}
