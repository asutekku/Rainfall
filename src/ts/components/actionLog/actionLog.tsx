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

    /** Surveillance line: mission clock · callsign · compressed action, damage numbers accented. */
    private feedEntry(m: any, i: number): React.JSX.Element {
        const parts = String(m.text).split(/(\d+ dmg|DOWN|KIA|miss|armor holds)/);
        return (
            <div key={i} className={"fe " + m.side + (m.kill ? " kill" : "")}>
                {m.time && <span className={"t"}>{m.time}</span>}
                {m.name && <b className={"n"}>{m.side === "hostile" ? "✦" : "◈"} {m.name}</b>}
                <span className={"x"}>
                    {parts.map((p, j) =>
                        /^\d+ dmg$/.test(p) ? <i key={j} className={"d"}>{p}</i>
                        : p === "DOWN" || p === "KIA" ? <i key={j} className={"k"}>{p}</i>
                        : p === "miss" || p === "armor holds" ? <i key={j} className={"m"}>{p}</i>
                        : p)}
                </span>
            </div>);
    }

    public getMessages = (): React.JSX.Element[] => {
        return this.props.messages.map((m: any, i: number) => {
            if (m && m.feed === "entry") { return this.feedEntry(m, i); }
            switch (m.type) {
                case "combat" :
                    return <CombatMessage key={i} message={m}/>;
                case "death" :
                    return <DeathMessage key={i} dead={m.dead} killer={m.killer}/>;
                default:
                    const msg = !m.playerName ? m.msg : m.playerName;
                    const kind = /★/.test(msg) ? "msg-rare"
                        : /scavenges|equips|dons/.test(msg) ? "msg-scav"
                        : /loots|¥/.test(msg) ? "msg-loot"
                        : /kits up|suits up/.test(msg) ? "msg-gear" : undefined;
                    return <Message text={msg} kind={kind} key={i}/>;
            }
        });
    };

    public override render() {
        return (
            <div className={"panel feed"}>
                <h3>◉ Overwatch</h3>
                <div className={"log"}>
                    {this.getMessages()}
                </div>
            </div>);
    }
}
