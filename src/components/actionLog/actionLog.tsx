import * as React from "react";
import {IDefaultMessage} from "../../ts/interact/messageSchema";
import {PrimaryTitle} from "../general/primaryTitle";
import {CombatMessage, DeathMessage} from "./combatMessage";
import {Message} from "./messageComponent";

export interface LogProps {
    messages: Message[];
}

interface LogState {
    selection: string;
    messages: IDefaultMessage[];
}

class Log extends React.Component<{ messages: JSX.Element[] }> {
    public render() {
        return <div id="actions">{this.props.messages}</div>;
    }
}

export class ActionLog extends React.Component<LogProps, LogState> {

    constructor(props: LogProps) {
        super(props);
        this.state = {selection: "Skills", messages: []};
    }

    public getMessages = (): JSX.Element[] => {
        return this.props.messages.map((m: any, i: number) => {
            switch (m.type) {
                case "combat" :
                    return <CombatMessage key={i} message={m}/>;
                case "death" :
                    return <DeathMessage key={i} dead={m.dead} killer={m.killer}/>;
                default:
                    const msg = !m.playerName ? m.msg : m.playerName;
                    return <Message text={msg} key={i}/>;
            }
        });
    };

    public render() {
        return (
            <div id={"actionLog"}>
                <PrimaryTitle title={"Action log"} noMenus={true}/>
                <div id="gamearea" className="gridElement">
                    <div id="initLine">
                        <span className="actionMessage-first">></span>
                    </div>
                    <Log messages={this.getMessages()}/>
                </div>
            </div>);
    }
}