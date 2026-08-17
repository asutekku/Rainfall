import * as React from "react";
import {Actor} from "../../actors/Actor";
import {AugOffer} from "../../interact/chrome";
import {NodeShell} from "./metaOverlay";

export interface AugPickViewProps {
    character: Actor;
    offers: AugOffer[];
    onPick: (lineId: string | null) => void;
}

const TIER_LABEL: { [k: string]: string } = {
    street: "STREET", corporate: "CORPORATE", military: "MILITARY",
};

/**
 * The boss's chrome drop: pick one of two, free install — the eddies are
 * covered, the Humanity bill never is. Owned lines surface as their next mark
 * (the StS duplicate-relic rule), and skipping is always on the table for a
 * player guarding what's left of their soul.
 */
export class AugPickView extends React.Component<AugPickViewProps, {}> {

    private card = (offer: AugOffer, i: number) => {
        const mark = offer.line.marks[offer.mk - 1]!;
        const after = Math.max(0, this.props.character.humanity - offer.hl);
        return (
            <button key={i} className={"augCard tier-" + offer.line.tier}
                    onClick={() => this.props.onPick(offer.line.id)}>
                <span className={"augTier"}>{TIER_LABEL[offer.line.tier]}{offer.isUpgrade ? " · UPGRADE" : ""}</span>
                <span className={"augName"}>{mark.name}</span>
                <span className={"augMk"}>{"◆".repeat(offer.mk)}{"◇".repeat(3 - offer.mk)} <i>Mk.{offer.mk}</i> · {offer.line.slot}</span>
                <span className={"augDesc"}>{mark.description}</span>
                <span className={"augBill"}>
                    install free · <b>−{offer.hl} Humanity</b> <i>({this.props.character.humanity} → {after})</i>
                </span>
            </button>);
    };

    public override render() {
        const c = this.props.character;
        return (
            <NodeShell accent={"aug"} icon={"⬡"} label={"Chrome Claim"}
                       kicker={"Boss scalp — the good crate"} title={"Pick Your Chrome"}
                       sub={"The boss doesn't need this crate any more. Cyberware from it is " +
                            "yours to keep — chrome survives death, unlike everything else you carry."}
                       hum={[c.humanity, c.maxHumanity]}
                       guide={<React.Fragment>
                           Take <b>one</b> of the two — the install is free, but the <b>Humanity</b> cost
                           is paid now and never comes back. Skipping costs nothing.
                       </React.Fragment>}
                       foot={<button className={"metaLeaveGhost"} onClick={() => this.props.onPick(null)}>
                           Keep your soul — skip ▸
                       </button>}>
                <div className={"augCards"}>
                    {this.props.offers.map(this.card)}
                </div>
            </NodeShell>);
    }
}
