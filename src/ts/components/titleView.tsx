import * as React from "react";
import {CLASSES, classFromLegacyRole} from "../actors/resources/classes";
import type {Career} from "../interact/career";
import type {SaveHeader} from "../interact/saveGame";
import {KgBar, KgRow} from "./general/kgKit";
import {OptionsView} from "./optionsView";

const ROLE_MAP: any = CLASSES;

export interface TitleViewProps {
    /** The checkpointed run, described without rebuilding it. Null if there is none. */
    save: SaveHeader | null;
    /** The merc on file, if anyone has ever hit the street on this machine. */
    career: Career | null;
    onContinue: () => void;
    /** Open the creator on the merc on file (or on a blank form when there is none). */
    onNewRun: () => void;
    /** Open the creator on someone new — the veteran retires only if they deploy. */
    onNewCharacter: () => void;
    /** Delete the checkpoint. The career survives; the run does not. */
    onAbandon: () => void;
    /** Wipe everything — save, career, options. Confirmed on the options screen. */
    onWipe: () => void;
}

/** Which destructive question is being asked in place of the action list. */
type Confirming = "none" | "newrun" | "newchar" | "abandon";

interface TitleViewState {
    confirming: Confirming;
    /** The rules column. Open by default for a machine that has never run. */
    help: boolean;
    /** The options screen holds the whole view (and the keyboard) while open. */
    options: boolean;
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
 * The front door, as a keyed grid.
 *
 * Three columns: what the machine knows (the run, the record), what you can do
 * about it (keyed rows), and what the merc is made of (the chrome). Every row
 * answers to a key, the key bar along the foot is the legend, and rows that
 * need a merc or a run are removed — not greyed — when there isn't one.
 */
export class TitleView extends React.Component<TitleViewProps, TitleViewState> {

    constructor(props: TitleViewProps) {
        super(props);
        // With no career on file the rules aren't optional reading — they open.
        this.state = {confirming: "none", help: !props.career, options: false};
    }

    public override componentDidMount() { window.addEventListener("keydown", this.onKey); }
    public override componentWillUnmount() { window.removeEventListener("keydown", this.onKey); }

    // ---------------------------------------------------------------- keys --

    private onKey = (e: KeyboardEvent) => {
        const t = e.target as HTMLElement | null;
        if (t && ["INPUT", "SELECT", "TEXTAREA"].indexOf(t.tagName) >= 0) { return; }
        if (e.metaKey || e.ctrlKey || e.altKey) { return; }
        if (this.state.options) { return; }   // the options screen has its own listener
        const k = e.key.toLowerCase();
        // A destructive question on screen owns the keyboard until it's answered.
        if (this.state.confirming !== "none") {
            if (k === "escape" || k === "enter") { this.setState({confirming: "none"}); }
            if (k === "y") { this.proceed(); }
            return;
        }
        const {save, career} = this.props;
        if (k === "c" && save) { this.props.onContinue(); }
        else if (k === "n" && career) { this.newRun(); }
        else if (k === "b") { this.newCharacter(); }
        else if (k === "k") { this.setState({help: !this.state.help}); }
        else if (k === "o") { this.setState({options: true}); }
        else if (k === "x" && save) { this.setState({confirming: "abandon"}); }
        else if (k === "enter") {
            if (save) { this.props.onContinue(); }
            else if (career) { this.newRun(); }
            else { this.newCharacter(); }
        } else { return; }
        e.preventDefault();
    };

    // ------------------------------------------------------------- actions --

    private newRun = () => {
        // A live checkpoint is worth one question. Without a run to lose, go.
        if (this.props.save) { this.setState({confirming: "newrun"}); } else { this.props.onNewRun(); }
    };

    private newCharacter = () => {
        if (this.props.save) { this.setState({confirming: "newchar"}); } else { this.props.onNewCharacter(); }
    };

    /** Answer the open question with "do it". */
    private proceed = () => {
        const which = this.state.confirming;
        this.setState({confirming: "none"});
        if (which === "newrun") { this.props.onNewRun(); }
        else if (which === "newchar") { this.props.onNewCharacter(); }
        else if (which === "abandon") { this.props.onAbandon(); }
    };

    // ------------------------------------------------------------- columns --

    private runBlock(save: SaveHeader) {
        const role = ROLE_MAP[save.role] ? ROLE_MAP[save.role].name : save.role;
        const when = ago(save.savedAt);
        return (
            <React.Fragment>
                <h3 className={"kgH"}>The run on the street</h3>
                <dl className={"kgDfn"}>
                    <dt>Merc</dt><dd>{save.name} · {role} L{save.level}</dd>
                    <dt>Sector</dt><dd>{save.sector}</dd>
                    <dt>Waypoints</dt><dd>{save.depth} deep</dd>
                    <dt>Purse</dt><dd>{save.funds}¥</dd>
                    <dt>Crew</dt><dd>{save.squad}</dd>
                    {when ? <React.Fragment><dt>Saved</dt><dd>{when}</dd></React.Fragment> : null}
                </dl>
            </React.Fragment>);
    }

