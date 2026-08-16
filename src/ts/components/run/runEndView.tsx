import * as React from "react";
import {Actor} from "../../actors/Actor";

export interface RunEndViewProps {
    character: Actor;
    sector: number;
    depth: number;
    kills: number;
    /** Which run of this merc's career just ended. */
    runNo: number;
    bestSector: number;
    bestDepth: number;
    /** Hired guns still on the payroll — zero once the debrief struck them off. */
    crewLeft: number;
    canRevive: boolean;
    onRevive: () => void;
    onNextRun: () => void;
    onQuit: () => void;
}

/**
 * Run over — but not for you.
 *
 * The crew is on the pavement and everything they were carrying stays there.
 * Your character doesn't: Trauma Team bills someone else and drops them back
 * on the street with their levels and their training intact. That's the whole
 * meta-progression in one screen — the run resets, the merc doesn't — so it
 * leads with what carries over rather than what was lost.
 *
 * It also leads with *which* run this was. Without a count every wipe read
 * like the first one, which made a career of six runs feel like six false
 * starts instead of a record with a shape.
 */
export class RunEndView extends React.Component<RunEndViewProps, {}> {

    private record() {
        const {sector, depth, bestSector, bestDepth} = this.props;
        const beatSector = sector > bestSector || (sector === bestSector && depth >= bestDepth);
        if (beatSector && this.props.runNo > 1) {
            return <span className={"reRecord best"}>▲ Furthest yet</span>;
        }
        return <span className={"reRecord"}>Best: S{bestSector}·{bestDepth}</span>;
    }

    public override render() {
        const c = this.props.character;
        const first = c.name.split(" ")[0];
        const chrome = c.cybernetics ? c.cybernetics.length : 0;
        return (
            <div className={"runEnd lose"}>
                <div className={"runEndCard"}>
                    <span className={"reRunNo"}>Run {this.props.runNo}</span>
                    <h1>CREW DOWN</h1>
                    <p className={"runEndFlavor"}>
                        The job dies in sector {this.props.sector}. Trauma Team scrapes you off the asphalt,
                        bills an account you'll worry about later, and leaves you on a corner with your name
                        and nothing else.
                    </p>

                    <div className={"runEndStats"}>
                        <span><i>Reached</i><b>S{this.props.sector}·{this.props.depth}</b></span>
                        <span><i>Level</i><b>{c.level}</b></span>
                        <span><i>Lifetime kills</i><b>{this.props.kills}</b></span>
                    </div>
                    {this.record()}

                    <div className={"reLedger"}>
                        <div className={"reKeep"}>
                            <h2>{c.name} keeps</h2>
                            <ul>
                                <li>Level {c.level} · {c.experience}/{c.maxExperience} XP</li>
                                <li>Trained skills</li>
                                <li>{chrome} piece{chrome === 1 ? "" : "s"} of chrome · Humanity {c.humanity}/{c.maxHumanity}</li>
                                <li>Reputation {c.reputation}/10</li>
                            </ul>
                            {chrome > 0 &&
                                <span className={"reKeepChrome"}>
                                    {c.cybernetics.map((cw) => cw.name).join(" · ")}
                                </span>}
                        </div>
                        <div className={"reLost"}>
                            <h2>Left on the pavement</h2>
                            <ul>
                                <li>{c.weapon ? c.weapon.name : "Your weapon"} and everything else you carried</li>
                                <li>The crew purse</li>
                                <li>The crew</li>
                                <li>Sector {this.props.sector} progress</li>
                            </ul>
                        </div>
                    </div>

                    <div className={"runEndActions"}>
                        {this.props.canRevive &&
                            <button onClick={this.props.onRevive}>
                                ✚ Call Trauma Team — back into that fight (one per run)
                                <em>
                                    {this.props.crewLeft
                                        ? `${this.props.crewLeft} still on the payroll`
                                        : "the crew is already gone — you finish it alone"}
                                </em>
                            </button>}
                        <button className={"prim"} onClick={this.props.onNextRun}>
                            Send {first} back out ▸
                            <em>Sector 1, basic kit, a rookie in tow</em>
                        </button>
                        <button onClick={this.props.onQuit}>Quit to title</button>
                    </div>
                </div>
            </div>);
    }
}
