import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Merc} from "../../actors/Merc";
import {CLASSES} from "../../actors/resources/classes";
import {MercOffer} from "../../interact/mercMarket";
import {ProfileChip} from "../general/profileBadge";
import {profileFrom} from "../../interact/profile";
import {TRAITS} from "../../actors/resources/traits";
import {accentCss, crewFaction} from "../../actors/resources/factionStyles";

const ROLE_MAP: any = CLASSES;

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
 *
 * `cap` is the payroll ceiling, not the number of seats on a street: the crew
 * can carry more bodies than it can deploy, and which four walk in is decided
 * at staging. Signing a sixth is buying a substitute, not a fifth gun.
 */
export class HireBoard extends React.Component<HireBoardProps, {}> {

    private offer = (o: MercOffer) => {
        const role = ROLE_MAP[o.role] || ROLE_MAP["gunner"];
        const fac = crewFaction(o.faction);
        const hired = this.props.party.some((p) => (p as Merc).offerId === o.id);
        const full = this.props.party.length >= this.props.cap;
        const broke = this.props.funds < o.price;
        return (
            <li key={o.id} className={"hbOffer tier-" + o.tier.toLowerCase() + (hired ? " hired" : "")}
                style={{borderLeft: "3px solid " + accentCss(o.faction)}}>
                <img className={"hbFace"} src={`src/media/portraits/${role.portrait}.png`} alt={role.name}/>
                <span className={"hbWho"}>
                    <b>{o.name}</b>
                    <i style={{color: role.color}}>{role.name} · L{o.level}</i>
                    <em style={{color: accentCss(o.faction)}}>{o.faction}</em>
                </span>
                <ProfileChip profile={profileFrom(o.armorSP, o.cyberSP, o.faction)} withLabel={true}/>
                <span className={"hbTier"}>{o.tier}</span>
                <span className={"hbTrait"}>
                    {fac && <b className={"hbPerk"} title={fac.reads}>{fac.perk}</b>}
                    {/* Names on the board, detail on hover: three full sentences in a
                        narrow column wraps to one word a line, and a name is the thing
                        the player actually learns to recognise. */}
                    <span className={"hbTraits"}>
                        {o.traits.map((t) => TRAITS[t] && (
                            <i key={t} className={TRAITS[t]!.price < 1 ? "flaw" : "boon"}
                               title={TRAITS[t]!.blurb}>
                                {TRAITS[t]!.name}
                                {t === "badBlood" && o.grudge ? `: ${o.grudge}` : ""}
                            </i>))}
                    </span>
                </span>
                <span className={"hbKit"}>
                    {o.cyberSP > 0 ? `chrome SP ${o.cyberSP}` : `SP ${o.armorSP}`} · skill {o.skill}
                </span>
                {hired
                    ? <span className={"hbHired"}>ON THE CREW</span>
                    : <button className={"hbBuy"} disabled={full || broke}
                              title={full ? "Payroll is full" : broke ? "Not enough eddies" : `Hire for ${o.price}¥`}
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
                {full && <p className={"hbNote"}>Payroll is full — pay somebody off before signing anyone new.</p>}
                <ul className={"hbOffers"}>{this.props.offers.map(this.offer)}</ul>
                <p className={"hbHint"}>
                    SP = armour · skill = weapon rating · tap the price to hire.
                    Four walk onto a street; the rest wait with the van.
                </p>
            </div>);
    }
}
