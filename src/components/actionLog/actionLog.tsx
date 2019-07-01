import * as React from "react";
import {IDefaultMessage, MessageCombat} from "../../ts/interact/messageSchema";
import {PrimaryTitle} from "../general/primaryTitle";
import {CombatMessage, DeathMessage} from "./combatMessage";
import {Message} from "./messageComponent";
import {Actor} from "../../ts/actors/Actor";

export interface LogProps {
    messages: IDefaultMessage[];
}

interface LogState {
    selection: string;
    messages: IDefaultMessage[];
}

function Log(props: { children: any }) {
    return <div id="actions">
        {props.children}
    </div>;
}

export class ActionLog extends React.Component<LogProps, LogState> {

    constructor(props: LogProps) {
        super(props);
        this.state = {selection: "Skills", messages: []};
    }

    public getMessages = (): JSX.Element[] => {
        return this.props.messages.map((m: IDefaultMessage, i: number) => {
            switch (m.type) {
                case 'combat' :
                    console.log(m.target.name);
                    return <CombatMessage key={i} message={m as MessageCombat}/>;
                case 'death' :
                    return <DeathMessage key={i} target={m.target as Actor} actor={m.actor}/>;
                default:
                    const msg = !m.actor ? m.msg : m.actor.name;
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
                    <Log>
                        {this.getMessages()}
                    </Log>
                </div>
            </div>);
    }
}
