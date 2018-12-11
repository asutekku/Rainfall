import * as React from "react";


export interface MessageProps {
    text: string;
}

export class Message extends React.Component<MessageProps, {}> {

    constructor(props: MessageProps) {
        super(props);
    }

    render(): any {
        return <div className={'actionMessage'}>> {this.props.text}</div>
    }
}