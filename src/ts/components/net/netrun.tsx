import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Netrun as NetEngine, NetrunResult} from "../../interact/Netrun";

interface NetrunProps {
    actor: Actor;
}

interface NetrunState {
    difficulty: string;
    result: NetrunResult | null;
}

const DIFFICULTIES = ["Basic", "Standard", "Uncommon", "Advanced"];

export class Netrun extends React.Component<NetrunProps, NetrunState> {

    constructor(props: any) {
        super(props);
        this.state = {difficulty: "Standard", result: null};
    }

    private jackIn = () => {
        const arch = NetEngine.generate(this.state.difficulty);
        const result = NetEngine.run(this.props.actor, arch);
        this.setState({result});
    };

    public override render() {
        const a = this.props.actor;
        const r = this.state.result;
        return (
            <div className={"redPanel"}>
                <div className={"redSection"}>
                    <div className={"redSectionTitle"}>NET Intrusion — Interface {a.interfaceRank()}</div>
                    <div className={"redControls"}>
                        {DIFFICULTIES.map((d) => (
                            <button key={d}
                                    className={"redBtn " + (this.state.difficulty === d ? "redBtnActive" : "")}
                                    onClick={() => this.setState({difficulty: d})}>{d}</button>
                        ))}
                    </div>
                    <button className={"redBtnPrimary"} onClick={this.jackIn}>Jack In</button>
                </div>
                {r &&
                <div className={"redSection"}>
                    <div className={"redSectionTitle " + (r.success ? "vital-good" : (r.flatlined ? "vital-critical" : "vital-warn"))}>
                        {r.success ? "RUN SUCCESSFUL" : (r.flatlined ? "FLATLINED" : "RUN ENDED")}
                        {" — "}{r.floorsCleared}/{r.totalFloors} floors
                    </div>
                    <div className={"redRow"}><span className={"redRowMeta"}>Eddies</span><span className={"redRowDesc"}>+{r.eddiesGained}¥</span></div>
                    <div className={"redRow"}><span className={"redRowMeta"}>ICE derezzed</span><span className={"redRowDesc"}>{r.iceDerezzed}</span></div>
                    <div className={"redRow"}><span className={"redRowMeta"}>Brain damage</span><span className={"redRowDesc"}>{r.brainDamage} (HP {a.health}/{a.maxHealth})</span></div>
                    <div className={"netLog"}>
                        {r.log.map((l, i) => <div key={i} className={"netLogLine"}>&gt; {l}</div>)}
                    </div>
                </div>}
            </div>);
    }
}
