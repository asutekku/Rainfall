import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Purse} from "../../interact/crew";
import {Netrun as NetEngine, NetEvent, NetrunResult} from "../../interact/Netrun";
import {OptionsStore} from "../../interact/options";
import {NodeShell} from "./metaOverlay";

export interface NetDiveViewProps {
    party: Actor[];
    onLeave: (lines: string[]) => void;
}

type Tone = "sys" | "dim" | "ok" | "warn" | "bad" | "gold";
type FloorMark = "wait" | "here" | "clear" | "ice" | "derez" | "lock";

/** One beat of the playback: a line and/or a patch to the readouts. */
interface Frame {
    text?: string;
    tone?: Tone;
    /** ms before the next frame lands (pre-scaled by combat speed). */
    hold: number;
    hp?: number;
    gain?: number;
    stamp?: {label: string; tone: Tone};
    floorAt?: number;
    mark?: [number, FloorMark];
    /** The floor's nature, revealed the moment the runner reaches it. */
    reveal?: [number, string];
    glitch?: boolean;
}

interface NetDiveViewState {
    difficulty: string;
    result: NetrunResult | null;
    /** pick → dive (playing back) → done (verdict on screen). */
    phase: "pick" | "dive" | "done";
    /** How many frames of the script are on screen. */
    shown: number;
}

const DIFFICULTIES: Array<[string, string]> = [
    ["Basic", "shallow local net · small payouts, thin ICE"],
    ["Standard", "corp subnet · real eddies, real ICE"],
    ["Uncommon", "hardened arch · deep floors, black ICE"],
    ["Advanced", "military-grade · big score or a fried brain"],
];

const FLOOR_LABEL: {[k: string]: string} = {
    password: "PASSWORD GATE",
    file: "FILE VAULT",
    controlnode: "CONTROL NODE",
    blackice: "BLACK ICE",
};

const hex = () => ((Math.random() * 0xffff) << 0).toString(16).padStart(4, "0");

/** Line noise between the beats — the montage's connective tissue. */
const chatter = (): string => {
    const picks = [
        `route hop ${1 + ((Math.random() * 9) << 0)} · ${4 + ((Math.random() * 60) << 0)}ms`,
        `0x${hex()} ${hex()} ${hex()} ${hex()}`,
        "checksum ok · tunnel holds",
        "spoofing handshake …",
        `packet burst · ${hex()}::${hex()}`,
        "trace sweep passes overhead — holding still",
    ];
    return picks[(Math.random() * picks.length) << 0]!;
};

/**
 * A NET Access node: a physical jack-point into a nearby architecture. ONE
 * dive per node — pick how deep to go, send the crew's best deck-jockey in,
 * and live with the result (payouts land in the crew purse; black ICE burns
 * real HP). The engine resolves the whole run the moment the player jacks in;
 * what follows on screen is the story of it, one beat at a time — the floors
 * climbing, the breaches landing, the ICE biting back — because a dive read
 * as a paragraph is a spreadsheet, and read as a feed it's a heist.
 */
export class NetDiveView extends React.Component<NetDiveViewProps, NetDiveViewState> {

    private frames: Frame[] = [];
    private floors = 0;
    private hpMax = 1;
    private balanceBefore = 0;
    private timer: number | null = null;
    private feedRef = React.createRef<HTMLDivElement>();

    constructor(props: NetDiveViewProps) {
        super(props);
        this.state = {difficulty: "Standard", result: null, phase: "pick", shown: 0};
    }

    public override componentWillUnmount() {
        if (this.timer !== null) { window.clearTimeout(this.timer); }
    }

    public override componentDidUpdate() {
        const el = this.feedRef.current;
        if (el) { el.scrollTop = el.scrollHeight; }
    }

    /** The crew's best deck-jockey: highest Interface among those standing. */
    private runner(): Actor {
        return this.props.party.reduce((b, p) =>
            p.canFight() && p.interfaceRank() > b.interfaceRank() ? p : b, this.props.party[0]!);
    }

    // ---------------------------------------------------- script compiler --

