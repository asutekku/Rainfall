import * as React from "react";

export interface InventoryCategoryProps {
    title: string;
    update: any;
    active: string;
}

// 'HelloProps' describes the shape of props.
// State is never set so we use the '{}' type.
export class Category extends React.Component<InventoryCategoryProps, {}> {
    public render() {
        return <div
            className={this.props.title === this.props.active ? "title-submenu title-submenu-active" : "title-submenu"}
            onClick={() => this.props.update(this.props.title)}>
            <span className={"catTitle"}>{this.props.title}</span>
        </div>;
    }
}
