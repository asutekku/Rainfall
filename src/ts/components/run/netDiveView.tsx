import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Purse} from "../../interact/crew";
import {Netrun as NetEngine, NetrunResult} from "../../interact/Netrun";
import {NodeShell} from "./metaOverlay";

export interface NetDiveViewProps {
    party: Actor[];
    onLeave: (lines: string[]) => void;
}

interface NetDiveViewState {
    difficulty: string;
    result: NetrunResult | null;
}

const DIFFICULTIES: Array<[string, string]> = [
    ["Basic", "shallow local net · small payouts, thin ICE"],
    ["Standard", "corp subnet · real eddies, real ICE"],
    ["Uncommon", "hardened arch · deep floors, black ICE"],
    ["Advanced", "military-grade · big score or a fried brain"],
];

/**
 * A NET Access node: a physical jack-point into a nearby architecture. ONE
 * dive per node — pick how deep to go, send the crew's best deck-jockey in,
 * and live with the result (payouts land in the crew purse; black ICE burns
 * real HP). The between-fights eddies faucet this used to be is closed: the
 * NET is a place on the map now, not a button.
 */
export class NetDiveView extends React.Component<NetDiveViewProps, NetDiveViewState> {

    constructor(props: NetDiveViewProps) {
        super(props);
        this.state = {difficulty: "Standard", result: null};
    }

    /** The crew's best deck-jockey: highest Interface among those standing. */
    private runner(): Actor {
        return this.props.party.reduce((b, p) =>
            p.canFight() && p.interfaceRank() > b.interfaceRank() ? p : b, this.props.party[0]!);
    }

    private dive = () => {
        if (this.state.result) { return; }
        const runner = this.runner();
        const arch = NetEngine.generate(this.state.difficulty);
        const result = NetEngine.run(runner, arch);
        this.setState({result});
    };

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

    public override render() {
        const runner = this.runner();
        const r = this.state.result;
        return (
            <NodeShell accent={"net"} icon={"⌁"} label={"NET Access"}
                       kicker={"Hardline jack-point"} title={"NET Access"}
                       sub={"A live cable into a nearby corp architecture, still warm from " +
                            "whoever cut it open. Data fortresses hold eddies — and ICE."}
                       eddies={Purse.balance(this.props.party[0]!)}
                       guide={!r
                           ? <React.Fragment>
                               Pick how deep to dive, then jack in — <b>one dive</b>, then the trace burns
                               the line. {runner.name.split(" ")[0]} runs it (best Interface, rank {runner.interfaceRank()}).
                               Eddies siphoned go to the crew purse; black ICE burns <b>real HP</b>.
                           </React.Fragment>
                           : undefined}
                       foot={r
                           ? <button className={"metaLeave"} onClick={() => this.props.onLeave(this.summary(r))}>
                               Jack out ▸
                           </button>
                           : <React.Fragment>
                               <button className={"metaLeaveGhost"}
                                       onClick={() => this.props.onLeave(["— left the jack-point cold —"])}>Walk on ▸</button>
                               <button className={"metaLeave netGo"} onClick={this.dive}>⌁ Jack in ▸</button>
                           </React.Fragment>}>
                {!r && (
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
                {r && (
                    <div className={"evResult"}>
                        <p className={r.flatlined ? "netBad" : r.success ? "netGood" : ""}>
                            {r.flatlined ? "FLATLINED" : r.success ? "RUN SUCCESSFUL" : "RUN ENDED"}
                            {" — "}{r.floorsCleared}/{r.totalFloors} floors · {r.eddiesGained}¥
                        </p>
                        {r.log.slice(-6).map((l, i) => <p key={i} className={"netLog"}>{l}</p>)}
                    </div>
                )}
            </NodeShell>);
    }
}
