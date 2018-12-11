import * as React from "react";

interface PortraitProps {
    imgSource: string;
}

export class CharacterPortrait extends React.Component<PortraitProps> {
    public render = () => <div className={"charPortraitContainer"}>
        <img src={this.props.imgSource} className={'charPortrait'} alt={'Character portrait'}/>
    </div>
}
