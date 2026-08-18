import * as React from "react";
import {Actor} from "../../actors/Actor";
import {accentCss} from "../../actors/resources/factionStyles";
import {ODDS_LABEL, forecastWave} from "../../interact/forecast";
import {Deployment, KIT, KIT_ORDER, KIT_PICKS, Kit, KitId, KitPick, STANCES, STANCE_ORDER,
    Stance, stanceOf} from "../../interact/loadout";
import type {PendingFight} from "../app";

export interface StagingViewProps {
    /** what this fight is, as the run controller filed it */
    pending: PendingFight;
    party: Actor[];
    enemies: Actor[];
    /** The crew's ordnance crate — what there is to draw from. */
    kit: Kit;
    onDeploy: (plan: Deployment) => void;
}

interface StagingState {
    /** stance per party index — indices, because two hires can share a name */
    stances: Stance[];
    picks: KitPick[];
    /** which hostile's line is expanded on a phone */
    open: number;
}

const THREAT = ["", "Street", "Pro", "Heavy", "Elite", "Legend"];

/** How a hostile's AI profile reads to someone sizing them up from cover. */
const HABIT: { [k: string]: string } = {
    aggressive: "pushes hard",
    berserker: "charges, no cover",
    flanker: "works the angles",
    camper: "digs in and shoots",
    balanced: "picks their moment",
};

/**
 * The minute before the shooting.
 *
 * The fight resolves itself, so this is where the game actually gets played.
 * It shows the wave — the real one, rolled before this screen opens rather than
 * a sample of what might turn up — and takes the two decisions that are still
 * the player's: how each of the crew fights, and what ordnance they walk in
 * carrying. Then it hands over.
 *
 * The layout is one column of cards, which is the same shape on a phone and on
 * a desktop; the desktop widens the cards and puts the wave beside the crew
 * rather than above it. Every control is a chip big enough for a thumb, and the
 * deploy button is pinned to the bottom of the screen where a thumb already is.
 */
export class StagingView extends React.Component<StagingViewProps, StagingState> {

    public override state: StagingState = {
        stances: this.props.party.map(stanceOf),
        picks: StagingView.defaultPicks(this.props.party, this.props.kit),
        open: -1,
    };

    /**
     * The belts start packed, not empty.
     *
     * Ordnance is spent when it is thrown, so anything the squad walks out with
     * and doesn't use goes straight back in the crate — carrying it costs
     * nothing (see `stow`). An empty default therefore wasn't a decision, it was
     * a tax on not knowing the screen: measured over 500 opening firefights, the
     * two-strong squad won 64% of them deployed empty and 95% carrying the two
     * frags that were sitting in the crate the whole time. Thirty-one points on
     * the first fight of a new game, decided by whether the player understood a
     * screen they had never seen.
     *
     * The choice this screen is actually asking about survives intact: *which*
     * two, and *who* carries them. Every pick is one tap to put back.
     */
    private static defaultPicks(party: Actor[], kit: Kit): KitPick[] {
        const able = party.filter((p) => p.canFight());
        if (!able.length) { return []; }
        const picks: KitPick[] = [];
        const left: Kit = {...kit};
        // frags first, then the rest of the crate in the order the chips are laid out
        for (const item of KIT_ORDER) {
            while (picks.length < KIT_PICKS && left[item] > 0) {
                left[item] -= 1;
                picks.push({item, carrier: able[picks.length % able.length]!});
            }
        }
        return picks;
    }

    private setStance(i: number, stance: Stance): void {
        const stances = this.state.stances.slice();
        stances[i] = stance;
        this.setState({stances});
    }

    /** How many of `item` are still in the crate after what's already picked. */
    private left(item: KitId): number {
        return this.props.kit[item] - this.state.picks.filter((p) => p.item === item).length;
    }

