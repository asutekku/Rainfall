import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Merc} from "../../actors/Merc";
import {CLASSES} from "../../actors/resources/classes";
import {MercOffer} from "../../interact/mercMarket";
import {EventCheck, makeCtx, odds, rollCheck} from "../../interact/events";
import {handshake} from "../../interact/handshake";
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
interface HireBoardState { open: string | null; }

export class HireBoard extends React.Component<HireBoardProps, HireBoardState> {

    public override state: HireBoardState = {open: null};

    private static NEGOTIATE: EventCheck = {stat: "cool", dv: 13, label: "negotiate"};

    /**
     * One shot at the fee, per candidate. Win and it drops 20%; lose and it
     * climbs 10% — they heard the lowball, and mercs talk to each other.
     */
    private negotiate(o: MercOffer) {
        if (o.negotiated) { return; }
        const who = makeCtx(this.props.party).best("cool");
        const r = rollCheck(who, HireBoard.NEGOTIATE);
        o.negotiated = r.success ? "won" : "lost";
        o.price = Math.max(50, Math.round(o.price * (r.success ? 0.8 : 1.1) / 10) * 10);
        this.forceUpdate();
    }

    /** Sit down with them: the handshake lines, and the fee on the table. */
    private meeting(o: MercOffer) {
        const who = makeCtx(this.props.party).best("cool");
        return (
            <div className={"hbMeet"}>
                {handshake(o).map((l, i) => (
                    <p key={i} className={"hbSay"} style={{animationDelay: `${i * 0.14}s`}}>{l}</p>))}
                {o.negotiated === "won" && <p className={"hbDealt won"}>— fee talked down 20% —</p>}
                {o.negotiated === "lost" && <p className={"hbDealt"}>— they heard the lowball: fee up 10% —</p>}
                {!o.negotiated &&
                    <button className={"hbTalk"} onClick={(e) => { e.stopPropagation(); this.negotiate(o); }}>
                        Talk the fee down
                        <em>COOL check · {who.name.split(" ")[0]} · ~{odds(who, HireBoard.NEGOTIATE)}% · win −20% / lose +10%</em>
                    </button>}
            </div>);
    }

    private offer = (o: MercOffer) => {
        const role = ROLE_MAP[o.role] || ROLE_MAP["gunner"];
        const fac = crewFaction(o.faction);
        const hired = this.props.party.some((p) => (p as Merc).offerId === o.id);
        const full = this.props.party.length >= this.props.cap;
        const broke = this.props.funds < o.price;
        const open = this.state.open === o.id;
        return (
            <li key={o.id}
                className={"hbOffer tier-" + o.tier.toLowerCase() + (hired ? " hired" : "") + (open ? " open" : "")}
                style={{borderLeft: "3px solid " + accentCss(o.faction), cursor: hired ? undefined : "pointer"}}
                onClick={() => !hired && this.setState({open: open ? null : o.id})}>
                <img className={"hbFace"} src={`src/media/portraits/${role.portrait}.png`} alt={role.name}/>
                <span className={"hbWho"}>
                    <b>{o.name}</b>
                    <i style={{color: role.color}}>{role.name} · L{o.level}</i>
                    <em style={{color: accentCss(o.faction)}}>{o.faction}</em>
                </span>
                <ProfileChip profile={profileFrom(o.armorSP, o.cyberSP, o.faction)} withLabel={true}/>
                <span className={"hbTier"}>{o.tier}{o.debt ? <b className={"hbDebt"}>DEBT RATE</b> : null}</span>
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
                              onClick={(e) => { e.stopPropagation(); this.props.onHire(o.id); }}>{o.price}¥</button>}
                {open && !hired && this.meeting(o)}
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
                    Tap a name to sit down with them — and maybe talk the fee around. Tap the price to hire.
                    Four walk onto a street; the rest wait with the van.
                </p>
            </div>);
    }
}
