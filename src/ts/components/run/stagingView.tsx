import * as React from "react";
import {Actor} from "../../actors/Actor";
import {ProfileBadge, ProfileChip} from "../general/profileBadge";
import {PROFILE, profileTally} from "../../interact/profile";
import {ODDS_LABEL, forecastWave, sideStrength} from "../../interact/forecast";
import {Deployment, KIT, KIT_ORDER, KIT_PICKS, Kit, KitId, KitPick, LINES, LINE_ORDER, Line,
    SQUAD_CAP, STANCES, STANCE_ORDER, Stance, lineOf, stanceOf} from "../../interact/loadout";
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
    /** who walks in, per party index. The payroll is bigger than the squad now. */
    going: boolean[];
    /** standing orders on distance, per party index — defaults to the class's own */
    lines: Line[];
    picks: KitPick[];
    /** the crew row the keyboard is pointed at */
    sel: number;
}

/** The selection as the engine will read it: you first, then the chosen. */
function squadFrom(party: Actor[], going: boolean[]): Actor[] {
    const you = party.find((p) => !p.hireable);
    const hires = party.filter((p, i) => going[i] && p.canFight() && p !== you);
    return you && you.canFight() ? [you, ...hires] : hires;
}

/**
 * Who the screen opens with selected.
 *
 * Your character is always in: they are the run, and Trauma Team, chrome and
 * reputation all key off them being on the street. The remaining seats go to
 * the strongest hires by the same power measure the forecast is fitted on, so
 * signing a Legend and finding the screen has benched them by default can't
 * happen. Everything after that is the player deliberately sitting somebody
 * down — usually somebody who is hurt.
 */
