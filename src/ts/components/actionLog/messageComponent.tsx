import * as React from "react";


export interface MessageProps {
    text: string;
    kind?: string;   // optional modifier class (e.g. msg-loot, msg-gear)
}

export class Message extends React.Component<MessageProps, {}> {

    constructor(props: MessageProps) {
        super(props);
    }

    public render(): any {
        return <div className={'actionMessage' + (this.props.kind ? ' ' + this.props.kind : '')}>> {this.props.text}</div>;
    }
}
