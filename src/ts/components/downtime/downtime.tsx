import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Medicine} from "../../interact/Medicine";
import {Lifestyle} from "../../interact/Lifestyle";
import {Economy} from "../../interact/economy";
import {TraumaTeam} from "../../interact/TraumaTeam";
import {Purse} from "../../interact/crew";

interface DowntimeProps {
    actor: Actor;
    /** The whole crew, when a run is in progress — a safehouse patches everyone. */
    party?: Actor[];
}

interface DowntimeState {
    message: string;
}

const HOUSING_TIERS = ["Streets", "CubeHotel", "CheapConapt", "NiceConapt", "Corporate"];

export class Downtime extends React.Component<DowntimeProps, DowntimeState> {

    /** Flat safehouse charge, per body patched. */
    private static readonly REST_FEE = 80;

    constructor(props: any) {
        super(props);
        this.state = {message: ""};
    }

    /**
     * A safehouse stop patches the crew up and repairs their armour for a flat
     * fee. It used to run Lifestyle.payUpkeep, which billed rent + subscriptions
     * against the crew purse on every click with no cooldown — three taps of a
     * button labelled "Rest" emptied the run's whole stake and evicted the
     * character, permanently voiding their Trauma Team cover.
     */
    private rest = () => {
        const crew = this.props.party && this.props.party.length ? this.props.party : [this.props.actor];
        const fee = Purse.garnish(this.props.actor, Downtime.REST_FEE * crew.length);
        let healed = 0;
        crew.forEach((p) => { healed += Medicine.rest(p); Economy.repairArmor(p); });
        this.setState({
            message: `Patched up the crew — ${healed} HP across ${crew.length} and armour repaired (${fee}¥).`,
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

    public override render() {
        const a = this.props.actor;
        return (
            <div className={"redPanel"}>
                <div className={"redSection"}>
                    <div className={"redSectionTitle"}>Downtime — {a.health}/{a.maxHealth} HP · {Purse.balance(a)}¥</div>
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
