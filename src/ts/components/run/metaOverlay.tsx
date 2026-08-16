import * as React from "react";

export interface MetaOverlayProps {
    title: string;
    /** Read-out shown beside the title (eddies, Humanity) — never an action. */
    readout?: React.ReactNode;
    onLeave?: (() => void) | undefined;
    /** Label for the leave action. Ignored when `foot` is given. */
    leaveLabel?: string;
    /** Full control of the action bar, for screens whose actions change with state. */
    foot?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * The action bar every run overlay ends with.
 *
 * Continue / Leave / Move on used to live in the title bar at the top right —
 * the single hardest place to reach one-handed on a phone, and the first thing
 * a thumb travels past on the way to nothing. The overlay is a flex column
 * with a scrolling middle, so a footer here sits on the bottom edge of the
 * viewport at every size without any fixed positioning to fight.
 *
 * The top bar keeps the title and the read-outs. Those are things to look at;
 * this is the thing to press.
 */
export class MetaFoot extends React.Component<{children: React.ReactNode}, {}> {
    public override render() {
        return (
            <div className={"metaFoot"}>
                <div className={"metaFootInner"}>{this.props.children}</div>
            </div>);
    }
}

/**
 * A leave-able full-screen wrapper for a run's non-combat nodes — it hosts an
 * existing panel (the Store for merchants, the hire board for the fixer) with a
 * title bar, and an action bar along the bottom that advances the map.
 */
export class MetaOverlay extends React.Component<MetaOverlayProps, {}> {
    public override render() {
        const foot = this.props.foot !== undefined
            ? this.props.foot
            : this.props.onLeave
                ? <button className={"metaLeave"} onClick={this.props.onLeave}>
                    {this.props.leaveLabel || "Leave ▸"}
                </button>
                : null;
        return (
            <div className={"metaOverlay"}>
                <div className={"metaHead"}>
                    <span className={"metaTitle"}>{this.props.title}</span>
                    {this.props.readout}
                </div>
                {this.props.children}
                {foot && <MetaFoot>{foot}</MetaFoot>}
            </div>);
    }
}
