import * as React from "react";

export interface MetaOverlayProps {
    title: string;
    onLeave: () => void;
    children: React.ReactNode;
}

/**
 * A leave-able full-screen wrapper for a run's non-combat nodes — it hosts an
 * existing panel (the Store for merchants, Downtime for safehouses) with a title
 * bar and a Leave button that advances the map.
 */
export class MetaOverlay extends React.Component<MetaOverlayProps, {}> {
    public override render() {
        return (
            <div className={"metaOverlay"}>
                <div className={"metaHead"}>
                    <span className={"metaTitle"}>{this.props.title}</span>
                    <button className={"metaLeave"} onClick={this.props.onLeave}>Leave ▸</button>
                </div>
                {this.props.children}
            </div>);
    }
}
