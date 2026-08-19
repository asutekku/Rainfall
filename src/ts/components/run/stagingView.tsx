import * as React from "react";
import {Actor} from "../../actors/Actor";
import {ProfileBadge, ProfileChip} from "../general/profileBadge";
import {KgBack, KgBar, KgModal, KgRow} from "../general/kgKit";
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
    /**
     * Back to the map without fighting. Absent for fights that can't be walked
     * away from — an encounter that turned ugly is already happening.
     */
    onCancel?: (() => void) | undefined;
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
    /** which merc's orders sheet is open (-1: none) */
    sheet: number;
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
 * Reads top to bottom in the order you size a fight up: who is out there,
 * who you send, what they carry. A merc's row shows their orders; tapping it
 * opens the orders sheet, where where/how/bench live at full size. Deploy and
 * the way back to the map sit in the bar, where a thumb already is.
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
            sheet: -1,
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
        const sheetOpen = this.state.sheet >= 0;
        // orders apply to the open sheet, or to the keyboard cursor
        const at = sheetOpen ? this.state.sheet : this.state.sel;
        const digit = parseInt(k, 10);
        if (k === "escape") {
            if (sheetOpen) { this.setState({sheet: -1}); }
            else if (this.props.onCancel) { this.props.onCancel(); }
            else { return; }
        }
        else if (digit >= 1 && digit <= this.props.party.length) {
            this.setState({sel: digit - 1, sheet: sheetOpen ? digit - 1 : -1});
        }
        else if (k === " ") { this.toggleGoing(at); }
        else if (k === "q") { this.setLine(at, "point"); }
        else if (k === "w") { this.setLine(at, "mid"); }
        else if (k === "e") { this.setLine(at, "overwatch"); }
        else if (k === "z") { this.setStance(at, "push"); }
        else if (k === "x") { this.setStance(at, "steady"); }
        else if (k === "c") { this.setStance(at, "hold"); }
        else if (KIT_HOTKEYS.indexOf(k) >= 0 && KIT_HOTKEYS.indexOf(k) < KIT_ORDER.length) {
            this.toggleKit(KIT_ORDER[KIT_HOTKEYS.indexOf(k)]!);
        }
        else if (k === "enter") {
            if (sheetOpen) { this.setState({sheet: -1}); } else { this.deploy(); }
        }
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
        // Ordnance follows the bodies: a benched carrier's load passes to who
        // still walks in, and a returning body takes their share back.
        const squad = this.squadOf(going);
        this.setState({going, picks: this.rebalance(this.reseat(this.state.picks, squad), squad)});
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

    /**
     * Spread the load back out: nobody carries two while somebody standing
     * carries nothing. Keeps deliberate hand-offs alike-loaded crews intact.
     */
    private rebalance(picks: KitPick[], squad: Actor[]): KitPick[] {
        if (squad.length < 2) { return picks; }
        const out = picks.slice();
        const load = (x: Actor) => out.filter((q) => q.carrier === x).length;
        for (let guard = 0; guard < out.length; guard++) {
            const max = squad.slice().sort((a, b) => load(b) - load(a))[0]!;
            const min = squad.slice().sort((a, b) => load(a) - load(b))[0]!;
            if (load(max) - load(min) < 2) { break; }
            const idx = out.findIndex((q) => q.carrier === max);
            out[idx] = {...out[idx]!, carrier: min};
        }
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
     * With nobody chosen to carry it, it goes to whoever is standing.
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

    /** Hand this merc one of `item` from the crate. */
    private give = (a: Actor, item: KitId) => {
        if (this.state.picks.length >= KIT_PICKS || this.left(item) <= 0) { return; }
        this.setState({picks: [...this.state.picks, {item, carrier: a}]});
    };

    /** Take one of `item` off this merc's belt, back into the crate. */
    private stow = (a: Actor, item: KitId) => {
        const idx = this.state.picks.findIndex((p) => p.item === item && p.carrier === a);
        if (idx < 0) { return; }
        this.setState({picks: this.state.picks.filter((_p, i) => i !== idx)});
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

    private streetBlock() {
        const {enemies} = this.props;
        const tally = profileTally(enemies);
        const tallyLine = tally.map(([prof, n]) => `${n} ${PROFILE[prof].label.toLowerCase()}`).join(" · ");
        return (
            <React.Fragment>
                <h3 className={"kgH"}>On the street <b>{enemies.length}</b><em>{tallyLine}</em></h3>
                <table className={"kgTable"}>
                    <thead><tr>
                        <th>Rank</th><th/><th>Hostile</th><th className={"num"}>Lvl</th>
                        <th className={"num"}>HP</th><th className={"num"}>SP</th>
                        <th className={"kgHideM"}>Weapon</th><th>Fights</th>
                    </tr></thead>
                    <tbody>{enemies.map(this.hostileRow)}</tbody>
                </table>
                <ul className={"stTally"}>
                    {tally.map(([prof, n]) => (
                        <li key={prof}>
                            <ProfileChip profile={prof} withLabel={true}/>
                            <b>×{n}</b>
                            <i>{PROFILE[prof].counter}</i>
                        </li>))}
                </ul>
            </React.Fragment>);
    }

    // ------------------------------------------------------------- the crew --

    private crewRow = (a: Actor, i: number) => {
        const hpPct = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        const down = !a.canFight();
        const you = !a.hireable;
        const going = !down && this.state.going[i] === true;
        const carrying = going ? this.state.picks.filter((p) => p.carrier === a) : [];
        const sel = this.state.sel === i;
        return (
            <tr key={i} className={(sel ? "sel " : "") + (down || !going ? "out" : "")}
                onClick={() => { if (!down) { this.setState({sel: i, sheet: i}); } }}>
                <td className={"kgHideM"}><span className={"kgKey kb" + (sel ? " on" : "")}>{i + 1}</span></td>
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
                    ? <td colSpan={3} className={"sub"}>down</td>
                    : !going
                        ? <td colSpan={3} className={"sub"}>benched</td>
                        : <React.Fragment>
                            <td><span className={"kgState"}
                                      title={`${LINES[this.state.lines[i]!].label} — ${LINES[this.state.lines[i]!].blurb}`}>
                                {LINE_GLYPH[this.state.lines[i]!]}
                            </span></td>
                            <td><span className={"kgState w"}
                                      title={`${STANCES[this.state.stances[i]!].label} — ${STANCES[this.state.stances[i]!].blurb}`}>
                                {STANCE_GLYPH[this.state.stances[i]!]}
                            </span></td>
                            <td>{carrying.length
                                ? carrying.map((p) => KIT[p.item].glyph).join(" ")
                                : <span className={"sub"}>—</span>}</td>
                        </React.Fragment>}
            </tr>);
    };

    /** The orders sheet — where, how, and the bench, at thumb size. */
    private ordersSheet() {
        const i = this.state.sheet;
        const a = this.props.party[i];
        if (!a) { return null; }
        const you = !a.hireable;
        const going = this.state.going[i] === true && a.canFight();
        const noSeats = this.squad().length >= SQUAD_CAP;
        return (
            <KgModal title={<React.Fragment>{a.name} <b>{a.role.name} L{a.level}</b></React.Fragment>}
                     onClose={() => this.setState({sheet: -1})}>
                {!you &&
                    <KgRow label={going ? "Going" : "Benched"} on={going}
                           danger={!going && !a.canFight()}
                           disabled={!a.canFight() || (!going && noSeats)}
                           value={!a.canFight() ? "down" : going ? "tap to bench"
                               : noSeats ? `only ${SQUAD_CAP} walk in` : "tap to bring"}
                           onClick={() => this.toggleGoing(i)}/>}
                {going && <React.Fragment>
                    <h3 className={"kgH"}>Where <em className={"keysOnly"}>q/w/e</em></h3>
                    <div className={"kgChoice"}>
                        {LINE_ORDER.map((l) => (
                            <KgRow key={l} glyph={LINE_GLYPH[l]} label={LINES[l].label}
                                   on={this.state.lines[i] === l} value={LINES[l].blurb}
                                   onClick={() => this.setLine(i, l)}/>))}
                    </div>
                    <h3 className={"kgH"}>How <em className={"keysOnly"}>z/x/c</em></h3>
                    <div className={"kgChoice"}>
                        {STANCE_ORDER.map((st) => (
                            <KgRow key={st} glyph={STANCE_GLYPH[st]} label={STANCES[st].label}
                                   on={this.state.stances[i] === st} value={STANCES[st].blurb}
                                   onClick={() => this.setStance(i, st)}/>))}
                    </div>
                    {this.gearSection(a)}
                </React.Fragment>}
            </KgModal>);
    }

    /**
     * The merc's belt, editable in place: each piece in the game is a row —
     * tap to take one from the crate, tap again to stow it. Moving a piece
     * between mercs is stow on one sheet, take on the other.
     */
    private gearSection(a: Actor) {
        const picks = this.state.picks;
        const mine = (item: KitId) => picks.filter((p) => p.item === item && p.carrier === a).length;
        const held = picks.filter((p) => p.carrier === a).length;
        const full = picks.length >= KIT_PICKS;
        return (
            <React.Fragment>
                <h3 className={"kgH"}>Gear <b>{held}</b><em>{KIT_PICKS} out per job, crew-wide</em></h3>
                <div className={"kgChoice"}>
                    {KIT_ORDER.filter((item) => this.props.kit[item] > 0 || mine(item) > 0).map((item) => {
                        const spec = KIT[item];
                        const n = mine(item);
                        const canGive = !full && this.left(item) > 0;
                        return (
                            <KgRow key={item} glyph={spec.glyph}
                                   label={`${spec.label}${n > 1 ? ` ×${n}` : ""}`}
                                   on={n > 0} disabled={n === 0 && !canGive}
                                   title={`${spec.blurb} — ${spec.when}`}
                                   value={n > 0 ? "carrying — tap to stow"
                                       : this.left(item) <= 0 ? "a teammate has it"
                                       : full ? "belts full" : `${this.left(item)} in crate`}
                                   onClick={() => n > 0 ? this.stow(a, item) : this.give(a, item)}/>);
                    })}
                </div>
            </React.Fragment>);
    }

    // -------------------------------------------------------------- the kit --

    private crateChip = (item: KitId) => {
        const spec = KIT[item];
        const taken = this.state.picks.filter((p) => p.item === item).length;
        const full = this.state.picks.length >= KIT_PICKS;
        const dead = this.props.kit[item] <= 0 || (taken === 0 && full);
        return (
            <button key={item}
                    className={"kgCrateChip" + (taken > 0 ? " on" : dead ? " out" : "")}
                    disabled={dead && taken === 0}
                    title={`${spec.blurb} — ${spec.when}`}
                    onClick={() => this.toggleKit(item)}>
                <i>{spec.glyph}</i>
                <b>{spec.label}{taken > 1 ? ` ×${taken}` : ""}</b>
                <span>{this.left(item)} left</span>
            </button>);
    };

    public override render() {
        const {party, pending} = this.props;
        const squad = this.squad();
        // The verdict reads the squad, not the payroll: benching somebody has
        // to be visible as a worse fight, or the choice is being made blind.
        const fc = forecastWave(squad, this.props.enemies);
        const picks = this.state.picks;
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
                    <div className={"kgCol"}>
                        {this.streetBlock()}
                    </div>
                    <div className={"kgCol"} style={{flex: 1.15}}>
                        <h3 className={"kgH"}>The crew <b>{squad.length} of {SQUAD_CAP} going</b>
                            <em>tap a merc for orders</em></h3>
                        <table className={"kgTable tap"}>
                            <thead><tr>
                                <th/><th>Merc</th><th/><th className={"kgHideM"}>Class</th>
                                <th className={"num"}>HP</th><th className={"kgHideM"}>Weapon</th>
                                <th>Where</th><th>How</th><th>Carry</th>
                            </tr></thead>
                            <tbody>{party.map(this.crewRow)}</tbody>
                        </table>
                        <div className={"kgHr"}/>
                        <h3 className={"kgH"}>Crate <b>{picks.length} of {KIT_PICKS} out</b>
                            <em className={"keysOnly"}>a/s/d/f</em></h3>
                        <div className={"kgCrate"}>{KIT_ORDER.map(this.crateChip)}</div>
                    </div>
                </div>
                <KgBar>
                    <span className={"keysOnly"}><b>1–{party.length}</b> merc · <b>space</b> bench</span>
                    <span className={"keysOnly"}><b>q/w/e</b> where · <b>z/x/c</b> how</span>
                    <span className={"keysOnly"}><b>a/s/d/f</b> ordnance</span>
                    {this.props.onCancel && <KgBack label={"Map"} onClick={this.props.onCancel}/>}
                    <button className={"kgPrim" + (this.props.onCancel ? "" : " r")}
                            onClick={this.deploy} disabled={squad.length <= 0}>
                        Deploy {squad.length} ▸
                    </button>
                </KgBar>
                {this.state.sheet >= 0 && this.ordersSheet()}
            </div>);
    }
}