    private rules() {
        return (
            <React.Fragment>
                <h3 className={"kgH"}>How runs work</h3>
                <dl className={"kgDfn"} style={{gridTemplateColumns: "1fr"}}>
                    <dt>A run</dt>
                    <dd className={"l"}>
                        A sector is a district of Evolvia laid out as waypoints on the street grid. Walk
                        them in any order you can reach — firefights, fixers, markets, safehouses, NET
                        access — and the boss waypoint opens the next sector, which is worse.
                    </dd>
                    <dt>Your crew</dt>
                    <dd className={"l"}>
                        Up to three guns on the payroll beside you, hired off the street with eddies from
                        the last payday. They can die. They stay dead unless you pay Trauma Team at the
                        debrief.
                    </dd>
                    <dt>Your merc</dt>
                    <dd className={"l"}>
                        You are the one who doesn't. A wipe ends the run, not the character: Trauma Team
                        puts you back on a corner with your levels, your training, your reputation and the
                        chrome you paid Humanity for. The gear, the eddies and the crew stay on the
                        pavement, and the next run starts at Sector 1 in basic kit.
                    </dd>
                    <dt>Combat</dt>
                    <dd className={"l"}>
                        Cyberpunk RED rules, resolved a turn at a time. It plays itself by default — take
                        control of any squad member from the roster to give orders yourself.
                    </dd>
                </dl>
            </React.Fragment>);
    }

    private confirmStrip() {
        const {save} = this.props;
        const which = this.state.confirming;
        if (which === "none" || !save) { return null; }
        const text = which === "abandon"
            ? `Abandon the run on the street — ${save.name} in Sector ${save.sector}, ${save.depth} waypoints
               deep, ${save.funds}¥ in the purse. The record survives; the run is not coming back.`
            : `A ${which === "newchar" ? "new character" : "new run"} ends the one on the street now —
               ${save.name} in Sector ${save.sector}, ${save.depth} waypoints deep, ${save.funds}¥ in the
               crew purse. That run is not coming back.`;
        return (
            <div className={"kgConfirm"}>
                <p className={"kgP"}>{text}</p>
                <div className={"kgRowPair"}>
                    <button onClick={() => this.setState({confirming: "none"})}>← Keep it (esc)</button>
                    <button className={"dgr"} onClick={this.proceed}>
                        {which === "abandon" ? "End it (y) ▸" : "End it and start over (y) ▸"}
                    </button>
                </div>
            </div>);
    }

    private actions() {
        const {save, career} = this.props;
        const first = career ? career.name.split(" ")[0] : "";
        return (
            <React.Fragment>
                <h3 className={"kgH"}>Actions</h3>
                {save &&
                    <KgRow hotkey={"C"} label={"Continue run"} on
                           value={`sector ${save.sector} · ${save.depth} deep`}
                           onClick={this.props.onContinue}/>}
                {career &&
                    <KgRow hotkey={"N"} label={"New run"} on={!save}
                           value={`keep ${first} · sector 1`} onClick={this.newRun}/>}
                <KgRow hotkey={"B"} label={"New character"} on={!save && !career}
                       value={career ? `retires ${first}` : "build a merc"}
                       onClick={this.newCharacter}/>
                <KgRow hotkey={"K"} label={"Codex"} on={this.state.help} value={"how runs work"}
                       onClick={() => this.setState({help: !this.state.help})}/>
                <KgRow hotkey={"O"} label={"Options"} value={"speed · CRT · fx · data"}
                       onClick={() => this.setState({options: true})}/>
                {save &&
                    <KgRow hotkey={"X"} label={"Abandon run"} danger value={"permanent"}
                           onClick={() => this.setState({confirming: "abandon"})}/>}
            </React.Fragment>);
    }

    private keyBar() {
        const {save, career} = this.props;
        const keys = [save ? "C" : "", career ? "N" : "", "B"].filter(Boolean).join("/");
        const primary = save ? "continue run" : career ? "new run" : "new character";
        return (
            <KgBar>
                <span className={"keysOnly"}><b>{keys}</b> run</span>
                <span className={"keysOnly"}><b>K</b> codex · <b>O</b> options{save ? " · " : ""}{save && <b>X</b>}{save ? " abandon" : ""}</span>
                <span className={"r keysOnly"}><b>enter</b> {primary}</span>
            </KgBar>);
    }

    public override render() {
        const {save, career} = this.props;
        if (this.state.options) {
            return <OptionsView onClose={() => this.setState({options: false})} onWipe={this.props.onWipe}/>;
        }
        const role = career ? ROLE_MAP[classFromLegacyRole(career.spec.role)] : null;
        return (
            <div className={"kg"}>
                <div className={"kgTop"}>
                    <span className={"brand"}>RAINFALL</span>
                    <span>Evolvia · Cyberpunk RED</span>
                    {career
                        ? <span className={"r"}>{career.name} · {role ? role.name : ""} <b>L{career.merc.level}</b></span>
                        : <span className={"r"}>No career on file</span>}
                    {save && <span className={"ed"}>{save.funds}¥</span>}
                </div>
                <div className={"kgBody"}>
                    <div className={"kgCol"}>
                        {save
                            ? this.runBlock(save)
                            : <React.Fragment>
                                <h3 className={"kgH"}>The street</h3>
                                <p className={"kgP dim"}>
                                    {career
                                        ? "No run on the street. The record survives every wipe — the runs don't."
                                        : "Evolvia doesn't know you yet. No record, no save, no crew — the city " +
                                          "opens the same way for everyone."}
                                </p>
                            </React.Fragment>}
                    </div>
                    <div className={"kgCol n"} style={{width: "min(360px, 34vw)"}}>
                        {this.state.confirming !== "none" ? this.confirmStrip() : this.actions()}
                    </div>
                    {this.state.help &&
                        <div className={"kgCol"}>
                            {this.rules()}
                        </div>}
                </div>
                {this.keyBar()}
            </div>);
    }
}