    /** Turn the engine's beats into timed screen frames, chatter included. */
    private compile(events: NetEvent[]): Frame[] {
        // One time unit, on the combat-speed dial: Blitz players get a fast cut.
        const u = 400 / OptionsStore.speedMult();
        const out: Frame[] = [];
        const noise = (chance: number) => {
            if (Math.random() < chance) { out.push({text: chatter(), tone: "dim", hold: u * 0.45}); }
        };
        let deck = "breaker";
        for (const e of events) {
            switch (e.kind) {
                case "jack":
                    deck = e.deck;
                    this.floors = e.floors;
                    this.hpMax = e.maxHp;
                    out.push({text: "tapping the hardline …", tone: "sys", hold: u, hp: e.hp});
                    out.push({text: `handshake spoofed — ${e.difficulty.toUpperCase()} ARCHITECTURE`, tone: "ok", hold: u * 1.2});
                    out.push({text: `${e.floors} floors mapped · interface ${e.iface} · breaker: ${e.deck}`, tone: "sys", hold: u});
                    noise(1);
                    break;
                case "floor":
                    out.push({
                        text: e.type === "blackice"
                            ? `floor ${e.at + 1}/${this.floors} — signature unresolved …`
                            : `floor ${e.at + 1}/${this.floors} — ${FLOOR_LABEL[e.type]} · DV ${e.dv}`,
                        tone: e.type === "blackice" ? "warn" : "sys",
                        hold: u * 1.1, floorAt: e.at, mark: [e.at, "here"],
                        reveal: [e.at, e.type === "blackice" ? "????" : FLOOR_LABEL[e.type]!],
                    });
                    noise(0.35);
                    break;
                case "try":
                    out.push({
                        text: `breach ${e.attempt}/${e.of} ……… ${e.success ? "ACCESS GRANTED" : "DENIED"}`,
                        tone: e.success ? "ok" : "warn", hold: u * 1.4,
                    });
                    break;
                case "reward": {
                    const at = this.lastFloor(out);
                    out.push({text: `siphoning accounts ……… +${e.eddies}¥`, tone: "gold",
                        hold: u * 1.3, gain: e.eddies, mark: [at, "clear"]});
                    break;
                }
                case "ice": {
                    const at = this.lastFloor(out);
                    out.push({text: `▲ BLACK ICE — ${e.name.toUpperCase()} REZZES UP`, tone: "bad",
                        hold: u * 2, mark: [at, "ice"], reveal: [at, e.name.toUpperCase()], glitch: true});
                    break;
                }
                case "iceRound":
                    out.push({
                        text: e.hit
                            ? (e.rezLeft > 0 ? `${deck} connects — ICE integrity ${e.rezLeft}` : `${deck} connects — integrity zero`)
                            : `${deck} shatters on the ICE wall`,
                        tone: e.hit ? "ok" : "warn", hold: u * 0.9,
                    });
                    if (e.bit) {
                        out.push({text: `⚡ feedback surge — −${e.dmg} brain`, tone: "bad",
                            hold: u * 1.2, hp: e.hp, glitch: true});
                    }
                    break;
                case "derez": {
                    const at = this.lastFloor(out);
                    out.push({text: `${e.name.toUpperCase()} DEREZZED`, tone: "ok", hold: u * 1.6, mark: [at, "derez"]});
                    noise(0.5);
                    break;
                }
                case "lockout": {
                    const at = this.lastFloor(out);
                    out.push({text: "trace lock acquired — CONNECTION SEVERED", tone: "bad",
                        hold: u * 1.8, mark: [at, "lock"], glitch: true});
                    break;
                }
                case "flatline":
                    out.push({text: "biotelemetry lost", tone: "bad", hold: u * 1.4, glitch: true});
                    out.push({stamp: {label: "FLATLINE", tone: "bad"}, hold: u * 2.4, glitch: true});
                    out.push({text: "TRAUMA TEAM DISPATCH — extraction inbound", tone: "warn", hold: u * 1.5});
                    break;
                case "exit":
                    if (e.success) {
                        out.push({stamp: {label: "ARCHITECTURE CRACKED", tone: "ok"}, hold: u * 2});
                    } else if (events.some((x) => x.kind === "flatline")) {
                        // the FLATLINE stamp already landed — let it stand
                    } else {
                        out.push({stamp: {label: "JACKED OUT", tone: "warn"}, hold: u * 2});
                    }
                    out.push({text: `haul: ${e.eddies}¥ · ${e.cleared}/${e.total} floors` +
                        (e.brain > 0 ? ` · ${e.brain} brain damage` : ""), tone: "gold", hold: u});
                    break;
            }
        }
        return out;
    }