    /**
     * Tapping a piece of ordnance takes one; tapping it again puts it back.
     * With nobody chosen to carry it, it goes to whoever is standing — the
     * common case is a two-body crew and one frag, and making that a two-tap
     * decision would be ceremony, not agency.
     */
    private toggleKit = (item: KitId) => {
        const picks = this.state.picks;
        const mine = picks.map((p, i) => [p, i] as [KitPick, number]).filter(([p]) => p.item === item);
        if (mine.length > 0) {
            const last = mine[mine.length - 1]![1];
            this.setState({picks: picks.filter((_p, i) => i !== last)});
            return;
        }
        if (picks.length >= KIT_PICKS || this.left(item) <= 0) { return; }
        const carrier = this.nextCarrier();
        if (!carrier) { return; }
        this.setState({picks: [...picks, {item, carrier}]});
    };

    /** Spread ordnance across the crew before doubling anyone up. */
    private nextCarrier(): Actor | null {
        const able = this.props.party.filter((p) => p.canFight());
        if (!able.length) { return null; }
        const load = (a: Actor) => this.state.picks.filter((p) => p.carrier === a).length;
        return able.slice().sort((a, b) => load(a) - load(b))[0]!;
    }

    /** Hand a picked piece to somebody else — tap the carrier name to cycle. */
    private passTo = (idx: number) => {
        const able = this.props.party.filter((p) => p.canFight());
        if (able.length < 2) { return; }
        const picks = this.state.picks.slice();
        const pick = picks[idx]!;
        const at = able.indexOf(pick.carrier);
        picks[idx] = {...pick, carrier: able[(at + 1) % able.length]!};
        this.setState({picks});
    };

    private deploy = () => {
        this.props.onDeploy({
            stances: this.props.party.map((actor, i) => ({actor, stance: this.state.stances[i]!})),
            picks: this.state.picks,
        });
    };

    // ------------------------------------------------------------- the wave --

    private hostile = (e: Actor, i: number) => {
        const sp = Math.max(e.equipment.upper ? e.equipment.upper.stoppingPower : 0, e.cyberSP());
        const rank = Math.max(1, Math.min(5, e.rank || 1));
        const sub = e.faction ? `${e.faction}${e.archetype ? " " + e.archetype : ""}` : e.role.name;
        const open = this.state.open === i;
        return (
            <li key={i} className={"stFoe" + (open ? " open" : "")}
                style={{borderLeft: "3px solid " + accentCss(e.faction)}}>
                <button className={"stFoeHead"} onClick={() => this.setState({open: open ? -1 : i})}>
                    <span className={"stRank rank-" + rank} title={THREAT[rank] + " — rank " + rank + " of 5"}>✦</span>
                    <span className={"stFoeWho"}><b>{e.name}</b><i>{sub} · L{e.level}</i></span>
                    <span className={"stFoeNums"}>
                        <b>{Math.ceil(e.health)}</b> HP<span className={"sep"}>·</span>SP {sp}
                    </span>
                </button>
                <dl className={"stFoeMore"}>
                    <div><dt>Threat</dt><dd>{THREAT[rank]}</dd></div>
                    <div><dt>Carrying</dt><dd>{e.weapon.name} <i>({e.weapon.weaponClass})</i></dd></div>
                    <div><dt>Fights</dt><dd>{HABIT[e.temperament] || HABIT["balanced"]}</dd></div>
                </dl>
            </li>);
    };

    // ------------------------------------------------------------- the crew --

