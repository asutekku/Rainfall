import * as React from "react";

export interface RunEndViewProps {
    outcome: "won" | "lost";
    depth: number;
    kills: number;
    eddies: number;
    canRevive: boolean;
    onRevive: () => void;
    onNewCrew: () => void;
}

/**
 * Run-over takeover: victory or flatline, with run stats. On a wipe with the
 * per-run revive still available, the squad can spend a costly Trauma Team
 * revive and resume the fight; otherwise the only way on is a fresh crew.
 */
export class RunEndView extends React.Component<RunEndViewProps, {}> {
    public override render() {
        const won = this.props.outcome === "won";
        return (
            <div className={"runEnd " + (won ? "win" : "lose")}>
                <div className={"runEndCard"}>
                    <h1>{won ? "JOB COMPLETE" : "FLATLINED"}</h1>
                    <p className={"runEndFlavor"}>{won
                        ? "The crew walks away richer and meaner. Night City remembers the name."
                        : "The squad bleeds out on the neon asphalt. Someone else takes the contract."}</p>
                    <div className={"runEndStats"}>
                        <span><i>Depth</i><b>{this.props.depth}</b></span>
                        <span><i>Kills</i><b>{this.props.kills}</b></span>
                        <span><i>Eddies</i><b>{this.props.eddies}¥</b></span>
                    </div>
                    <div className={"runEndActions"}>
                        {this.props.canRevive &&
                            <button className={"prim"} onClick={this.props.onRevive}>
                                ✚ Call Trauma Team — revive (one per run)
                            </button>}
                        <button className={this.props.canRevive ? "" : "prim"} onClick={this.props.onNewCrew}>
                            New Crew ▸
                        </button>
                    </div>
                </div>
            </div>);
    }
}
