import * as React from "react";
import {Actor} from "../../actors/Actor";
import {soak} from "../../interact/damageModel";
import {shotPreview} from "../../interact/shotPreview";
import {Battlefield} from "../../interact/battlefield";
import {hudArmor, unitConditions} from "./hudInfo";

export interface UnitCardProps {
    unit: Actor;
    /** Everyone on the other side, so "marked" and the range read-out can be worked out. */
    party: Actor[];
    enemies: Actor[];
    onClose: () => void;
}

/**
 * The card behind a HUD row.
 *
 * Combat plays itself, so a row tap can't mean "target this" any more — it
 * means "what am I looking at". That turns out to be the missing piece: the
 * board is dense with abbreviations (BLD, STN, SP, the ✦ rank pip, AGGRO and
 * its four siblings) whose only explanation used to be a `title` tooltip,
 * which does not exist on a touch screen. This card is that legend, attached
 * to the unit it describes instead of a manual somewhere else.
 */
export class UnitCard extends React.Component<UnitCardProps, {}> {

    /** What an AI temperament actually makes a unit do, in words. */
    private static PLAN: { [k: string]: string } = {
        aggressive: "Pushes forward and keeps firing.",
        berserker: "Charges the closest target and swings.",
        flanker: "Works around the side for a clean angle.",
        camper: "Holds cover and shoots from there.",
        balanced: "Advances, takes cover, picks its shots.",
    };

    private static THREAT: { [k: number]: string } = {
        1: "Street trash", 2: "Trained", 3: "Veteran", 4: "Elite", 5: "Boss",
    };

    public override render() {
        const a = this.props.unit;
        const foe = this.props.enemies.indexOf(a) >= 0;
        const marked = (foe ? this.props.party : this.props.enemies).some((o) => o.marking === a);
        const conditions = unitConditions(a, marked);
        const anchor = this.props.party[0];
        const facing = anchor && anchor !== a;
        const dist = facing ? Math.round(Battlefield.distance(anchor!, a)) : null;
        // Every shot lands now, so the useful question is not "will it hit" but
        // "how much of it does this one's armour keep". This is the explanation
        // for why your merc chips at one target and cuts through another.
        const shot = facing ? shotPreview(foe ? anchor! : a, foe ? a : anchor!) : null;
        const w = a.weapon;
        const rank = foe ? Math.max(1, Math.min(5, a.rank || 1)) : 0;
        const sub = foe && a.faction
            ? `${a.faction}${a.archetype ? " " + a.archetype : ""}`
            : a.role.name;
        return (
            <div className={"ucWrap"} onClick={this.props.onClose}>
                <div className={"uc" + (foe ? " foe" : "")} onClick={(e) => e.stopPropagation()}>
                    <div className={"ucHead"}>
                        <b className={"ucName"}>{a.name}</b>
                        <span className={"ucSub"}>{sub} · L{a.level}</span>
                        <button className={"ucX"} onClick={this.props.onClose} aria-label={"Close"}>✕</button>
                    </div>

                    <dl className={"ucFacts"}>
                        <div><dt>Health</dt><dd>{Math.max(0, Math.ceil(a.health))} / {a.maxHealth}</dd></div>
                        <div><dt>Armour</dt><dd>{hudArmor(a)} SP
                            <i>soaks {Math.round(soak(hudArmor(a)) * 100)}% of every hit</i></dd></div>
                        {dist !== null && <div><dt>Range</dt><dd>{dist} m from you</dd></div>}
                        {shot && <div><dt>{foe ? "You deal" : "It deals"}</dt><dd>
                            {!shot.ok
                                ? <b className={"ucLo"}>Nothing — out of range</b>
                                : shot.unreachable
                                ? <b className={"ucLo"}>Nothing — out of reach</b>
                                : <React.Fragment>
                                    <b className={shot.expected >= shot.onHit * 0.8 ? "ucHi"
                                        : shot.expected >= shot.onHit * 0.5 ? "ucMid" : "ucLo"}>
                                        ~{shot.expected}</b>
                                    <i> a shot · {Math.round(shot.soaked * 100)}% soaked by armour
                                        {shot.covered ? " · behind cover" : ""}</i>
                                  </React.Fragment>}
                        </dd></div>}
                        {shot && shot.ok && !shot.unreachable &&
                            <div><dt>Shot lands</dt><dd className={"ucBands"}>
                                <span className={"ucLo"}>{Math.round(shot.odds.graze * 100)}% graze</span>
                                <span>{Math.round(shot.odds.hit * 100)}% clean</span>
                                <span className={"ucHi"}>{Math.round(shot.odds.crit * 100)}% crit</span>
                                <i>{shot.onCrit} on a crit</i>
                            </dd></div>}
                        <div><dt>Weapon</dt><dd>
                            {w.name} <i>{w.diceThrows}d6{w.damage ? "+" + w.damage : ""}
                            {w.ap ? " · ignores armour" : ""}{w.autofire ? " · full auto" : ""}</i>
                        </dd></div>
                        {rank > 0 &&
                            <div><dt>Threat</dt><dd>{UnitCard.THREAT[rank]} <i>rank {rank} of 5</i></dd></div>}
                        <div><dt>Fights like</dt><dd>
                            {UnitCard.PLAN[a.temperament] || UnitCard.PLAN["balanced"]}
                        </dd></div>
                    </dl>

                    {conditions.length > 0 && (
                        <div className={"ucCond"}>
                            <h4>Right now</h4>
                            <ul>
                                {conditions.map(([label, why], i) =>
                                    <li key={i}><b>{label}</b> — {why}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>);
    }
}
