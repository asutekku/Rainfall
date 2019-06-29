import * as React from "react";

export interface ProgressBarProps {
    title: string;
    value: number;
    max: number;
    modifier?: string;
}

export class ProgressBar extends React.Component<ProgressBarProps, {}> {
    public render() {
        return <div className={'progressContainer'}>
            <div className={'progressbarContainer'}>
                <div className={'progressTitle'}>{this.props.title + ':'}</div>
                <progress className={'progressBar'} value={this.props.value.toString()} max={this.props.max}/>
                <div className={'progressValue'}>
                    {this.props.value.toString()}{this.props.modifier ? this.props.modifier : ""}
                </div>
            </div>
        </div>;
    }
}
