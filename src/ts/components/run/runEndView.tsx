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

interface RunEndViewState { ledger: boolean; }

/**
 * Run over — but not for you.
 *
 * The crew is on the pavement and everything they were carrying stays there.
 * Your character doesn't: Trauma Team bills someone else and drops them back
 * on the street with their levels and their training intact. That's the whole
 * meta-progression in one screen — the run resets, the merc doesn't — so it
 * leads with what carries over rather than what was lost, and with *which*
 * run this was, because without a count every wipe read like the first one.
 *
 * It has to say all that inside one screenful. It used to run 789px tall,
 * which fits a fullscreen 844px viewport and no real phone — Safari's URL bar
 * leaves about 745, and 360x640 handsets were 188px short. The overflow was
 * invisible: `.runEndActions` is sticky with an opaque background, so it sat
 * on top of the ledger it had pushed off the bottom, and a dark card gives no
 * scrollbar to argue otherwise. The screen read as broken.
 *
 * So the invariant half — the same four bullets kept and four lost on every
 * wipe forever — folds away behind a summary line. It is worth reading once,
 * on your first death; after that it is furniture, and furniture does not get
 * to push the buttons off the screen.
 */
export class RunEndView extends React.Component<RunEndViewProps, RunEndViewState> {

    constructor(props: RunEndViewProps) {
        super(props);
        // open on the first wipe, when the death loop still needs explaining
        this.state = {ledger: props.runNo <= 1};
    }

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
                    <div className={"reScroll"}>
                    <span className={"reRunNo"}>Run {this.props.runNo}</span>
                    <h1>CREW DOWN</h1>

                    <div className={"reReached"}>
                        <b>Sector {this.props.sector} · {this.props.depth} deep</b>
                        {this.record()}
                    </div>

                    <p className={"reCarry"}>
                        <b>{first}</b> walks away with level {c.level}, {c.experience}/{c.maxExperience} XP,
                        their training{chrome > 0 ? `, ${chrome} piece${chrome === 1 ? "" : "s"} of chrome` : ""} and
                        reputation {c.reputation}/10. Everything else stayed on the pavement.
                    </p>

                    <button className={"reLedgerToggle" + (this.state.ledger ? " on" : "")}
                            aria-expanded={this.state.ledger}
                            onClick={() => this.setState({ledger: !this.state.ledger})}>
                        {this.state.ledger ? "▾" : "▸"} What carries over
                    </button>
                    {this.state.ledger && (
                        <div className={"reLedger"}>
                            <div className={"reKeep"}>
                                <h2>{first} keeps</h2>
                                <ul>
                                    <li>Level {c.level} · {c.experience}/{c.maxExperience} XP</li>
                                    <li>Trained skills</li>
                                    <li>{chrome} piece{chrome === 1 ? "" : "s"} of chrome · Humanity {c.humanity}/{c.maxHumanity}</li>
                                    <li>Reputation {c.reputation}/10</li>
                                </ul>
                            </div>
                            <div className={"reLost"}>
                                <h2>Left on the pavement</h2>
                                <ul>
                                    <li>{c.weapon ? c.weapon.name : "Your weapon"} and everything else carried</li>
                                    <li>The crew purse</li>
                                    <li>The crew</li>
                                    <li>Sector {this.props.sector} progress</li>
                                </ul>
                            </div>
                        </div>
                    )}
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
