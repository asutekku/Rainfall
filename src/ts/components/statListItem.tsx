import * as React from "react";

export interface StatListItemProps {
    name: string;
    value: string;
    tooltip?: string;
}

export interface StatListItemState {
    value: string;
}

export class StatListItem extends React.Component<StatListItemProps, StatListItemState> {
    render() {
        return (
            <div className={this.props.tooltip ? "statCard tooltip" : "statCard"}>
                {this.props.tooltip ? <span className={"tooltiptext"}>{this.props.tooltip}</span> : ""}
                <span className={"statTitle"}>{this.props.name}</span>
                <span className={"statValue"}>{this.props.value}</span>
            </div>)
    }
}