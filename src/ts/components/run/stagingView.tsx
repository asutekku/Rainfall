import * as React from "react";
import {Actor} from "../../actors/Actor";
import type {Armor} from "../../items/Armor";
import type {Weapon} from "../../items/Weapon";
import {ProfileBadge, ProfileChip} from "../general/profileBadge";
import {KgBack, KgBar, KgModal, KgRow} from "../general/kgKit";
import {PROFILE, profileTally} from "../../interact/profile";
import {ODDS_LABEL, forecastWave, sideStrength} from "../../interact/forecast";
import {Gear} from "../../interact/gear";
import {GetItem} from "../../interact/getItem";
import {GdArmorCard, GdArmorStats, GdCard, GdStats} from "../general/gearDelta";
import {MercFigure} from "../general/mercFigure";
import {Deployment, KIT, KIT_ORDER, KIT_PICKS, Kit, KitId, KitPick, LINES, LINE_ORDER, Line,
    SQUAD_CAP, STANCES, STANCE_ORDER, Stance, lineOf, stanceOf} from "../../interact/loadout";
import {RunController} from "../../interact/runController";
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
    /** which merc's sheet (portrait, stats, orders, loadout) is open (-1: none) */
    sheet: number;
    /** which merc's gear editor is open (-1: none) */
    gear: number;
    /** the gear editor's open tab */
    gearTab: GearTab;
    /** the gear editor's weapon list, unfolded past the top three */
    moreWeapons: boolean;
    /**
     * The gear editor's candidate under inspection — "w3"/"a1" for a weapon or
     * armour row, "" for none. First tap unfolds the head-to-head; the card's
     * own button commits the swap, so a stray thumb can't re-kit anybody.
     */
    pick: string;
}

/**
 * The selection as the engine will read it. One rule, owned by the run
 * controller (fieldable): you first, the able, never more than the seats —
 * this screen and the deploy path can't disagree about who walks in.
 */
