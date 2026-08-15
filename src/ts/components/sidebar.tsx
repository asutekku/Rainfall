import * as React from 'react';

interface SidebarProps {
    active: string;
    auto: boolean;
    /** A run is in progress: the panels that belong to map nodes leave the rail. */
    inRun: boolean;
    activeSelection: any;
    onAuto: any;
    onCreate: any;
}

// Panel-switching views (glyph + label; label doubles as tooltip / accessible name).
const VIEWS: Array<[string, string]> = [
    ["Character", "◈"],
    ["Combat", "✦"],
    ["Netrun", "⌁"],
    ["Store", "▤"],
    ["Inventory", "▦"],
    ["Quests", "❖"],
    ["Downtime", "☾"],
    ["Stats", "▥"],
];

/**
 * Panels a run reaches through its own map nodes. Leaving them on the rail made
 * the black market, the safehouse and the NET free and unlimited from anywhere,
 * which is the same as deleting the merchant and rest nodes — and the netrun
 * payout in particular was an on-demand eddies faucet worth several sectors of
 * income per minute of clicking.
 */
const NODE_ONLY: string[] = ["Netrun", "Store", "Downtime"];

export class Sidebar extends React.Component<SidebarProps, {}> {
    public override render() {
        return (
            <nav>
                {VIEWS.filter(([name]) => !(this.props.inRun && NODE_ONLY.indexOf(name) >= 0)).map(([name, icon]) => (
                    <button
                        key={name}
                        title={name}
                        className={this.props.active === name ? "on" : ""}
                        onClick={() => this.props.activeSelection(name)}>
                        {icon}
                    </button>
                ))}
                <span className={"navSep"}/>
                <button title={this.props.auto ? "Auto: on" : "Auto"}
                        className={this.props.auto ? "act-on" : ""}
                        onClick={this.props.onAuto}>▸</button>
                <button title={"New character"} onClick={this.props.onCreate}>✎</button>
            </nav>);
    }
}
