import * as React from "react";
import {Actor} from "../../actors/Actor";

export interface RunEndViewProps {
    character: Actor;
    sector: number;
    depth: number;
    kills: number;
    canRevive: boolean;
    onRevive: () => void;
    onNextRun: () => void;
    onNewCharacter: () => void;
}

/**
 * Run over — but not for you.
 *
 * The crew is on the pavement and everything they were carrying stays there.
 * Your character doesn't: Trauma Team bills someone else and drops them back
 * on the street with their levels and their training intact. That's the whole
 * meta-progression in one screen — the run resets, the merc doesn't — so it
 * leads with what carries over rather than what was lost.
 */
export class RunEndView extends React.Component<RunEndViewProps, {}> {
    public override render() {
        const c = this.props.character;
        return (
            <div className={"runEnd lose"}>
                <div className={"runEndCard"}>
                    <h1>CREW DOWN</h1>
                    <p className={"runEndFlavor"}>
                        The job dies in sector {this.props.sector}. Trauma Team scrapes you off the asphalt,
                        bills an account you'll worry about later, and leaves you on a corner with your name
                        and nothing else.
                    </p>

                    <div className={"runEndKeeps"}>
                        <span className={"reKeepHead"}>{c.name} walks away with</span>
                        <div className={"runEndStats"}>
                            <span><i>Level</i><b>{c.level}</b></span>
                            <span><i>Kills</i><b>{this.props.kills}</b></span>
                            <span><i>Reached</i><b>S{this.props.sector}·{this.props.depth}</b></span>
                        </div>
                        <span className={"reKeepLost"}>Gear, eddies and crew stay behind.</span>
                    </div>

                    <div className={"runEndActions"}>
                        {this.props.canRevive &&
                            <button className={"prim"} onClick={this.props.onRevive}>
                                ✚ Call Trauma Team — back into the fight (one per run)
                            </button>}
                        <button className={this.props.canRevive ? "" : "prim"} onClick={this.props.onNextRun}>
                            Next run ▸
                        </button>
                        <button onClick={this.props.onNewCharacter}>Start over with someone new</button>
                    </div>
                </div>
            </div>);
    }
}