function squadFrom(party: Actor[], going: boolean[]): Actor[] {
    return RunController.fieldable(party.filter((_p, i) => going[i]), party);
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

/** The gear editor's tabs — one slot each, plus the crate. */
type GearTab = "weapon" | "body" | "head" | "throw";
const GEAR_TABS: Array<{id: GearTab; label: string}> = [
    {id: "weapon", label: "Weapon"},
    {id: "body", label: "Armour"},
    {id: "head", label: "Head"},
    {id: "throw", label: "Throwables"},
];

/**
 * The minute before the shooting, as a keyed grid.
 *
 * Reads top to bottom in the order you size a fight up: who is out there,
 * who you send, what they carry. A merc's row shows their orders; tapping it
 * opens the merc sheet, where position/stance/bench live at full size. Deploy
 * and the way back to the map sit in the bar, where a thumb already is.
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
            gear: -1,
            gearTab: "weapon",
            moreWeapons: false,
            pick: "",
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
        const gearOpen = this.state.gear >= 0;
        // orders apply to the open editor, or to the keyboard cursor
        const at = gearOpen ? this.state.gear : sheetOpen ? this.state.sheet : this.state.sel;
        const digit = parseInt(k, 10);
        if (k === "escape") {
            if (gearOpen) { this.setState({gear: -1}); }
            else if (sheetOpen) { this.setState({sheet: -1}); }
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
        else if (k === "g") { this.setState({gear: at, gearTab: "weapon", moreWeapons: false, pick: ""}); }
        else if (k === "enter") {
            if (gearOpen) { this.setState({gear: -1}); }
            else if (sheetOpen) { this.setState({sheet: -1}); }
            else { this.deploy(); }
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
        // still walks in, and a returning body takes their share back. The
        // sheet closes — benching is a decision made, back to the list.
        const squad = this.squadOf(going);
        this.setState({going, sheet: -1, picks: this.rebalance(this.reseat(this.state.picks, squad), squad)});
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

    /** Belts full but this merc holds something: their last pick makes room for `item`. */
    private swapOwn = (a: Actor, item: KitId) => {
        const picks = this.state.picks.slice();
        let at = -1;
        picks.forEach((p, idx) => { if (p.carrier === a) { at = idx; } });
        if (at < 0) { return; }
        picks.splice(at, 1);
        const stock = this.props.kit[item] - picks.filter((p) => p.item === item).length;
        if (stock <= 0) { return; }
        picks.push({item, carrier: a});
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

    /** A merc in the squad: orders on the row, everything else in their sheet. */
    private goingRow = (a: Actor, i: number) => {
        const hpPct = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        const you = !a.hireable;
        const sel = this.state.sel === i;
        return (
            <tr key={i} className={sel ? "sel" : ""}
                onClick={() => this.setState({sel: i, sheet: i})}>
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
                <td className={"sub clip kgHideM"} title={a.weapon.name}
                    style={{color: Gear.rarityColor(a.weapon)}}>{a.weapon.name}</td>
                <td><span className={"kgState"}
                          title={`${LINES[this.state.lines[i]!].label} — ${LINES[this.state.lines[i]!].blurb}`}>
                    {LINE_GLYPH[this.state.lines[i]!]}
                </span></td>
                <td><span className={"kgState w"}
                          title={`${STANCES[this.state.stances[i]!].label} — ${STANCES[this.state.stances[i]!].blurb}`}>
                    {STANCE_GLYPH[this.state.stances[i]!]}
                </span></td>
            </tr>);
    };

    /** A merc sitting this one out — their own section, not a greyed row in the squad. */
    private benchedRow = (a: Actor, i: number) => {
        const down = !a.canFight();
        const sel = this.state.sel === i;
        return (
            <tr key={i} className={(sel ? "sel " : "") + "out"}
                onClick={() => { if (!down) { this.setState({sel: i, sheet: i}); } }}>
                <td className={"kgHideM"}><span className={"kgKey kb" + (sel ? " on" : "")}>{i + 1}</span></td>
                <td><b>{a.name}</b></td>
                <td><ProfileBadge unit={a}/></td>
                <td className={"sub kgHideM"}>{a.role.name} L{a.level}</td>
                <td className={"num"}>{Math.max(0, Math.ceil(a.health))}</td>
                <td className={"sub clip kgHideM"} title={a.weapon.name}>{a.weapon.name}</td>
                <td className={"sub"}>{down ? "down" : "tap to brief"}</td>
            </tr>);
    };

    /**
     * One line of orders: the three settings side by side, and one sentence
     * beneath explaining the one that's picked. A row instead of a list —
     * three exclusive settings don't each deserve a shelf.
     */
    private segRow(opts: Array<{id: string; glyph: string; label: string}>, cur: string,
                   blurb: string, pick: (id: string) => void) {
        return (
            <React.Fragment>
                <div className={"kgSeg"}>
                    {opts.map((o) => (
                        <button key={o.id} className={o.id === cur ? "on" : ""} onClick={() => pick(o.id)}>
                            {o.glyph ? <u>{o.glyph}</u> : null}{o.label}
                        </button>))}
                </div>
                <p className={"kgSegTip"}>{blurb}</p>
            </React.Fragment>);
    }

    /**
     * The merc sheet: the body on the left, the numbers on the right, orders
     * and the loadout beneath — one modal for everything about one merc,
     * sized to stand on a phone screen whole.
     */
    private mercSheet() {
        const i = this.state.sheet;
        const a = this.props.party[i];
        if (!a) { return null; }
        const you = !a.hireable;
        const going = this.state.going[i] === true && a.canFight();
        const noSeats = this.squad().length >= SQUAD_CAP;
        const upper = a.equipment.upper;
        const head = a.equipment.headgear;
        const carrying = this.state.picks.filter((p) => p.carrier === a);
        const hpPct = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        return (
            <KgModal title={<React.Fragment>{a.name}{you ? <b>you</b> : null}</React.Fragment>}
                     onClose={() => this.setState({sheet: -1})}>
                <div className={"mercCard"}>
                    <MercFigure actor={a} you={you}/>
                    <dl className={"mercStats"}>
                        <dt>Class</dt>
                        <dd>{a.role.name} L{a.level}</dd>
                        <dt>Skill</dt>
                        <dd className={a.classTraining(a.weapon) ? "clsInk" : ""}
                            title={"+5% damage per level with the " + a.weapon.name.toLowerCase()}>
                            {a.weapon.skill === "Melee Weapon" ? "Melee" : a.weapon.skill} {a.skillFor(a.weapon)}
                            {a.classTraining(a.weapon) ? <i className={"clsTag"}>class</i> : null}
                        </dd>
                        <dt>HP</dt>
                        <dd><span className={"kgHp"}>
                            <i className={hpPct <= 25 ? "cr" : hpPct <= 60 ? "lo" : ""} style={{width: hpPct + "%"}}/>
                        </span>{Math.max(0, Math.ceil(a.health))}/{a.maxHealth}</dd>
                        <dt>Body</dt>
                        <dd>{upper ? `SP ${upper.stoppingPower}` : "SP 0"}</dd>
                        <dt>Head</dt>
                        <dd>{head ? `SP ${head.stoppingPower}` : "SP 0"}</dd>
                    </dl>
                </div>
                {!you &&
                    <KgRow label={going ? "Going" : "Benched"} on={going}
                           danger={!going && !a.canFight()}
                           disabled={!a.canFight() || (!going && noSeats)}
                           value={!a.canFight() ? "down" : going ? "tap to bench"
                               : noSeats ? `only ${SQUAD_CAP} walk in` : "tap to bring"}
                           onClick={() => this.toggleGoing(i)}/>}
                {going && <React.Fragment>
                    <div className={"kgOrder"}>
                        <h3 className={"kgH"}>Position <em className={"keysOnly"}>q/w/e</em></h3>
                        {this.segRow(
                            // no glyph: P/M/O would just repeat the label's first letter
                            LINE_ORDER.map((l) => ({id: l, glyph: "", label: LINES[l].label})),
                            this.state.lines[i]!, LINES[this.state.lines[i]!].blurb,
                            (l) => this.setLine(i, l as Line))}
                    </div>
                    <div className={"kgOrder"}>
                        <h3 className={"kgH"}>Stance <em className={"keysOnly"}>z/x/c</em></h3>
                        {this.segRow(
                            STANCE_ORDER.map((st) => ({id: st, glyph: STANCE_GLYPH[st], label: STANCES[st].label})),
                            this.state.stances[i]!, STANCES[this.state.stances[i]!].blurb,
                            (st) => this.setStance(i, st as Stance))}
                    </div>
                </React.Fragment>}
                <div className={"kgOrder"}>
                    <h3 className={"kgH"}>Loadout</h3>
                    <div className={"kgRollBody"}>
                        <span className={"kgGearItem"}>
                            <i>Weapon</i>
                            <b style={{color: Gear.rarityColor(a.weapon)}}>{a.weapon.name}</b>
                            <em>{Gear.weaponLine(a.weapon)}</em>
                        </span>
                        <span className={"kgGearItem"}>
                            <i>Armour</i>
                            {upper ? <b style={{color: Gear.rarityColor(upper)}}>{upper.name}</b>
                                : <b className={"dim"}>none</b>}
                            {upper ? <em>SP {upper.stoppingPower}</em> : null}
                        </span>
                        <span className={"kgGearItem"}>
                            <i>Head</i>
                            {head ? <b style={{color: Gear.rarityColor(head)}}>{head.name}</b>
                                : <b className={"dim"}>none</b>}
                            {head ? <em>SP {head.stoppingPower}</em> : null}
                        </span>
                        <span className={"kgGearItem"}>
                            <i>Throwables</i>
                            <b>{carrying.length
                                ? carrying.map((p) => `${KIT[p.item].glyph} ${KIT[p.item].label}`).join(" · ")
                                : "—"}</b>
                        </span>
                        <button className={"kgBack"}
                                onClick={() => this.setState({gear: i, gearTab: "weapon", moreWeapons: false, pick: ""})}>
                            ⚙ Edit loadout
                        </button>
                    </div>
                </div>
            </KgModal>);
    }

    /**
     * The gear editor: one slot per tab — weapon, armour, head, throwables.
     * Each tab reads top-down: what's equipped, then the inventory to draw
     * from. Tapping a candidate slides the head-to-head open under it at the
     * row's own width; only the card's button commits a swap.
     */
    private gearSheet() {
        const i = this.state.gear;
        const a = this.props.party[i];
        if (!a) { return null; }
        const tab = this.state.gearTab;
        return (
            <KgModal title={<React.Fragment>{a.name} <b>Gear</b></React.Fragment>}
                     onClose={() => this.setState({gear: -1, pick: ""})}>
                <div className={"kgTabs"}>
                    {GEAR_TABS.map((t) => (
                        <button key={t.id} className={"kgTab" + (tab === t.id ? " on" : "")}
                                onClick={() => this.setState({gearTab: t.id, pick: "", moreWeapons: false})}>
                            {t.label}
                        </button>))}
                </div>
                {tab === "weapon" && this.weaponTab(a)}
                {tab === "body" && this.armorTab(a, false)}
                {tab === "head" && this.armorTab(a, true)}
                {tab === "throw" && this.throwTab(a, i)}
            </KgModal>);
    }

    /** One weapon candidate: the row, and the head-to-head when picked. */
    private weaponRow(a: Actor, w: Weapon, key: string, label: string) {
        const chrome = Gear.isCyberweapon(a, w);
        const picked = this.state.pick === key;
        return (
            <React.Fragment key={key}>
                <KgRow glyph={chrome ? "⌁" : Gear.VERDICT_GLYPH[Gear.verdict(a.weapon, w, a)]}
                       kicker={w.name === "Fists" ? "unarmed" : (chrome ? "chrome · " : "") + w.weaponType}
                       label={label} on={picked} labelStyle={{color: Gear.rarityColor(w)}}
                       sub={<GdStats a={a} cur={a.weapon} w={w}/>}
                       onClick={() => this.setState({pick: picked ? "" : key})}/>
                {picked &&
                    <GdCard a={a} cur={a.weapon} w={w}
                            act={w.name === "Fists" ? "Go bare-knuckle" : `Swap to the ${w.name}`}
                            onAct={() => {
                                if (w.name === "Fists") { Gear.equipFists(a); } else { Gear.equipWeapon(a, w); }
                                this.setState({pick: ""});
                            }}/>}
            </React.Fragment>);
    }

    private weaponTab(a: Actor) {
        const pack = Gear.stackedWeapons(a);
        const shown = this.state.moreWeapons ? pack : pack.slice(0, 3);
        const hidden = pack.length - 3;
        const fists = a.weapon.name !== "Fists";
        return (
            <React.Fragment>
                <h3 className={"kgH"}>Equipped</h3>
                <div className={"kgChoice"}>
                    <KgRow glyph={"✦"} kicker={a.weapon.weaponType} label={a.weapon.name} on
                           labelStyle={{color: Gear.rarityColor(a.weapon)}}
                           sub={<GdStats a={a} w={a.weapon}/>}/>
                </div>
                <h3 className={"kgH"}>Inventory <em>tap to compare</em></h3>
                <div className={"kgChoice"}>
                    {fists && this.weaponRow(a, GetItem.weapon("Fists"), "f", "Fists")}
                    {shown.map((s, idx) =>
                        this.weaponRow(a, s.item, "w" + idx, s.n > 1 ? `${s.item.name} ×${s.n}` : s.item.name))}
                    {hidden > 0 &&
                        <KgRow glyph={this.state.moreWeapons ? "▴" : "▾"}
                               label={this.state.moreWeapons ? "Show less" : `Show ${hidden} more`}
                               onClick={() => this.setState({moreWeapons: !this.state.moreWeapons, pick: ""})}/>}
                    {!pack.length && !fists &&
                        <p className={"kgP dim"}>Nothing in The Stash — hit a Black Market.</p>}
                </div>
            </React.Fragment>);
    }

    /** Body plate or headgear — the same sheet, filtered to the slot. */
    private armorTab(a: Actor, headSlot: boolean) {
        const worn = (headSlot ? a.equipment.headgear : a.equipment.upper) as Armor | null;
        const list = Gear.stackedArmor(a)
            .filter((s) => (s.item.bodyPart === "headgear") === headSlot)
            .sort((x, y) => (y.item.rarity || 0) - (x.item.rarity || 0)
                || y.item.stoppingPower - x.item.stoppingPower);
        const slot = headSlot ? "head" : "body";
        return (
            <React.Fragment>
                <h3 className={"kgH"}>Equipped</h3>
                <div className={"kgChoice"}>
                    {worn
                        ? <KgRow glyph={headSlot ? "◠" : "▣"} kicker={slot} label={worn.name} on
                                 labelStyle={{color: Gear.rarityColor(worn)}}
                                 sub={<GdArmorStats piece={worn}/>}/>
                        : <KgRow glyph={headSlot ? "◠" : "▣"} kicker={slot} label={"Nothing worn"}
                                 sub={<span className={"gdStats"}><i className={"gdStat"}>SP 0</i></span>}/>}
                </div>
                <h3 className={"kgH"}>Inventory <em>tap to compare</em></h3>
                <div className={"kgChoice"}>
                    {list.map((s, idx) => {
                        const piece = s.item;
                        const key = "a" + idx;
                        const picked = this.state.pick === key;
                        return (
                            <React.Fragment key={key}>
                                <KgRow kicker={slot} label={s.n > 1 ? `${piece.name} ×${s.n}` : piece.name}
                                       on={picked} labelStyle={{color: Gear.rarityColor(piece)}}
                                       sub={<GdArmorStats a={a} piece={piece}/>}
                                       onClick={() => this.setState({pick: picked ? "" : key})}/>
                                {picked &&
                                    <GdArmorCard a={a} piece={piece} act={`Wear the ${piece.name}`}
                                                 onAct={() => { Gear.equipArmor(a, piece); this.setState({pick: ""}); }}/>}
                            </React.Fragment>);
                    })}
                    {!list.length &&
                        <p className={"kgP dim"}>Nothing in The Stash for this slot.</p>}
                </div>
            </React.Fragment>);
    }

    private throwTab(a: Actor, i: number) {
        const going = this.state.going[i] === true && a.canFight();
        const picks = this.state.picks;
        const mine = (item: KitId) => picks.filter((p) => p.item === item && p.carrier === a).length;
        const full = picks.length >= KIT_PICKS;
        return (
            <React.Fragment>
                <h3 className={"kgH"}>Throwables
                    <b>{picks.length}/{KIT_PICKS}</b><em>crew-wide, out per job</em></h3>
                {going
                    ? <div className={"kgChoice"}>
                        {KIT_ORDER.filter((item) => this.props.kit[item] > 0 || mine(item) > 0).map((item) => {
                            const spec = KIT[item];
                            const n = mine(item);
                            const holds = picks.some((p) => p.carrier === a);
                            // full belts aren't a wall: your own pick makes room
                            const canTake = this.left(item) > 0 && (!full || holds);
                            return (
                                <KgRow key={item} glyph={spec.glyph}
                                       label={`${spec.label}${n > 1 ? ` ×${n}` : ""}`}
                                       on={n > 0} disabled={n === 0 && !canTake}
                                       title={`${spec.blurb} — ${spec.when}`}
                                       value={n > 0 ? "carrying — tap to stow"
                                           : this.left(item) <= 0 ? "a teammate has it"
                                           : !full ? `${this.left(item)} in crate`
                                           : holds ? "tap to swap" : "belts full"}
                                       onClick={() => n > 0 ? this.stow(a, item)
                                           : full ? this.swapOwn(a, item) : this.give(a, item)}/>);
                        })}
                    </div>
                    : <p className={"kgP dim"}>Benched — throwables ride on the squad.</p>}
            </React.Fragment>);
    }

    // -------------------------------------------------------------- the kit --

    public override render() {
        const {party, pending} = this.props;
        const squad = this.squad();
        // The verdict reads the squad, not the payroll: benching somebody has
        // to be visible as a worse fight, or the choice is being made blind.
        const fc = forecastWave(squad, this.props.enemies);
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
                            <em>tap a merc to brief</em></h3>
                        <table className={"kgTable tap"}>
                            <thead><tr>
                                <th className={"kgHideM"}/><th>Merc</th><th/><th className={"kgHideM"}>Class</th>
                                <th className={"num"}>HP</th><th className={"kgHideM"}>Weapon</th>
                                <th>Pos</th><th>Stance</th>
                            </tr></thead>
                            <tbody>{party.map((a, i) =>
                                this.state.going[i] && a.canFight() ? this.goingRow(a, i) : null)}</tbody>
                        </table>
                        {party.some((a, i) => !this.state.going[i] || !a.canFight()) &&
                            <React.Fragment>
                                <h3 className={"kgH kgBench"}>Benched
                                    <em>sitting this one out</em></h3>
                                <table className={"kgTable tap"}>
                                    <tbody>{party.map((a, i) =>
                                        !this.state.going[i] || !a.canFight() ? this.benchedRow(a, i) : null)}</tbody>
                                </table>
                            </React.Fragment>}
                    </div>
                </div>
                <KgBar>
                    <span className={"keysOnly"}><b>1–{party.length}</b> merc · <b>space</b> bench</span>
                    <span className={"keysOnly"}><b>q/w/e</b> position · <b>z/x/c</b> stance</span>
                    <span className={"keysOnly"}><b>g</b> gear</span>
                    {this.props.onCancel && <KgBack label={"Map"} onClick={this.props.onCancel}/>}
                    <button className={"kgPrim" + (this.props.onCancel ? "" : " r")}
                            onClick={this.deploy} disabled={squad.length <= 0}>
                        Deploy {squad.length} ▸
                    </button>
                </KgBar>
                {this.state.sheet >= 0 && this.mercSheet()}
                {this.state.gear >= 0 && this.gearSheet()}
            </div>);
    }
}