    /** The floor the script last arrived at (for marks emitted after it). */
    private lastFloor(out: Frame[]): number {
        for (let i = out.length - 1; i >= 0; i--) {
            const f = out[i]!;
            if (f.floorAt !== undefined) { return f.floorAt; }
        }
        return 0;
    }

    // ------------------------------------------------------------ playback --

    private dive = () => {
        if (this.state.result) { return; }
        const runner = this.runner();
        this.balanceBefore = Purse.balance(this.props.party[0]!);
        const arch = NetEngine.generate(this.state.difficulty);
        const result = NetEngine.run(runner, arch);
        this.frames = this.compile(result.events);
        this.setState({result, phase: "dive", shown: 0}, this.step);
    };

    private step = () => {
        const at = this.state.shown;
        if (at >= this.frames.length) {
            this.setState({phase: "done"});
            return;
        }
        this.setState({shown: at + 1});
        this.timer = window.setTimeout(this.step, this.frames[at]!.hold) as any;
    };

    /** A tap anywhere in the terminal cuts to the verdict. */
    private skip = () => {
        if (this.state.phase !== "dive") { return; }
        if (this.timer !== null) { window.clearTimeout(this.timer); this.timer = null; }
        this.setState({shown: this.frames.length, phase: "done"});
    };

    /** Fold the shown frames into what's on screen right now. */
    private shownState() {
        const lines: Array<{text: string; tone: Tone; glitch: boolean; key: number}> = [];
        const marks: FloorMark[] = [];
        const labels: string[] = [];
        for (let i = 0; i < this.floors; i++) { marks.push("wait"); labels.push("▒▒▒▒▒▒"); }
        let hp = -1, gain = 0, floorAt = -1;
        let stamp: {label: string; tone: Tone} | null = null;
        for (let i = 0; i < this.state.shown; i++) {
            const f = this.frames[i]!;
            if (f.text) { lines.push({text: f.text, tone: f.tone || "sys", glitch: !!f.glitch, key: i}); }
            if (f.hp !== undefined) { hp = f.hp; }
            if (f.gain) { gain += f.gain; }
            if (f.floorAt !== undefined) { floorAt = f.floorAt; }
            if (f.mark) { marks[f.mark[0]] = f.mark[1]; }
            if (f.reveal) { labels[f.reveal[0]] = f.reveal[1]; }
            if (f.stamp) { stamp = f.stamp; }
        }
        return {lines: lines.slice(-40), marks, labels, hp, gain, floorAt, stamp};
    }

    // -------------------------------------------------------------- render --

    private summary(r: NetrunResult): string[] {
        const runner = this.runner();
        const lines: string[] = [];
        if (r.flatlined) {
            lines.push(`${runner.name} flatlines in the ${this.state.difficulty.toLowerCase()} arch — pulled out barely breathing.`);
        } else if (r.success) {
            lines.push(`${runner.name} cracks the architecture: ${r.floorsCleared}/${r.totalFloors} floors, ${r.eddiesGained}¥ siphoned.`);
        } else {
            lines.push(`${runner.name} jacks out at floor ${r.floorsCleared}/${r.totalFloors} with ${r.eddiesGained}¥.`);
        }
        if (r.iceDerezzed > 0) { lines.push(`${r.iceDerezzed} ICE derezzed on the way.`); }
        if (r.brainDamage > 0) { lines.push(`The feedback cost ${r.brainDamage} HP.`); }
        return lines;
    }

    private static MARK_GLYPH: {[k in FloorMark]: string} = {
        wait: "·", here: "▸", clear: "✓", ice: "▲", derez: "✕", lock: "▣",
    };

    /** The architecture as a ladder, objective on top, climbed from the bottom. */
    private ladder(marks: FloorMark[], labels: string[]) {
        const cells: React.ReactNode[] = [];
        for (let i = this.floors - 1; i >= 0; i--) {
            const m = marks[i]!;
            cells.push(
                <div key={i} className={"netFloor m-" + m}>
                    <i>{NetDiveView.MARK_GLYPH[m]}</i>
                    <b>{i === this.floors - 1 ? "OBJECTIVE" : `FLOOR ${i + 1}`}</b>
                    <em>{labels[i]}</em>
                </div>);
        }
        return <div className={"netLadder"}>{cells}</div>;
    }

