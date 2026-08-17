import * as React from "react";
import {Actor} from "../../actors/Actor";
import {MetaFoot} from "./metaOverlay";

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
            <div className={"metaOverlay"}>
                <div className={"metaHead"}>
                    <span className={"metaTitle"}>☾ Safehouse</span>
                </div>
                <div className={"ovScroll"}>
                    <div className={"ovInner"}>
                        <div className={"mHero sh"}>
                            <span className={"mHeroGlyph"}><i>☾</i></span>
                            <span className={"mHeroKicker"}>One night off the street</span>
                            <h2 className={"mHeroTitle"}>Safehouse</h2>
                        </div>
                        <p className={"evFlavor"}>
                            A cold-water flat with a working lock and a mattress that's seen worse.
                            One night. One call — make it count.
                        </p>
                        {!done && (
                            <div className={"evOpts"}>
                                <button className={"evOpt"} onClick={this.patch}>
                                    <span className={"evOptLabel"}>Patch up</span>
                                    <span className={"evOptMeta"}><em>squad heals 50%, stabilises the dying</em></span>
                                </button>
                                <button className={"evOpt"} onClick={this.drill}>
                                    <span className={"evOptLabel"}>Run combat drills</span>
                                    <span className={"evOptMeta"}><em>everyone +1 to their equipped weapon skill</em></span>
                                </button>
                                <button className={"evOpt"} onClick={this.decompress}>
                                    <span className={"evOptLabel"}>Decompress</span>
                                    <span className={"evOptMeta"}><em>squad +6 Humanity · Luck pools refill</em></span>
                                </button>
                            </div>
                        )}
                        {done && <div className={"evResult"}><p>{done}</p></div>}
                    </div>
                </div>
                <MetaFoot>
                    {done
                        ? <button className={"metaLeave"} onClick={() => this.props.onLeave([done])}>Move out ▸</button>
                        : <button className={"metaLeaveGhost"}
                                  onClick={() => this.props.onLeave(["— no time to rest —"])}>Skip the night ▸</button>}
                </MetaFoot>
            </div>);
    }
}