function openWith(party: Actor[]): boolean[] {
    const you = party.find((p) => !p.hireable);
    const seats = SQUAD_CAP - (you ? 1 : 0);
    const ranked = party
        .filter((p) => p !== you && p.canFight())
        .sort((a, b) => sideStrength([b]) - sideStrength([a]))
        .slice(0, seats);
    return party.map((p) => p === you || ranked.indexOf(p) >= 0);
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

/** The one letter a dial cell spends on each setting. */
const LINE_GLYPH: { [k in Line]: string } = {point: "P", mid: "M", overwatch: "O"};
const STANCE_GLYPH: { [k in Stance]: string } = {push: "▲", steady: "=", hold: "▼"};

/** Crate rows answer to the home row, so they never collide with the crew digits. */
const KIT_HOTKEYS = "asdf";

/**
 * The minute before the shooting, as a keyed grid.
 *
 * The fight resolves itself, so this is where the game actually gets played.
 * Two columns: the crew as a table — one merc per row, with the going toggle,
 * both order dials and the carry in the row — and the wave as a table beside
 * it, summed into "what to bring". Every row answers to a key, the key bar is
 * the legend, and DEPLOY sits in the bar where a thumb already is.
 */
export class StagingView extends React.Component<StagingViewProps, StagingState> {

    public override state: StagingState = StagingView.openState(this.props.party, this.props.kit);

    public override componentDidMount() { window.addEventListener("keydown", this.onKey); }
    public override componentWillUnmount() { window.removeEventListener("keydown", this.onKey); }

    /**
     * How the screen opens: the strongest four selected, and their belts packed.
     *
     * Built in one place because the two decisions are coupled — ordnance is
     * handed to bodies that are actually walking in, so the squad has to be
     * chosen before the crate can be drawn from.
     */
    private static openState(party: Actor[], kit: Kit): StagingState {
        const going = openWith(party);
        const you = party.findIndex((p) => !p.hireable);
        return {
            stances: party.map(stanceOf),
            lines: party.map(lineOf),
            going,
            picks: StagingView.defaultPicks(squadFrom(party, going), kit),
            sel: you >= 0 ? you : 0,
        };
    }

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
    private static defaultPicks(squad: Actor[], kit: Kit): KitPick[] {
        const able = squad.filter((p) => p.canFight());
        if (!able.length) { return []; }
        const picks: KitPick[] = [];
        const left: Kit = {...kit};
        // frags first, then the rest of the crate in the order the rows are laid out
        for (const item of KIT_ORDER) {
            while (picks.length < KIT_PICKS && left[item] > 0) {
                left[item] -= 1;
                picks.push({item, carrier: able[picks.length % able.length]!});
            }
        }
        return picks;
    }

    // ---------------------------------------------------------------- keys --

    private onKey = (e: KeyboardEvent) => {
        const t = e.target as HTMLElement | null;
        if (t && ["INPUT", "SELECT", "TEXTAREA"].indexOf(t.tagName) >= 0) { return; }
        if (e.metaKey || e.ctrlKey || e.altKey) { return; }
        const k = e.key.toLowerCase();
        const sel = this.state.sel;
        const digit = parseInt(k, 10);
        if (digit >= 1 && digit <= this.props.party.length) { this.setState({sel: digit - 1}); }
        else if (k === " ") { this.toggleGoing(sel); }
        else if (k === "q") { this.setLine(sel, "point"); }
        else if (k === "w") { this.setLine(sel, "mid"); }
        else if (k === "e") { this.setLine(sel, "overwatch"); }
        else if (k === "z") { this.setStance(sel, "push"); }
        else if (k === "x") { this.setStance(sel, "steady"); }
        else if (k === "c") { this.setStance(sel, "hold"); }
        else if (KIT_HOTKEYS.indexOf(k) >= 0 && KIT_HOTKEYS.indexOf(k) < KIT_ORDER.length) {
            this.toggleKit(KIT_ORDER[KIT_HOTKEYS.indexOf(k)]!);
        }
        else if (k === "t" && this.state.picks.length) { this.passTo(this.state.picks.length - 1); }
        else if (k === "enter") { this.deploy(); }
        else { return; }
        e.preventDefault();
    };

    // ------------------------------------------------------------ the squad --

    private squadOf(going: boolean[]): Actor[] {
        return squadFrom(this.props.party, going);
    }

    private squad(): Actor[] {
        return this.squadOf(this.state.going);
    }

    /**
     * Bench somebody, or bring them back. Your character is not a toggle — they
     * run the crew, and the whole run is written around them being in the fight.
     */
    private toggleGoing = (i: number) => {
        const a = this.props.party[i];
        if (!a || !a.hireable || !a.canFight()) { return; }
        const going = this.state.going.slice();
        if (going[i]) { going[i] = false; }
        else if (this.squad().length < SQUAD_CAP) { going[i] = true; }
        else { return; }
        // Ordnance follows the bodies: what a benched carrier was holding is
        // passed to whoever is still walking in, rather than quietly staying in
        // the van with them.
        this.setState({going, picks: this.reseat(this.state.picks, this.squadOf(going))});
    };

    /** Move any pick whose carrier isn't deploying onto the lightest-loaded body. */
    private reseat(picks: KitPick[], squad: Actor[]): KitPick[] {
        if (!squad.length) { return []; }
        const out: KitPick[] = [];
        picks.forEach((p) => {
            if (squad.indexOf(p.carrier) >= 0) { out.push(p); return; }
            const load = (x: Actor) => out.filter((q) => q.carrier === x).length;
            out.push({...p, carrier: squad.slice().sort((x, y) => load(x) - load(y))[0]!});
        });
        return out;
    }

    private setLine(i: number, line: Line): void {
        if (!this.props.party[i]) { return; }
        const lines = this.state.lines.slice();
        lines[i] = line;
        this.setState({lines});
    }

    private setStance(i: number, stance: Stance): void {
        if (!this.props.party[i]) { return; }
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
        const able = this.squad();
        if (!able.length) { return null; }
        const load = (a: Actor) => this.state.picks.filter((p) => p.carrier === a).length;
        return able.slice().sort((a, b) => load(a) - load(b))[0]!;
    }

    /** Hand a picked piece to somebody else — tap the carrier name to cycle. */
    private passTo = (idx: number) => {
        const able = this.squad();
        if (able.length < 2) { return; }
        const picks = this.state.picks.slice();
        const pick = picks[idx];
        if (!pick) { return; }
        const at = able.indexOf(pick.carrier);
        picks[idx] = {...pick, carrier: able[(at + 1) % able.length]!};
        this.setState({picks});
    };

    private deploy = () => {
        const squad = this.squad();
        if (!squad.length) { return; }
        this.props.onDeploy({
            squad,
            // Orders are for the people receiving them — the benched keep
            // whatever stance they last fought under.
            stances: this.props.party
                .map((actor, i) => ({actor, stance: this.state.stances[i]!}))
                .filter(({actor}) => squad.indexOf(actor) >= 0),
            lines: this.props.party
                .map((actor, i) => ({actor, line: this.state.lines[i]!}))
                .filter(({actor}) => squad.indexOf(actor) >= 0),
            picks: this.reseat(this.state.picks, squad),
        });
    };

    // ------------------------------------------------------------- the crew --

    private crewRow = (a: Actor, i: number) => {
        const hpPct = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        const down = !a.canFight();
        const you = !a.hireable;
        const going = !down && this.state.going[i] === true;
        const noSeats = this.squad().length >= SQUAD_CAP;
        const carrying = going ? this.state.picks.filter((p) => p.carrier === a) : [];
        const sel = this.state.sel === i;
        return (
            <tr key={i} className={(sel ? "sel " : "") + (down || !going ? "out" : "")}
                onClick={() => this.setState({sel: i})}>
                <td><span className={"kgKey" + (sel ? " on" : "")}>{i + 1}</span></td>
                <td>
                    {down
                        ? <span className={"sub"}>—</span>
                        : you
                            ? <span className={"kgGo on"} title={"You run this crew — you walk in on every job"}>GO</span>
                            : <button className={"kgGo" + (going ? " on" : "")}
                                      disabled={!going && noSeats}
                                      title={going ? "Leave them with the van"
                                          : noSeats ? `Only ${SQUAD_CAP} walk onto a street` : "Bring them along"}
                                      onClick={(e) => { e.stopPropagation(); this.toggleGoing(i); }}>
                                {going ? "GO" : "BN"}
                            </button>}
                </td>
                <td><b>{a.name}</b>{you ? <span className={"sub"}> you</span> : null}</td>
                <td><ProfileBadge unit={a}/></td>
                <td className={"sub kgHideM"}>{a.role.name} L{a.level}</td>
                <td className={"num"}>
                    <span className={"kgHp kgHideM"}>
                        <i className={hpPct <= 25 ? "cr" : hpPct <= 60 ? "lo" : ""} style={{width: hpPct + "%"}}/>
                    </span>
                    {Math.max(0, Math.ceil(a.health))}
                </td>
                <td className={"sub clip kgHideM"} title={a.weapon.name}>{a.weapon.name}</td>
                {down
                    ? <td colSpan={3} className={"sub"}>down — sitting this one out</td>
                    : <React.Fragment>
                        <td>
                            <span className={"kgDial"}>
                                {LINE_ORDER.map((l) => (
                                    <u key={l} className={this.state.lines[i] === l ? "on" : ""}
                                       title={`${LINES[l].label} — ${LINES[l].blurb}`}
                                       onClick={(e) => { e.stopPropagation(); this.setLine(i, l); }}>
                                        {LINE_GLYPH[l]}
                                    </u>))}
                            </span>
                        </td>
                        <td>
                            <span className={"kgDial w"}>
                                {STANCE_ORDER.map((st) => (
                                    <u key={st} className={this.state.stances[i] === st ? "on" : ""}
                                       title={`${STANCES[st].label} — ${STANCES[st].blurb}`}
                                       onClick={(e) => { e.stopPropagation(); this.setStance(i, st); }}>
                                        {STANCE_GLYPH[st]}
                                    </u>))}
                            </span>
                        </td>
                        <td>{carrying.length ? carrying.map((p) => KIT[p.item].glyph).join(" ") : <span className={"sub"}>—</span>}</td>
                    </React.Fragment>}
            </tr>);
    };

    /** What the selected row's orders actually mean, in one line under the table. */
    private selectedRead() {
        const i = this.state.sel;
        const a = this.props.party[i];
        if (!a) { return null; }
        if (!a.canFight()) {
            return <p className={"kgP dim"}><b>{a.name}</b> is down — sitting this one out.</p>;
        }
        const line = this.state.lines[i]!;
        const stance = this.state.stances[i]!;
        return (
            <p className={"kgP dim"}>
                <b>{a.name}</b> — {LINES[line].label}: {LINES[line].blurb}.
                {" "}{STANCES[stance].label}: {STANCES[stance].blurb}.
            </p>);
    }

    // -------------------------------------------------------------- the kit --

    private kitRow = (item: KitId, i: number) => {
        const spec = KIT[item];
        const picks = this.state.picks;
        const mine = picks.map((p, at) => [p, at] as [KitPick, number]).filter(([p]) => p.item === item);
        const taken = mine.length;
        const full = picks.length >= KIT_PICKS;
        const dead = this.props.kit[item] <= 0 || (taken === 0 && full);
        const canPass = this.squad().length > 1;
        return (
            <tr key={item} className={taken > 0 ? "sel" : dead ? "out" : ""}
                onClick={() => this.toggleKit(item)}>
                <td><span className={"kgKey" + (taken > 0 ? " on" : "")}>{KIT_HOTKEYS[i]}</span></td>
                <td><b>{spec.glyph} {spec.label}{taken > 1 ? ` ×${taken}` : ""}</b></td>
                <td className={"sub kgHideM"}>{spec.when}</td>
                <td className={"num"}>{this.left(item)}</td>
                <td>
                    {taken === 0
                        ? <span className={"sub"}>—</span>
                        : mine.map(([p, at]) => (
                            <button key={at} className={"kgGo on"}
                                    title={canPass ? "Pass it to the next body" : "The only body going"}
                                    onClick={(e) => { e.stopPropagation(); this.passTo(at); }}>
                                {p.carrier.name.split(" ")[0]}
                            </button>))}
                </td>
            </tr>);
    };

    // ------------------------------------------------------------- the wave --

    private hostileRow = (e: Actor, i: number) => {
        const sp = Math.max(e.equipment.upper ? e.equipment.upper.stoppingPower : 0, e.cyberSP());
        const rank = Math.max(1, Math.min(5, e.rank || 1));
        const sub = e.faction ? `${e.faction}${e.archetype ? " " + e.archetype : ""}` : e.role.name;
        return (
            <tr key={i}>
                <td><span className={"kgRank" + (rank >= 5 ? " hi" : rank <= 2 ? " lo" : "")}
                          title={THREAT[rank] + " — rank " + rank + " of 5"}>
                    {"✦".repeat(rank)}
                </span></td>
                <td><ProfileBadge unit={e}/></td>
                <td><b>{e.name}</b><br/><span className={"sub"}>{sub}</span></td>
                <td className={"num"}>{e.level}</td>
                <td className={"num"}>{Math.ceil(e.health)}</td>
                <td className={"num"}>{sp}</td>
                <td className={"sub clip kgHideM"} title={e.weapon.name}>{e.weapon.name}</td>
                <td className={"sub"}>{HABIT[e.temperament] || HABIT["balanced"]}</td>
            </tr>);
    };

    public override render() {
        const {party, enemies, pending} = this.props;
        const squad = this.squad();
        // The verdict reads the squad, not the payroll: benching somebody has
        // to be visible as a worse fight, or the choice is being made blind.
        const fc = forecastWave(squad, enemies);
        const picks = this.state.picks;
        const benched = party.filter((p) => p.canFight()).length - squad.length;
        const tally = profileTally(enemies);
        const tallyLine = tally.map(([prof, n]) => `${n} ${PROFILE[prof].label.toLowerCase()}`).join(" · ");
        return (
            <div className={"kg"}>
                <div className={"kgTop"}>
                    <span className={"brand"}>RAINFALL</span>
                    <span><b>{pending.headline}</b></span>
                    <span className={"kgHideM"}>
                        {pending.holdout
                            ? `hold ${pending.holdout} rounds and they break off`
                            : "put them all down and the block is yours"}
                    </span>
                    <span className={"r odds o-" + fc.odds}>Odds: {ODDS_LABEL[fc.odds]}</span>
                </div>
                <div className={"kgBody"}>
                    <div className={"kgCol"} style={{flex: 1.15}}>
                        <h3 className={"kgH"}>The crew <b>{squad.length} of {SQUAD_CAP} going</b>
                            <em>cap {SQUAD_CAP}</em></h3>
                        <table className={"kgTable"}>
                            <thead><tr>
                                <th/><th/><th>Merc</th><th/><th className={"kgHideM"}>Class</th><th className={"num"}>HP</th>
                                <th className={"kgHideM"}>Weapon</th><th>Where</th><th>How</th><th>Carry</th>
                            </tr></thead>
                            <tbody>{party.map(this.crewRow)}</tbody>
                        </table>
                        {this.selectedRead()}
                        {benched > 0 && (
                            <p className={"kgP dim"}>
                                {benched === 1 ? "One stays" : `${benched} stay`} with the van —
                                they keep their wounds but they keep their life, and the odds
                                above already count what walks in without them.
                            </p>
                        )}
                        <div className={"kgHr"}/>
                        <h3 className={"kgH"}>Crate <b>{picks.length} of {KIT_PICKS} out</b>
                            <em>tap the carrier to pass</em></h3>
                        <table className={"kgTable"}>
                            <thead><tr>
                                <th/><th>Piece</th><th className={"kgHideM"}>Thrown when</th>
                                <th className={"num"}>In crate</th><th>Carrier</th>
                            </tr></thead>
                            <tbody>{KIT_ORDER.map(this.kitRow)}</tbody>
                        </table>
                        <p className={"kgP dim"}>
                            {KIT_PICKS} pieces go out on a job. The crew throws them when the moment
                            comes — spent when thrown, back in the crate when it doesn't.
                        </p>
                    </div>
                    <div className={"kgCol"}>
                        <h3 className={"kgH"}>On the street <b>{enemies.length}</b><em>{tallyLine}</em></h3>
                        <table className={"kgTable"}>
                            <thead><tr>
                                <th>Rank</th><th/><th>Hostile</th><th className={"num"}>Lvl</th>
                                <th className={"num"}>HP</th><th className={"num"}>SP</th>
                                <th className={"kgHideM"}>Weapon</th><th>Fights</th>
                            </tr></thead>
                            <tbody>{enemies.map(this.hostileRow)}</tbody>
                        </table>
                        <h3 className={"kgH"}>What to bring</h3>
                        <ul className={"stTally"}>
                            {tally.map(([prof, n]) => (
                                <li key={prof}>
                                    <ProfileChip profile={prof} withLabel={true}/>
                                    <b>×{n}</b>
                                    <i>{PROFILE[prof].counter}</i>
                                </li>))}
                        </ul>
                        <div className={"kgHr"}/>
                        <h3 className={"kgH"}>The read</h3>
                        <p className={"kgP dim"}>
                            {pending.holdout
                                ? <React.Fragment>A clock rewards <b>Hold</b> — survive {pending.holdout} rounds
                                    and they break off. </React.Fragment>
                                : <React.Fragment>A sweep rewards <b>Push</b> — put them all down and the block
                                    is yours. </React.Fragment>}
                            The odds read <b>{ODDS_LABEL[fc.odds]}</b> for the {squad.length} walking in,
                            and they move the moment you bench somebody. Once you deploy, the crew fights
                            it out on their own — everything you get to decide, you decide here.
                        </p>
                    </div>
                </div>
                <div className={"kgBar"}>
                    <span className={"keysOnly"}><b>1–{party.length}</b> merc · <b>space</b> bench</span>
                    <span className={"keysOnly"}><b>q/w/e</b> where · <b>z/x/c</b> how</span>
                    <span className={"keysOnly"}><b>a/s/d/f</b> ordnance · <b>t</b> pass</span>
                    <span className={"r"}/>
                    <button className={"kgPrim"} onClick={this.deploy} disabled={squad.length <= 0}>
                        Deploy {squad.length} ▸
                    </button>
                </div>
            </div>);
    }
}