    private terminal() {
        const runner = this.runner();
        const s = this.shownState();
        const hp = s.hp >= 0 ? s.hp : runner.health;
        const frac = this.hpMax > 0 ? hp / this.hpMax : 1;
        const live = this.state.phase === "dive";
        return (
            <div className={"netTerm"} onClick={this.skip}>
                <div className={"netTermHead"}>
                    <span>{runner.name.split(" ")[0]!.toUpperCase()} · IF {runner.interfaceRank()}</span>
                    <span className={"netHp" + (frac <= 0.25 ? " low" : frac <= 0.6 ? " mid" : "")}>
                        <i style={{width: `${Math.max(0, Math.min(1, frac)) * 100}%`}}/>
                        <b>{hp} HP</b>
                    </span>
                    <span className={"netGain"}>+{s.gain}¥</span>
                </div>
                <div className={"netTermBody"}>
                    {this.ladder(s.marks, s.labels)}
                    <div className={"netFeed"} ref={this.feedRef}>
                        {s.lines.map((l) => (
                            <p key={l.key} className={"netLn t-" + l.tone + (l.glitch ? " glitch" : "")}>
                                <i>&gt;</i> {l.text}
                            </p>))}
                        {live && <p className={"netLn t-sys"}><span className={"netCaret"}>▮</span></p>}
                    </div>
                </div>
                {s.stamp && <div className={"netStamp t-" + s.stamp.tone} key={s.stamp.label}>{s.stamp.label}</div>}
                {live && <div className={"netSkipHint"}>tap to fast-forward</div>}
            </div>);
    }

    public override render() {
        const runner = this.runner();
        const r = this.state.result;
        const phase = this.state.phase;
        const shownGain = r ? this.shownState().gain : 0;
        return (
            <NodeShell accent={"net"} icon={"⌁"} label={"NET Access"}
                       kicker={"Hardline jack-point"} title={"NET Access"}
                       sub={phase === "pick"
                           ? "A live cable into a nearby corp architecture, still warm from " +
                             "whoever cut it open. Data fortresses hold eddies — and ICE."
                           : undefined}
                       eddies={phase === "pick"
                           ? Purse.balance(this.props.party[0]!)
                           // the engine banked the haul the moment the run resolved;
                           // the title bar replays it as the siphon lines land
                           : this.balanceBefore + shownGain}
                       guide={phase === "pick"
                           ? <React.Fragment>
                               Pick how deep to dive, then jack in — <b>one dive</b>, then the trace burns
                               the line. {runner.name.split(" ")[0]} runs it (best Interface, rank {runner.interfaceRank()}).
                               Eddies siphoned go to the crew purse; black ICE burns <b>real HP</b>.
                           </React.Fragment>
                           : undefined}
                       foot={phase === "done" && r
                           ? <button className={"metaLeave"} onClick={() => this.props.onLeave(this.summary(r))}>
                               Jack out ▸
                           </button>
                           : phase === "dive"
                               ? <button className={"metaLeaveGhost"} onClick={this.skip}>»» Skip</button>
                               : <React.Fragment>
                                   <button className={"metaLeaveGhost"}
                                           onClick={() => this.props.onLeave(["— left the jack-point cold —"])}>Walk on ▸</button>
                                   <button className={"metaLeave netGo"} onClick={this.dive}>⌁ Jack in ▸</button>
                               </React.Fragment>}>
                {phase === "pick" && (
                    <div className={"evOpts"}>
                        {DIFFICULTIES.map(([d, blurb]) => (
                            <button key={d}
                                    className={"evOpt" + (this.state.difficulty === d ? " netSel" : "")}
                                    onClick={() => this.setState({difficulty: d})}>
                                <span className={"evOptLabel"}>{d}</span>
                                <span className={"evOptMeta"}><em>{blurb}</em></span>
                            </button>
                        ))}
                    </div>
                )}
                {phase !== "pick" && this.terminal()}
            </NodeShell>);
    }
}
