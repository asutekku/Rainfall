import * as React from 'react';

interface SidebarProps {
    active: string;
    auto: boolean;
    activeSelection: any;
    onAuto: any;
    onCreate: any;
}

// Panel-switching views (glyph + label; label doubles as tooltip / accessible name).
// Deliberately short. Store, Downtime and the NET are run NODES — putting them
// on the rail made them free and unlimited from anywhere, which is the same as
// deleting the merchant, safehouse and NET-access nodes. "Character" is reached
// through the squad roster (tap a member's ›), and Quests was a mock — cut
// until there's a real contract system to put behind it.
const VIEWS: Array<[string, string]> = [
    ["Combat", "✦"],
    ["Inventory", "▦"],
    ["Stats", "▥"],
];

export class Sidebar extends React.Component<SidebarProps, {}> {
    public override render() {
        return (
            <nav>
                {VIEWS.map(([name, icon]) => (
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
