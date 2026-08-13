import * as React from 'react';

interface SidebarProps {
    active: string;
    auto: boolean;
    activeSelection: any;
    onAuto: any;
    onRestart: any;
    onRespawn: any;
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

export class Sidebar extends React.Component<SidebarProps, {}> {
    public render() {
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
                <button title={"Respawn"} onClick={this.props.onRespawn}>✚</button>
                <button title={"Restart"} onClick={this.props.onRestart}>⟳</button>
            </nav>);
    }
}
