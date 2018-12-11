import * as React from "react";

export interface InfoAreaTitleProps {
    title: string;
    noMenus?: boolean;
}

export class PrimaryTitle extends React.Component<InfoAreaTitleProps, {}> {
    public render() {
        return (
            <div className={this.props.noMenus ? "title-main underline" : "title-main"}>
                <div className={"infoAreaTitle"}>
                    <span className={"catTitle"}>{this.props.title}</span>
                </div>
            </div>);
    }
}
