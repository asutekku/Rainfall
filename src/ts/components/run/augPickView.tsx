import * as React from "react";
import {Actor} from "../../actors/Actor";
import {AugOffer} from "../../interact/chrome";
import {Beat, Beats} from "../general/beats";
import {NodeShell} from "./metaOverlay";

export interface AugPickViewProps {
    character: Actor;
    offers: AugOffer[];
    onPick: (lineId: string | null) => void;
}

const TIER_LABEL: { [k: string]: string } = {
    street: "STREET", corporate: "CORPORATE", military: "MILITARY",
};

interface AugPickViewState {
    /** The offer on the chair — the ceremony is playing or played. */
    chosen: AugOffer | null;
    /** How many surgery beats have landed (drives the live Humanity drain). */
    step: number;
    played: boolean;
}

/**
 * The boss's chrome drop: pick one of two, free install — the eddies are
 * covered, the Humanity bill never is. Picking one used to be a radio button
 * for a life-changing event; now the chair gets its scene: four beats of
 * surgery with the Humanity readout draining live, because the game's most
 * permanent decision deserves at least as much ceremony as a netrun.
 */
export class AugPickView extends React.Component<AugPickViewProps, AugPickViewState> {

    public override state: AugPickViewState = {chosen: null, step: 0, played: false};

    private card = (offer: AugOffer, i: number) => {
        const mark = offer.line.marks[offer.mk - 1]!;
        const after = Math.max(0, this.props.character.humanity - offer.hl);
        return (
            <button key={i} className={"augCard tier-" + offer.line.tier}
                    onClick={() => this.setState({chosen: offer, step: 0, played: false})}>
                <span className={"augTier"}>{TIER_LABEL[offer.line.tier]}{offer.isUpgrade ? " · UPGRADE" : ""}</span>
                <span className={"augName"}>{mark.name}</span>
                <span className={"augMk"}>{"◆".repeat(offer.mk)}{"◇".repeat(3 - offer.mk)} <i>Mk.{offer.mk}</i> · {offer.line.slot}</span>
                <span className={"augDesc"}>{mark.description}</span>
                <span className={"augBill"}>
                    install free · <b>−{offer.hl} Humanity</b> <i>({this.props.character.humanity} → {after})</i>
                </span>
            </button>);
    };

    /** The chair scene for the chosen piece. */
    private surgery(offer: AugOffer): Beat[] {
        const c = this.props.character;
        const mark = offer.line.marks[offer.mk - 1]!;
        const after = Math.max(0, c.humanity - offer.hl);
        const out: Beat[] = [
            {text: "The chair reclines. The doc doesn't ask twice.", tone: "dim"},
            {text: `Local anaesthetic, a marker line, and the ${mark.name} out of its sterile wrap.`, tone: "sys"},
            {text: offer.isUpgrade
                ? "The old mark comes out still warm. The new one seats deeper."
                : "Bone anchor. Neural shunt. The body files a complaint and is overruled.", tone: "warn", glitch: true},
            {text: `Systems handshake … ${mark.name.toUpperCase()} ONLINE.`, tone: "ok", hold: 1.4},
            {text: `Somewhere in the noise, something quiet gets smaller. −${offer.hl} Humanity.`, tone: "bad"},
        ];
        if (after < 20 && !c.cyberpsychosis) {
            out.push({text: "The mirror takes a second longer to feel like a mirror. The edge is close.", tone: "bad", glitch: true});
        }
        return out;
    }

    /** Humanity as the beats drain it: full until the bill beat lands. */
    private shownHumanity(offer: AugOffer): number {
        const c = this.props.character;
        return this.state.step >= 5 ? Math.max(0, c.humanity - offer.hl) : c.humanity;
    }

    public override render() {
        const c = this.props.character;
        const chosen = this.state.chosen;
        return (
            <NodeShell accent={"aug"} icon={"⬡"} label={"Chrome Claim"}
                       kicker={"Boss scalp — the good crate"} title={chosen ? "The Chair" : "Pick Your Chrome"}
                       sub={chosen ? undefined
                           : "The boss doesn't need this crate any more. Cyberware from it is " +
                             "yours to keep — chrome survives death, unlike everything else you carry."}
                       hum={[chosen ? this.shownHumanity(chosen) : c.humanity, c.maxHumanity]}
                       guide={chosen ? undefined
                           : <React.Fragment>
                               Take <b>one</b> of the two — the install is free, but the <b>Humanity</b> cost
                               is paid now and never comes back. Skipping costs nothing.
                           </React.Fragment>}
                       foot={chosen
                           ? (this.state.played
                               ? <button className={"metaLeave"}
                                         onClick={() => this.props.onPick(chosen.line.id)}>
                                   Back on your feet ▸
                               </button>
                               : null)
                           : <button className={"metaLeaveGhost"} onClick={() => this.props.onPick(null)}>
                               Keep your soul — skip ▸
                           </button>}>
                {!chosen && (
                    <div className={"augCards"}>
                        {this.props.offers.map(this.card)}
                    </div>)}
                {chosen && (
                    <div className={"evResult"}>
                        <Beats beats={this.surgery(chosen)}
                               onStep={(step) => this.setState({step})}
                               onDone={() => this.setState({played: true})}/>
                    </div>)}
            </NodeShell>);
    }
}
