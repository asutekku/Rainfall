import * as React from "react";
import {CombatSpeed, Options, OptionsStore, SPEEDS, SPEED_ORDER} from "../interact/options";
import {KgBack, KgBar, KgRow} from "./general/kgKit";

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
 * Options, in the same keyed grid as the rest of the front door. One column,
 * no manual: every row names its state and changes something real.
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
        else if (k === "m") { this.toggleFx(); }
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
    private toggleFx = () => this.set({fx: !this.state.options.fx});

    private wipeConfirm() {
        return (
            <div className={"kgConfirm"}>
                <p className={"kgP"}>
                    Clear all data — the checkpointed run, the career and these settings. Everything
                    this machine knows about your merc, gone.
                </p>
                <div className={"kgRowPair"}>
                    <button onClick={() => this.setState({confirmingWipe: false})}>← Keep it (esc)</button>
                    <button className={"dgr"} onClick={this.props.onWipe}>Wipe everything (y) ▸</button>
                </div>
            </div>);
    }

    public override render() {
        const o = this.state.options;
        return (
            <div className={"kg"}>
                <div className={"kgTop"}>
                    <span className={"brand"}>RAINFALL</span>
                    <span>Options</span>
                    <span className={"r"}>Saved as you change them</span>
                </div>
                <div className={"kgBody"}>
                    <div className={"kgCol"} style={{maxWidth: 560}}>
                        <h3 className={"kgH"}>Options</h3>
                        <KgRow hotkey={"S"} label={"Combat speed"} onClick={this.cycleSpeed}
                               right={
                                   <span className={"kgDial"} style={{marginLeft: "auto"}}>
                                       {SPEED_ORDER.map((s) => (
                                           <u key={s} className={o.combatSpeed === s ? "on" : ""}
                                              style={{width: "auto", padding: "0 8px"}}
                                              title={SPEEDS[s].blurb}
                                              onClick={(e) => { e.stopPropagation(); this.setSpeed(s); }}>
                                               {SPEEDS[s].label}
                                           </u>))}
                                   </span>}/>
                        <KgRow hotkey={"V"} label={"CRT overlay"} on={o.crt}
                               value={o.crt ? "on" : "off"} onClick={this.toggleCrt}/>
                        <KgRow hotkey={"M"} label={"Menu animations"} on={o.fx}
                               value={o.fx ? "on" : "off"} onClick={this.toggleFx}/>
                        <div className={"kgHr"}/>
                        {this.state.confirmingWipe
                            ? this.wipeConfirm()
                            : <KgRow hotkey={"X"} label={"Clear all data"} danger
                                     value={"run · career · settings"}
                                     onClick={() => this.setState({confirmingWipe: true})}/>}
                    </div>
                </div>
                <KgBar>
                    <span className={"keysOnly"}><b>S</b> speed · <b>V</b> crt · <b>M</b> fx</span>
                    <span className={"keysOnly"}><b>X</b> clear data</span>
                    <span className={"r keysOnly"}><b>esc</b> back</span>
                    <KgBack onClick={this.props.onClose}/>
                </KgBar>
            </div>);
    }
}
