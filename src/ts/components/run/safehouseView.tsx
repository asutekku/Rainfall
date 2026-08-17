import * as React from "react";
import {Actor} from "../../actors/Actor";
import {NodeShell} from "./metaOverlay";

export interface SafehouseViewProps {
    party: Actor[];
    onLeave: (lines: string[]) => void;
}

interface SafehouseViewState { done: string | null; }

/**
 * The campfire choice: one night in a safehouse buys exactly ONE of —
 * patching up, drilling, or decompressing. Pick and live with it. (The old
 * rent/eviction/housing sim stays out of runs.)
 */
export class SafehouseView extends React.Component<SafehouseViewProps, SafehouseViewState> {

    constructor(props: SafehouseViewProps) {
        super(props);
        this.state = {done: null};
    }

    private patch = () => {
        this.props.party.forEach((p) => {
            if (p.mortallyWounded) { p.stabilize(); }
            p.heal(Math.floor(p.maxHealth * 0.5));
        });
        this.setState({done: "Field dressings, hot water, four hours of real sleep. The squad heals half its wounds."});
    };

    private drill = () => {
        this.props.party.forEach((p) => p.trainWeaponSkill());
        this.setState({done: "Dry-fire drills in the stairwell until dawn. Everyone's weapon handling sharpens (+1 skill)."});
    };

    private decompress = () => {
        this.props.party.forEach((p) => {
            p.humanity = Math.min(p.maxHumanity, p.humanity + 6);
            p.stats.emp = Math.floor(p.humanity / 10);
            p.refreshLuck();
        });
        this.setState({done: "Music, bad jokes, no screens. The crew remembers what they're doing this for (+6 Humanity, Luck restored)."});
    };

    public override render() {
        const done = this.state.done;
        return (
            <NodeShell accent={"sh"} icon={"☾"} label={"Safehouse"}
                       kicker={"One night off the street"} title={"Safehouse"}
                       sub={"A cold-water flat with a working lock and a mattress that's seen worse. " +
                            "The whole squad gets one night behind a door that holds."}
                       onLeave={done
                           ? () => this.props.onLeave([done])
                           : () => this.props.onLeave(["— no time to rest —"])}
                       leaveLabel={done ? "Move out ▸" : "Skip the night ▸"}
                       leaveGhost={!done}
                       guide={!done
                           ? <React.Fragment>
                               Pick <b>one</b> way to spend the night — it applies to the whole squad,
                               and the other two are gone by morning.
                           </React.Fragment>
                           : undefined}>
                {!done && (
                    <div className={"evOpts"}>
                        <button className={"evOpt"} onClick={this.patch}>
                            <span className={"evOptLabel"}>Patch up</span>
                            <span className={"evOptMeta"}><em>squad heals 50% of max HP · stabilises the dying</em></span>
                        </button>
                        <button className={"evOpt"} onClick={this.drill}>
                            <span className={"evOptLabel"}>Run combat drills</span>
                            <span className={"evOptMeta"}><em>everyone +1 to their equipped weapon skill, permanently</em></span>
                        </button>
                        <button className={"evOpt"} onClick={this.decompress}>
                            <span className={"evOptLabel"}>Decompress</span>
                            <span className={"evOptMeta"}><em>squad +6 Humanity · Luck pools refill to full</em></span>
                        </button>
                    </div>
                )}
                {done && <div className={"evResult"}><p>{done}</p></div>}
            </NodeShell>);
    }
}