    private member = (a: Actor, i: number) => {
        const hp = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        const down = !a.canFight();
        const carrying = this.state.picks.filter((p) => p.carrier === a);
        return (
            <li key={i} className={"stMember" + (down ? " down" : "")}>
                <div className={"stWho"}>
                    <img src={a.role.portrait} alt={""}/>
                    <span className={"stName"}>
                        <b>{a.name}</b>
                        <i>{a.role.name} · L{a.level} · {a.weapon.name}</i>
                    </span>
                    <span className={"stHp"}>
                        <span className={"stBar"}><i style={{width: hp + "%"}}/></span>
                        <b>{Math.max(0, Math.ceil(a.health))}</b>
                    </span>
                </div>
                {down ? (
                    <p className={"stDown"}>Down — sitting this one out.</p>
                ) : (
                    <div className={"stStances"}>
                        {STANCE_ORDER.map((s) => (
                            <button key={s} className={"stChip" + (this.state.stances[i] === s ? " on" : "")}
                                    title={STANCES[s].blurb}
                                    onClick={() => this.setStance(i, s)}>
                                {STANCES[s].label}
                                <i>{STANCES[s].trade[0]}</i><i>{STANCES[s].trade[1]}</i>
                            </button>
                        ))}
                    </div>
                )}
                {carrying.length > 0 &&
                    <p className={"stCarry"}>Carrying {carrying.map((p) => KIT[p.item].label).join(" + ")}</p>}
            </li>);
    };

    // -------------------------------------------------------------- the kit --

    private kitRow = (item: KitId) => {
        const spec = KIT[item];
        const stock = this.props.kit[item];
        const taken = this.state.picks.filter((p) => p.item === item).length;
        const full = this.state.picks.length >= KIT_PICKS;
        const dead = stock <= 0 || (taken === 0 && full);
        return (
            <li key={item} className={"stKit" + (taken > 0 ? " on" : "") + (dead ? " out" : "")}>
                <button onClick={() => this.toggleKit(item)} disabled={dead && taken === 0}>
                    <span className={"stGlyph"}>{spec.glyph}</span>
                    <span className={"stKitWho"}>
                        <b>{spec.label}{taken > 1 ? ` ×${taken}` : ""}</b>
                        <i>{spec.blurb}</i>
                        <em>{spec.when}</em>
                    </span>
                    <span className={"stStock"}>{this.left(item)}<i>in crate</i></span>
                </button>
            </li>);
    };

    public override render() {
        const {party, enemies, pending} = this.props;
        const fc = forecastWave(party, enemies);
        const picks = this.state.picks;
        const able = party.filter((p) => p.canFight());
        return (
            <div className={"staging"}>
                <div className={"stCard"}>
                    <div className={"stHead"}>
                        <h1>{pending.headline}</h1>
                        <span className={"stOdds o-" + fc.odds}>{ODDS_LABEL[fc.odds]}</span>
                        <p>
                            {pending.holdout
                                ? `Hold the street for ${pending.holdout} rounds and they break off.`
                                : "Put them all down and the block is yours."}
                            {" "}Once you deploy, the crew fights it out on their own — everything
                            you get to decide, you decide here.
                        </p>
                    </div>

                    <div className={"stCols"}>
                        <section className={"stBlock"}>
                            <h2>On the street <b>{enemies.length}</b></h2>
                            <ul className={"stFoes"}>{enemies.map(this.hostile)}</ul>
                        </section>

                        <section className={"stBlock"}>
                            <h2>Orders <b>{able.length} up</b></h2>
                            <ul className={"stMembers"}>{party.map(this.member)}</ul>
                        </section>

                        <section className={"stBlock stKitBlock"}>
                            <h2>Ordnance <b>{picks.length}/{KIT_PICKS}</b></h2>
                            <p className={"stNote"}>
                                Two pieces go out on a job. The crew throws them when the moment
                                comes — spent when thrown, back in the crate when it doesn't.
                            </p>
                            <ul className={"stKits"}>{KIT_ORDER.map(this.kitRow)}</ul>
                            {picks.length > 0 && able.length > 1 &&
                                <ul className={"stAssign"}>
                                    {picks.map((p, i) => (
                                        <li key={i}>
                                            <button onClick={() => this.passTo(i)}>
                                                {KIT[p.item].glyph} {KIT[p.item].label} →{" "}
                                                <b>{p.carrier.name.split(" ")[0]}</b>
                                                <i>tap to pass</i>
                                            </button>
                                        </li>))}
                                </ul>}
                        </section>
                    </div>

                    <div className={"stActions"}>
                        <button className={"prim"} onClick={this.deploy}>Deploy ▸</button>
                    </div>
                </div>
            </div>);
    }
}
