import * as React from "react";
import {Actor} from "../../actors/Actor";
import {ProfileBadge} from "../general/profileBadge";
import {PROFILE, profileOf} from "../../interact/profile";
import {TRAITS} from "../../actors/resources/traits";
import {soak} from "../../interact/damageModel";
import {shotPreview} from "../../interact/shotPreview";
import {Battlefield} from "../../interact/battlefield";
import {ShownState} from "../../interact/shownState";
import {KIT} from "../../interact/loadout";
import {hudArmor, onBelt, unitConditions} from "./hudInfo";

export interface UnitCardProps {
    unit: Actor;
    /** Everyone on the other side, so the range read-out knows which way it points. */
    party: Actor[];
    enemies: Actor[];
    /** Health as the board is drawing it, so the card agrees with the row behind it. */
    shown: ShownState;
    onClose: () => void;
}

interface UnitCardState { detail: boolean; }

/**
 * The card behind a HUD row.
 *
 * Combat plays itself, so a row tap can't mean "target this" — it means "what
 * am I looking at". The first cut answered that with eight rows of statistics
 * and put what was actually *happening* to the unit last, under all of it. So
 * a fight's worth of live information sat below a weapon's dice notation and a
 * sentence about how its AI likes to move.
 *
 * It leads with the two things that change while you watch — health, and what
 * is on the unit right now — and folds the rest away. The reference material
 * is still the legend for the board's shorthand (SP, the ✦ rank pip, the
 * temperament chips, none of which explain themselves on a touch screen), so
 * it stays one tap away rather than being cut.
 */
export class UnitCard extends React.Component<UnitCardProps, UnitCardState> {

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

    constructor(props: UnitCardProps) {
        super(props);
        this.state = {detail: false};
    }

    public override render() {
        const a = this.props.unit;
        const foe = this.props.enemies.indexOf(a) >= 0;
        const conditions = unitConditions(a);
        const anchor = this.props.party[0];
        const facing = anchor && anchor !== a;
        const dist = facing ? Math.round(Battlefield.distance(anchor!, a)) : null;
        // Every shot lands now, so the useful question is not "will it hit" but
        // "how much of it does this one's armour keep". This is the explanation
        // for why your merc chips at one target and cuts through another.
        const shot = facing ? shotPreview(foe ? anchor! : a, foe ? a : anchor!) : null;
        const w = a.weapon;
        const hp = Math.max(0, Math.ceil(this.props.shown.of(a)));
        const pct = Math.max(0, Math.min(100, (hp / Math.max(1, a.maxHealth)) * 100));
        const hpCls = pct > 60 ? "h-good" : pct > 30 ? "h-warn" : "h-crit";
        const rank = foe ? Math.max(1, Math.min(5, a.rank || 1)) : 0;
        const belt = onBelt(a);
        const sub = foe && a.faction
            ? `${a.faction}${a.archetype ? " " + a.archetype : ""}`
            : a.role.name;
        return (
            <div className={"ucWrap"} onClick={this.props.onClose}>
                <div className={"uc" + (foe ? " foe" : "")} onClick={(e) => e.stopPropagation()}>
                    <div className={"ucHead"}>
                        <ProfileBadge unit={a}/>
                        <b className={"ucName"}>{a.name}</b>
                        <span className={"ucSub"}>{sub} · L{a.level}</span>
                        <button className={"ucX"} onClick={this.props.onClose} aria-label={"Close"}>✕</button>
                    </div>

                    {a.traits.length > 0 && (
                        <ul className={"ucTraits"}>
                            {a.traits.map((t) => TRAITS[t] && (
                                <li key={t} className={TRAITS[t]!.price < 1 ? "flaw" : "boon"}>
                                    <b>{TRAITS[t]!.name}</b> — {TRAITS[t]!.blurb}
                                    {t === "badBlood" && a.grudge ? ` (${a.grudge})` : ""}
                                </li>))}
                        </ul>)}

                    {/* the whole point of the badge, in words: what beats this one */}
                    <p className={"ucProf pr-" + profileOf(a)}>
                        <b>{PROFILE[profileOf(a)].label}</b> — {PROFILE[profileOf(a)].blurb}.
                        <em>Bring: {PROFILE[profileOf(a)].counter}</em>
                    </p>

                    <div className={"ucVitals"}>
                        <b className={"ucHp " + hpCls}>{hp}<i>/{a.maxHealth}</i></b>
                        <span className={"ucBar"}><i className={hpCls} style={{width: pct + "%"}}/></span>
                    </div>

                    {conditions.length > 0 ? (
                        <ul className={"ucCond"}>
                            {conditions.map(([label, why, bad], i) =>
                                <li key={i} className={bad ? "ucBad" : "ucGood"}>
                                    <b>{label}</b> — {why}</li>)}
                        </ul>
                    ) : (
                        <p className={"ucClear"}>Nothing on them.</p>
                    )}

                    {/*
                      * What is still on the belt.
                      *
                      * Ordnance is packed at staging and never mentioned again
                      * once the shooting starts, so a thrown frag and a frag
                      * thrown twice looked identical — there was nowhere to
                      * check. This is the place you can check.
                      */}
                    {belt.length > 0 ? (
                        <p className={"ucKit"}>
                            {belt.map(([id, n]) => (
                                <span key={id}>{KIT[id].glyph} {KIT[id].label}{n > 1 ? ` ×${n}` : ""}</span>
                            ))}
                        </p>
                    ) : !foe && (
                        <p className={"ucKit none"}><span>No ordnance</span></p>
                    )}

                    {shot && shot.ok && !shot.unreachable && (
                        <p className={"ucShot"}>
                            {foe ? "You deal" : "It deals"} <b>~{shot.expected}</b> a shot
                            {dist !== null ? ` at ${dist} m` : ""}
                            <i>{Math.round(shot.soaked * 100)}% soaked · {Math.round(shot.odds.crit * 100)}% crit
                                {shot.covered ? " · behind cover" : ""}</i>
                        </p>
                    )}

                    <button className={"ucMore" + (this.state.detail ? " on" : "")}
                            aria-expanded={this.state.detail}
                            onClick={() => this.setState({detail: !this.state.detail})}>
                        {this.state.detail ? "▾" : "▸"} Details
                    </button>
                    {this.state.detail && (
                        <dl className={"ucFacts"}>
                            <div><dt>Armour</dt><dd>{hudArmor(a)} SP{" "}
                                <i>soaks {Math.round(soak(hudArmor(a)) * 100)}% of every hit</i></dd></div>
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
                    )}
                </div>
            </div>);
    }
}
