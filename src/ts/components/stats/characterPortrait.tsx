import * as React from "react";

interface PortraitProps {
    imgSource: string;
}

export class CharacterPortrait extends React.Component<PortraitProps> {
    render() {
        return <div className={"characterPicture"}>
            <img src={this.props.imgSource} alt={'Character portrait'}/>
        </div>;
    }
}