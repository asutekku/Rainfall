import * as React from "react";

export type MobileTab = "arena" | "squad" | "feed" | "gear" | "panel";

export interface MobileTabsProps {
    tab: MobileTab;
    /** More sheet (the nav rail) is open. */
    more: boolean;
    /** Feed lines arrived while the Feed tab was not on screen. */
    unread: number;
    onTab: (tab: MobileTab) => void;
    onMore: () => void;
}

// Five destinations. Everything else lives behind More, which re-uses the nav rail.
const TABS: Array<[MobileTab, string, string]> = [
    ["arena", "✦", "Arena"],
    ["squad", "◈", "Squad"],
    ["feed", "▤", "Feed"],
    ["gear", "▦", "Gear"],
];

/**
 * Bottom tab bar, shown only under the mobile breakpoint (CSS hides it above).
 * The Arena tab holds the combat screen; Squad and Feed surface the two panels
 * that share the desktop feed column; Gear is the inventory; More slides the
 * nav rail up as a sheet.
 */
export class MobileTabs extends React.Component<MobileTabsProps, {}> {
    public render() {
        return (
            <nav className={"mtabs"} aria-label={"Sections"}>
                {TABS.map(([id, icon, label]) => (
                    <button key={id}
                            className={this.props.tab === id && !this.props.more ? "on" : ""}
                            aria-current={this.props.tab === id ? "page" : undefined}
                            onClick={() => this.props.onTab(id)}>
                        <span className={"mtIcon"}>{icon}</span>{label}
                        {id === "feed" && this.props.unread > 0 &&
                            <span className={"mtBadge"}>{this.props.unread > 9 ? "9+" : this.props.unread}</span>}
                    </button>
                ))}
                <button className={this.props.more ? "on" : ""}
                        aria-expanded={this.props.more}
                        onClick={this.props.onMore}>
                    <span className={"mtIcon"}>☰</span>More
                </button>
            </nav>);
    }
}
