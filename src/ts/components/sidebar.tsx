import * as React from 'react';

interface SidebarProps {
    active: string;
    /**
     * The squad is standing on the map, so the checkpoint is current and
     * leaving costs nothing. Off the map it stays hidden — quitting out of a
     * fight would rewind to the last waypoint, which is a way to un-lose it.
     */
    canQuit: boolean;
    activeSelection: any;
    onQuit: any;
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
                {this.props.canQuit && <span className={"navSep"}/>}
                {this.props.canQuit &&
                    <button title={"Quit to title — the run is checkpointed here"}
                            onClick={this.props.onQuit}>⏻</button>}
            </nav>);
    }
}
