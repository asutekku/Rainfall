import * as React from "react";
import {CLASSES, classFromLegacyRole} from "../actors/resources/classes";
import type {Career} from "../interact/career";
import type {SaveHeader} from "../interact/saveGame";

const ROLE_MAP: any = CLASSES;

export interface TitleViewProps {
    /** The checkpointed run, described without rebuilding it. Null if there is none. */
    save: SaveHeader | null;
    /** The merc on file, if anyone has ever hit the street on this machine. */
    career: Career | null;
    onContinue: () => void;
    onNewRun: () => void;
}

interface TitleViewState {
    /** Starting a new run would end the checkpointed one — ask once, first. */
    confirming: boolean;
    /** The rules panel, folded away until asked for. */
    help: boolean;
}

/** "12 min ago" / "2 days ago" — vague on purpose, exact enough to recognise. */
function ago(stamp: number): string {
    if (!stamp) { return ""; }
    const mins = Math.floor((Date.now() - stamp) / 60000);
    if (mins < 1) { return "just now"; }
    if (mins < 60) { return `${mins} min ago`; }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) { return `${hrs} hour${hrs > 1 ? "s" : ""} ago`; }
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
}

/**
 * The front door.
 *
 * The game used to open on the character editor, which asked a player who had
 * been told nothing to pick between nine roles, and buried a returning
 * player's saved run in a header bar next to the button that would destroy it.
 *
 * There are two ways in and no more. Continue picks the run back up. New Run
 * goes to the creator — which is where "the same merc or someone new" gets
 * decided, so the two never sit side by side pretending to be different doors.
 */
export class TitleView extends React.Component<TitleViewProps, TitleViewState> {

    constructor(props: TitleViewProps) {
        super(props);
        this.state = {confirming: false, help: false};
    }

    private newRun = () => {
        // A live checkpoint is worth one question. Without a run to lose, go.
        if (this.props.save) { this.setState({confirming: true}); } else { this.props.onNewRun(); }
    };

    private resume(save: SaveHeader) {
        const role = ROLE_MAP[save.role] ? ROLE_MAP[save.role].name : save.role;
        const when = ago(save.savedAt);
        return (
            <button className={"tBtn prim tResume"} onClick={this.props.onContinue}>
                <span className={"tBtnMain"}>▸ Continue run</span>
                <span className={"tBtnSub"}>
                    {save.name} · {role} L{save.level} · Sector {save.sector} · {save.depth} deep
                    · {save.funds}¥ · squad of {save.squad}{when ? ` · ${when}` : ""}
                </span>
            </button>);
    }

    private veteran(career: Career) {
        const role = ROLE_MAP[classFromLegacyRole(career.spec.role)];
        const last = career.lastRun;
        return (
            <div className={"tCareer"}>
                <img src={`src/media/portraits/${role ? role.portrait : "cop"}.png`} alt={role ? role.name : ""}/>
                <div className={"tCareerBody"}>
                    <b>{career.name}</b>
                    <span>{role ? role.name : ""} · Level {career.merc.level} · {career.kills} kills</span>
                    <span className={"tCareerRec"}>
                        {career.runs} run{career.runs > 1 ? "s" : ""} · best Sector {career.bestSector}
                        {career.bestDepth ? ` · ${career.bestDepth} waypoints deep` : ""}
                        {last ? ` · last job died in Sector ${last.sector}` : ""}
                    </span>
                </div>
            </div>);
    }

    private confirm(save: SaveHeader) {
        return (
            <div className={"tConfirm"}>
                <p>
                    A new run ends the one on the street now — {save.name} in Sector {save.sector},
                    {" "}{save.depth} waypoints deep, {save.funds}¥ in the crew purse. That run is not
                    coming back.
                </p>
                <div className={"tConfirmRow"}>
                    <button className={"tBtn"} onClick={() => this.setState({confirming: false})}>
                        ← Keep it
                    </button>
                    <button className={"tBtn tDanger"} onClick={this.props.onNewRun}>
                        End it and start over ▸
                    </button>
                </div>
            </div>);
    }

    private rules() {
        return (
            <div className={"tHelp"}>
                <dl>
                    <dt>A run</dt>
                    <dd>
                        A sector is a district of Evolvia laid out as waypoints on the street grid. Walk
                        them in any order you can reach — firefights, fixers, markets, safehouses, NET
                        access — and the boss waypoint opens the next sector, which is worse.
                    </dd>
                    <dt>Your crew</dt>
                    <dd>
                        Up to three guns on the payroll beside you, hired off the street with eddies from
                        the last payday. They can die. They stay dead unless you pay Trauma Team at the
                        debrief.
                    </dd>
                    <dt>Your merc</dt>
                    <dd>
                        You are the one who doesn't. A wipe ends the run, not the character: Trauma Team
                        puts you back on a corner with your levels, your training, your reputation and the
                        chrome you paid Humanity for. The gear, the eddies and the crew stay on the
                        pavement, and the next run starts at Sector 1 in basic kit.
                    </dd>
                    <dt>Combat</dt>
                    <dd>
                        Cyberpunk RED rules, resolved a turn at a time. It plays itself by default — take
                        control of any squad member from the roster to give orders yourself.
                    </dd>
                </dl>
            </div>);
    }

    public override render() {
        const {save, career} = this.props;
        return (
            <div className={"title"}>
                <div className={"titleCard"}>
                    <h1>RAINFALL</h1>
                    <p className={"tTag"}>Evolvia · Cyberpunk RED</p>
                    <p className={"tFlavor"}>
                        The once-great city, ridden with dealers, gangs and loafers. You are one of them:
                        a merc with a Trauma Team subscription, a rented crew, and a district to walk
                        through one waypoint at a time.
                    </p>

                    {career && this.veteran(career)}

                    {this.state.confirming && save
                        ? this.confirm(save)
                        : <div className={"tActions"}>
                            {save && this.resume(save)}
                            <button className={"tBtn" + (save ? "" : " prim")} onClick={this.newRun}>
                                <span className={"tBtnMain"}>
                                    {career ? `New run with ${career.name.split(" ")[0]} ▸` : "Hit the street ▸"}
                                </span>
                                <span className={"tBtnSub"}>
                                    {career
                                        ? "Sector 1, basic kit, a rookie in tow — or retire them and build someone new"
                                        : "Build your merc and take the first job"}
                                </span>
                            </button>
                        </div>}

                    <button className={"tHelpToggle" + (this.state.help ? " on" : "")}
                            onClick={() => this.setState({help: !this.state.help})}>
                        {this.state.help ? "▾" : "▸"} How it works
                    </button>
                    {this.state.help && this.rules()}
                </div>
            </div>);
    }
}
