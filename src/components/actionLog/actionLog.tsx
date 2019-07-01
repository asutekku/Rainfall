import * as React from "react";
import {IDefaultMessage, MessageCombat} from "../../ts/interact/messageSchema";
import {PrimaryTitle} from "../general/primaryTitle";
import {CombatMessage, DeathMessage, LVLUPMessage} from "./combatMessage";
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
        const messageTypes = {
            combat: (i: number, m: IDefaultMessage) => <CombatMessage key={i} message={m as MessageCombat}/>,
            death: (i: number, m: IDefaultMessage) => <DeathMessage key={i} target={(m.target as Actor)} actor={m.actor}/>,
            levelUp: (i: number, m: IDefaultMessage) => <LVLUPMessage key={i} actor={m.actor}/>,
            default: (i: number, m: IDefaultMessage) => <Message text={!m.actor ? m.msg : m.actor.name} key={i}/>
        };

        return this.props.messages.map((m: IDefaultMessage, i: number) => {
            return messageTypes[m.type](i, m) || messageTypes['default'];
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
