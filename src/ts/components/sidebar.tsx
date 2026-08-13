import * as React from 'react';

interface SidebarProps {
    activeSelection: any;
    active: string;
}

// Icon glyph + label for each view. Label doubles as tooltip and accessible name.
const ITEMS: Array<[string, string]> = [
    ["Character", "◈"],
    ["Quests", "❖"],
    ["Store", "▤"],
    ["Inventory", "▦"],
    ["Combat", "✦"],
    ["Netrun", "⌁"],
    ["Downtime", "☾"],
    ["Auto", "▸"],
    ["Restart", "⟳"],
    ["Respawn", "✚"],
    ["Stats", "▥"],
];

export class Sidebar extends React.Component<SidebarProps, {}> {
    public render() {
        return (
            <nav>
                {ITEMS.map(([name, icon]) => (
                    <button
                        key={name}
                        title={name}
                        className={this.props.active === name ? "on" : ""}
                        onClick={() => this.props.activeSelection(name)}>
                        {icon}
                    </button>
                ))}
            </nav>);
    }
}
