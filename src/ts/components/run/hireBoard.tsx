import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Merc} from "../../actors/Merc";
import {default as roles} from "../../actors/resources/roles";
import {MercOffer} from "../../interact/mercMarket";

const ROLE_MAP: any = roles;

export interface HireBoardProps {
    offers: MercOffer[];
    party: Actor[];
    funds: number;
    cap: number;
    onHire: (id: string) => void;
}

/**
 * Who's for hire. Used both between sectors and at the fixer's table on the
 * map — same board, different stock. A candidate stays on the list once hired
 * so the roster reads as a record of what the crew paid for.
 */
export class HireBoard extends React.Component<HireBoardProps, {}> {

    private offer = (o: MercOffer) => {
        const role = ROLE_MAP[o.role] || ROLE_MAP["solo"];
        const hired = this.props.party.some((p) => (p as Merc).offerId === o.id);
        const full = this.props.party.length >= this.props.cap;
        const broke = this.props.funds < o.price;
        return (
            <li key={o.id} className={"hbOffer tier-" + o.tier.toLowerCase() + (hired ? " hired" : "")}>
                <img className={"hbFace"} src={`src/media/portraits/${o.role}.png`} alt={role.name}/>
                <span className={"hbWho"}>
                    <b>{o.name}</b>
                    <i style={{color: role.color}}>{role.name} · L{o.level}</i>
                </span>
                <span className={"hbTier"}>{o.tier}</span>
                <span className={"hbTrait"}>{o.trait}</span>
                <span className={"hbKit"}>SP {o.armorSP} · skill {o.skill}</span>
                {hired
                    ? <span className={"hbHired"}>ON THE CREW</span>
                    : <button className={"hbBuy"} disabled={full || broke}
                              title={full ? "Squad is full" : broke ? "Not enough eddies" : `Hire for ${o.price}¥`}
                              onClick={() => this.props.onHire(o.id)}>{o.price}¥</button>}
            </li>);
    };

    public override render() {
        const full = this.props.party.length >= this.props.cap;
        return (
            <div className={"hireBoard"}>
                <div className={"hbHead"}>
                    <span className={"hbCrew"}>Crew {this.props.party.length}/{this.props.cap}</span>
                    <span className={"hbFunds"}>{this.props.funds}¥</span>
                </div>
                {full && <p className={"hbNote"}>Squad is full — no room on the payroll.</p>}
                <ul className={"hbOffers"}>{this.props.offers.map(this.offer)}</ul>
                <p className={"hbHint"}>SP = armour · skill = weapon rating · tap the price to hire</p>
            </div>);
    }
}
