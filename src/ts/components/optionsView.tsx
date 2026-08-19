import * as React from "react";
import {CombatSpeed, Options, OptionsStore, SPEEDS, SPEED_ORDER} from "../interact/options";

export interface OptionsViewProps {
    /** Back to the title. */
    onClose: () => void;
    /** Wipe everything — save, career, options. Confirmed here first. */
    onWipe: () => void;
}

interface OptionsViewState {
    options: Options;
    confirmingWipe: boolean;
}

/**
 * Options, in the same keyed grid as the rest of the front door.
 *
 * Every row changes something real: the speed dial feeds the battle scene's
 * playback multiplier and the CRT switch strips the scanline dressing. The
 * wipe is the one destructive row, and it answers the same way every other
 * destructive row in the game does — in place, with the keys spelled out.
 */
export class OptionsView extends React.Component<OptionsViewProps, OptionsViewState> {

    public override state: OptionsViewState = {options: OptionsStore.load(), confirmingWipe: false};

    public override componentDidMount() { window.addEventListener("keydown", this.onKey); }
    public override componentWillUnmount() { window.removeEventListener("keydown", this.onKey); }

    private onKey = (e: KeyboardEvent) => {
        const t = e.target as HTMLElement | null;
        if (t && ["INPUT", "SELECT", "TEXTAREA"].indexOf(t.tagName) >= 0) { return; }
        if (e.metaKey || e.ctrlKey || e.altKey) { return; }
        const k = e.key.toLowerCase();
        if (this.state.confirmingWipe) {
            if (k === "escape" || k === "enter") { this.setState({confirmingWipe: false}); }
            if (k === "y") { this.props.onWipe(); }
            return;
        }
        if (k === "s") { this.cycleSpeed(); }
        else if (k === "v") { this.toggleCrt(); }
        else if (k === "x") { this.setState({confirmingWipe: true}); }
        else if (k === "escape" || k === "enter") { this.props.onClose(); }
        else { return; }
        e.preventDefault();
    };

    private set(patch: Partial<Options>): void {
        const options = {...this.state.options, ...patch};
        OptionsStore.save(options);
        this.setState({options});
    }

    private cycleSpeed = () => {
        const at = SPEED_ORDER.indexOf(this.state.options.combatSpeed);
        this.set({combatSpeed: SPEED_ORDER[(at + 1) % SPEED_ORDER.length]!});
    };

    private setSpeed = (s: CombatSpeed) => this.set({combatSpeed: s});

    private toggleCrt = () => this.set({crt: !this.state.options.crt});

    private wipeConfirm() {
        return (
            <div className={"kgConfirm"}>
                <p className={"kgP"}>
                    Clear all data — the checkpointed run, the career and these settings. Everything
                    this machine knows about your merc, gone. This is the factory floor.
                </p>
                <div className={"kgRowPair"}>
                    <button onClick={() => this.setState({confirmingWipe: false})}>← Keep it (esc)</button>
                    <button className={"dgr"} onClick={this.props.onWipe}>Wipe everything (y) ▸</button>
                </div>
            </div>);
    }

    public override render() {
        const o = this.state.options;
        const speed = SPEEDS[o.combatSpeed];
        return (
            <div className={"kg"}>
                <div className={"kgTop"}>
                    <span className={"brand"}>RAINFALL</span>
                    <span>Options</span>
                    <span className={"r"}>Saved as you change them</span>
                </div>
                <div className={"kgBody"}>
                    <div className={"kgCol"}>
                        <h3 className={"kgH"}>Options</h3>
                        <button className={"kgRow"} onClick={this.cycleSpeed}>
                            <span className={"kgKey"}>S</span><b>Combat speed</b>
                            <span className={"kgDial"} style={{marginLeft: "auto"}}>
                                {SPEED_ORDER.map((s) => (
                                    <u key={s} className={o.combatSpeed === s ? "on" : ""}
                                       style={{width: "auto", padding: "0 6px"}}
                                       title={SPEEDS[s].blurb}
                                       onClick={(e) => { e.stopPropagation(); this.setSpeed(s); }}>
                                        {SPEEDS[s].label}
                                    </u>))}
                            </span>
                        </button>
                        <button className={"kgRow"} onClick={this.toggleCrt}>
                            <span className={"kgKey"}>V</span><b>CRT overlay</b>
                            <i>{o.crt ? "on — scanlines, grid, vignette" : "off — clean panel"}</i>
                        </button>
                        <div className={"kgHr"}/>
                        {this.state.confirmingWipe
                            ? this.wipeConfirm()
                            : <button className={"kgRow dgr"} onClick={() => this.setState({confirmingWipe: true})}>
                                <span className={"kgKey"}>X</span><b>Clear all data</b><i>run · career · settings</i>
                            </button>}
                    </div>
                    <div className={"kgCol"}>
                        <h3 className={"kgH"}>What these do</h3>
                        <dl className={"kgDfn"} style={{gridTemplateColumns: "1fr"}}>
                            <dt>Combat speed — {speed.label}</dt>
                            <dd className={"l"}>
                                {speed.blurb}. Playback runs at ×{speed.mult} — it changes how fast a
                                fight plays out, never how it resolves.
                            </dd>
                            <dt>CRT overlay</dt>
                            <dd className={"l"}>
                                The scanlines, grid texture and vignette over the whole console.
                                Atmosphere, not information — everything reads the same without it.
                            </dd>
                            <dt>Clear all data</dt>
                            <dd className={"l"}>
                                Deletes the checkpointed run, the career record and these settings from
                                this browser. The game opens like a first boot.
                            </dd>
                        </dl>
                    </div>
                </div>
                <div className={"kgBar"}>
                    <span className={"keysOnly"}><b>S</b> speed · <b>V</b> crt</span>
                    <span className={"keysOnly"}><b>X</b> clear data</span>
                    <span className={"r keysOnly"}><b>esc</b> back</span>
                    <button className={"kgBack r"} onClick={this.props.onClose}>← Back</button>
                </div>
            </div>);
    }
}
