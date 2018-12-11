import * as React from "react";
import {Item} from "../../items/Item";

export interface InventoryItemProps {
    item: Item;
    id: string;
    nodeName: string;
    count: number;
    type: string;
    equipped: boolean;
    selected: boolean;
}

interface ItemState {
    selected?: boolean;
    equipped?: boolean;
    classList?: string;
}

export class InventoryItem extends React.Component<InventoryItemProps, ItemState> {

    constructor(props: InventoryItemProps) {
        super(props);
        this.state = {selected: false, equipped: false, classList: "inventoryItem"};
        this.handleClick = this.handleClick.bind(this);
    }

    public handleClick() {
        this.setState({selected: !this.props.selected});
        if (this.state.selected) {
            this.setState({classList: "inventoryItem activeSelection"});
        }
    }

    public render() {
        return <div className={this.state.classList} id={this.props.id} onClick={this.handleClick}>
            <span className="itemType">{this.props.type}</span>
            <span className="itemTitle">{this.props.item.name}</span>
            <span className="itemEquipped">{this.props.equipped ? "[Equipped]" : ""}</span>
            <span className="itemCount">{this.props.count.toString() + "x"}</span>
        </div>;
    }
}
