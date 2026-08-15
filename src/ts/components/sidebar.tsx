import * as React from 'react';

interface SidebarProps {
    active: string;
    auto: boolean;
    activeSelection: any;
    onAuto: any;
    onRestart: any;
    onRespawn: any;
    onCreate: any;
}

// Panel-switching views (glyph + label; label doubles as tooltip / accessible name).
// Store and Downtime are gone on purpose: shops and rest are run NODES now —
// a nav-reachable infinite catalog / free heal would break the roguelike loop.
const VIEWS: Array<[string, string]> = [
    ["Character", "◈"],
    ["Combat", "✦"],
    ["Netrun", "⌁"],
    ["Inventory", "▦"],
    ["Quests", "❖"],
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
                <button title={"New Squad"} onClick={this.props.onCreate}>✎</button>
                <button title={"Respawn"} onClick={this.props.onRespawn}>✚</button>
                <button title={"Restart"} onClick={this.props.onRestart}>⟳</button>
            </nav>);
    }
}
