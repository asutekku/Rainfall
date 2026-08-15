import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Medicine} from "../../interact/Medicine";
import {Lifestyle} from "../../interact/Lifestyle";
import {TraumaTeam} from "../../interact/TraumaTeam";

interface DowntimeProps {
    actor: Actor;
}

interface DowntimeState {
    message: string;
}

const HOUSING_TIERS = ["Streets", "CubeHotel", "CheapConapt", "NiceConapt", "Corporate"];

export class Downtime extends React.Component<DowntimeProps, DowntimeState> {

    constructor(props: any) {
        super(props);
        this.state = {message: ""};
    }

    private rest = () => {
        const a = this.props.actor;
        const healed = Medicine.rest(a);
        const paid = Lifestyle.payUpkeep(a);
        this.setState({
            message: `Rested — recovered ${healed} HP (now ${a.health}/${a.maxHealth}). ` +
                (paid ? `Cost of living paid.` : `Couldn't make rent — evicted to the Streets!`),
        });
    };

    private callTrauma = () => {
        const res = TraumaTeam.call(this.props.actor);
        this.setState({
            message: res.responded
                ? `Trauma Team responded — stabilised and patched to ${res.healedTo} HP (billed ${res.fee}¥).`
                : `No Trauma Team response.`,
        });
    };

    private setHousing = (tier: string) => {
        this.props.actor.housing = tier;
        this.setState({message: `Moved to ${Lifestyle.tier(tier).name}.`});
    };

    public render() {
        const a = this.props.actor;
        return (
            <div className={"redPanel"}>
                <div className={"redSection"}>
                    <div className={"redSectionTitle"}>Downtime — {a.health}/{a.maxHealth} HP · {a.currency}¥</div>
                    <div className={"redControls"}>
                        <button className={"redBtnPrimary"} onClick={this.rest}>Rest &amp; Recover</button>
                        {a.mortallyWounded &&
                            <button className={"redBtnPrimary"} onClick={this.callTrauma}>Call Trauma Team</button>}
                    </div>
                </div>
                <div className={"redSection"}>
                    <div className={"redSectionTitle"}>Housing — {Lifestyle.tier(a.housing).name} ({Lifestyle.upkeepCost(a)}¥/period)</div>
                    <div className={"redControls"}>
                        {HOUSING_TIERS.map((h) => (
                            <button key={h}
                                    className={"redBtn " + (a.housing === h ? "redBtnActive" : "")}
                                    onClick={() => this.setHousing(h)}>
                                {Lifestyle.tier(h).name} ({Lifestyle.tier(h).upkeep}¥)
                            </button>
                        ))}
                    </div>
                </div>
                {this.state.message && <div className={"redNotice"}>{this.state.message}</div>}
            </div>);
    }
}
