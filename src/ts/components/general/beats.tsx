import * as React from "react";
import {OptionsStore} from "../../interact/options";

/**
 * A story told one line at a time.
 *
 * The netrun montage proved the register: the engine resolves everything up
 * front, and the screen performs the result beat by beat instead of dumping a
 * paragraph. This is that playback, extracted — encounters, the safehouse
 * night and the ripperdoc's chair all speak through it. Tap anywhere to cut
 * to the end; reduced motion (and anyone re-reading) gets it all at once.
 */

export type BeatTone = "sys" | "dim" | "ok" | "warn" | "bad" | "gold";

export interface Beat {
    text: string;
    tone?: BeatTone;
    /** RGB-split shake on landing — for the lines that hurt. */
    glitch?: boolean;
    /** Time units before the next beat (default 1). */
    hold?: number;
}

export interface BeatsProps {
    beats: Beat[];
    /** Called once, when the last beat has landed (or the player skipped). */
    onDone?: (() => void) | undefined;
    /** Called as each beat lands, with how many are on screen — for live tickers. */
    onStep?: ((shown: number) => void) | undefined;
}

interface BeatsState { shown: number; }

export class Beats extends React.Component<BeatsProps, BeatsState> {

    private timer: number | null = null;
    private reduced = typeof window !== "undefined" && window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    public override state: BeatsState = {shown: 0};

    public override componentDidMount() {
        if (this.reduced) { this.finish(); return; }
        this.step();
    }

    public override componentWillUnmount() {
        if (this.timer !== null) { window.clearTimeout(this.timer); }
    }

    private unit(): number {
        // the same dial the fights and the netrun run on
        return 480 / OptionsStore.speedMult();
    }

    private step = () => {
        const at = this.state.shown;
        if (at >= this.props.beats.length) {
            if (this.props.onDone) { this.props.onDone(); }
            return;
        }
        this.setState({shown: at + 1});
        if (this.props.onStep) { this.props.onStep(at + 1); }
        this.timer = window.setTimeout(this.step, this.unit() * (this.props.beats[at]!.hold || 1)) as any;
    };

    private finish = () => {
        if (this.state.shown >= this.props.beats.length) { return; }
        if (this.timer !== null) { window.clearTimeout(this.timer); this.timer = null; }
        this.setState({shown: this.props.beats.length});
        if (this.props.onStep) { this.props.onStep(this.props.beats.length); }
        if (this.props.onDone) { this.props.onDone(); }
    };

    public override render() {
        const live = this.state.shown < this.props.beats.length;
        return (
            <div className={"beats"} onClick={this.finish}
                 title={live ? "tap to fast-forward" : undefined}>
                {this.props.beats.slice(0, this.state.shown).map((b, i) => (
                    <p key={i} className={"beat t-" + (b.tone || "sys") + (b.glitch ? " glitch" : "")}>
                        {b.text}
                    </p>))}
                {live && <p className={"beat t-dim beatCaret"}>▮</p>}
            </div>);
    }
}

/** Sugar: plain strings become sys beats. */
export const beat = (text: string, tone?: BeatTone, glitch?: boolean): Beat =>
    ({text, ...(tone ? {tone} : {}), ...(glitch ? {glitch: true} : {})});
