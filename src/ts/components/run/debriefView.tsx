import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Merc} from "../../actors/Merc";
import {BattleReport, CombatantTally, GearChange, LootItem} from "../../interact/battleReport";

export interface DebriefViewProps {
    report: BattleReport;
    sector: number;
    canRevive: boolean;
    funds: number;
    onClaim: (id: string) => void;
    onSell: (id: string) => void;
    onAutoKit: () => void;
    onBuyout: (name: string) => void;
    onContinue: () => void;
    onRevive: () => void;
}

const pct = (n: number, max: number): number => Math.max(0, Math.min(100, (n / Math.max(1, max)) * 100));

/**
 * The after-action report shown between a finished fight and the city map.
 *
 * It surfaces only what the player can't already see: how the squad came out,
 * the payday, and what came off the bodies. Anything the fight itself already
 * told you (a hostile roster you just watched die, squad totals that are the
 * sum of the rows right below them) is left out, which is what keeps the whole
 * report inside a phone screen. Salvage is claimed here — whatever is left when
 * the player moves on gets auto-kitted, so Continue matches the old flow.
 */
export class DebriefView extends React.Component<DebriefViewProps, {}> {

    public override componentDidMount() {
        window.addEventListener("keydown", this.onKey);
    }

    public override componentWillUnmount() {
        window.removeEventListener("keydown", this.onKey);
    }

    /**
     * Enter / Space moves on — the fight resolved itself, so should the paperwork.
     * Suppressed while a revive is on offer: accepting a wipe by stray keypress
     * would throw the run away.
     */
    private onKey = (e: KeyboardEvent) => {
        if (this.props.canRevive) { return; }
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.props.onContinue();
        }
    };

    private member = (t: CombatantTally, i: number) => {
        const acc = t.shots > 0 ? Math.round((t.hits / t.shots) * 100) : 0;
        const lost = Math.max(0, t.hpBefore - t.hpAfter);
        return (
            <li key={i} className={"dbMember" + (t.down ? " down" : "")}>
                <div className={"dbWho"}>
                    <b>{t.name}</b>
                    <span className={"dbRole"}>{t.role} · L{t.level}</span>
                    {t.levelsGained > 0 && <span className={"dbLevelUp"}>LEVEL UP ×{t.levelsGained}</span>}
                    {t.down && <span className={"dbDown"}>DOWN</span>}
                </div>
                <div className={"dbBars"}>
                    <span className={"dbBar hp"} title={`HP ${t.hpAfter} / ${t.maxHp} (−${lost} this fight)`}>
                        <i style={{width: pct(t.hpAfter, t.maxHp) + "%"}}/>
                        <u style={{width: pct(lost, t.maxHp) + "%"}}/>
                    </span>
                    <span className={"dbBarVal"}>{Math.max(0, t.hpAfter)}/{t.maxHp}</span>
                    <span className={"dbBarVal xp"} title={`${t.xp} / ${t.maxXp} to next level`}>
                        +{t.xpGained} XP
                    </span>
                </div>
                <div className={"dbTallies"}>
                    <span><i>DMG</i><b>{t.damageDealt}</b></span>
                    <span><i>Acc</i><b>{acc}%</b><em>{t.hits}/{t.shots}</em></span>
                    <span><i>Kills</i><b>{t.kills}</b></span>
                </div>
            </li>);
    };

    private loot = (l: LootItem) => {
        const held = l.fate === "held";
        return (
            <li key={l.id} className={"dbLoot" + (l.rare ? " rare" : "") + (held ? "" : " taken")}>
                <span className={"dbLootIcon"}>{l.kind === "weapon" ? "⌖" : "⛊"}</span>
                <span className={"dbLootName"}>{l.rare ? "★ " : ""}{l.name}</span>
                <span className={"dbLootDetail"}>{l.detail}</span>
                <span className={"dbLootOwner"}>found by {l.owner.name}</span>
                {held ? (
                    <span className={"dbLootActs"}>
                        <button onClick={() => this.props.onClaim(l.id)}>Equip</button>
                        <button onClick={() => this.props.onSell(l.id)}>Fence</button>
                    </span>
                ) : (
                    <span className={"dbLootFate"}>{l.fate === "sold" ? "FENCED" : "EQUIPPED"}</span>
                )}
            </li>);
    };

    private gear = (c: GearChange, i: number) => (
        // What it replaced is already implied by the delta, so the row only
        // carries who, what they're holding now, and what it cost.
        <li key={i} className={"dbGear " + c.source}>
            <span className={"dbGearIcon"} title={c.source === "salvage" ? "scavenged" : "bought"}>⚒</span>
            <span className={"dbGearWho"}>{c.actorName}</span>
            <span className={"dbGearName"}>{c.to}</span>
            <span className={"dbGearDetail"}>{c.detail}</span>
            <span className={"dbGearDelta" + (c.delta > 0 ? " up" : "")}>
                {c.delta > 0 ? "+" + c.delta : c.delta}{c.slot === "armor" ? " SP" : " dmg"}
            </span>
            <span className={"dbGearCost"}>{c.cost > 0 ? "−" + c.cost + "¥" : "free"}</span>
        </li>);

    /**
     * A downed merc bleeds out when the crew moves on. The buyout is the only
     * thing on this screen that can't be undone by walking away, so it gets a
     * price and a name rather than a quiet line in the feed.
     */
    private casualty = (a: Actor, i: number) => {
        const cost = a instanceof Merc ? a.buyoutCost() : 400;
        return (
            <li key={i} className={"dbCasualty"}>
                <span className={"dbCasIcon"}>✚</span>
                <span className={"dbCasName"}>{a.name}</span>
                <span className={"dbCasRole"}>{a.role.name} · L{a.level}</span>
                <button disabled={this.props.funds < cost}
                        title={this.props.funds < cost ? "Not enough eddies" : "Trauma Team pickup"}
                        onClick={() => this.props.onBuyout(a.name)}>{cost}¥</button>
            </li>);
    };

    public override render() {
        const r = this.props.report;
        const won = r.outcome === "victory";
        const held = r.loot.filter((l) => l.fate === "held");
        const down = r.hostiles.filter((h) => h.killed).length;
        const payday = r.eddies + r.fenced;
        return (
            <div className={"debrief " + (won ? "win" : "lose")}>
                <div className={"debriefCard"}>
                    <div className={"debriefHead"}>
                        <h1>{won ? "ENGAGEMENT CLEAR" : "SQUAD DOWN"}</h1>
                        <p className={"debriefSub"}>
                            {r.nodeLabel} · {won ? down : `${down} of ${r.hostiles.length}`} down
                            {" · "}{r.rounds} round{r.rounds === 1 ? "" : "s"} · sector {this.props.sector}
                        </p>
                    </div>

                    <div className={"debriefCols"}>
                        <div className={"debriefBlock"}>
                            <h2>Squad</h2>
                            <ul className={"dbMembers" + (r.party.length > 2 ? " dense" : "")}>{r.party.map(this.member)}</ul>
                        </div>

                        <div className={"debriefBlock"}>
                            {r.casualties.length > 0 &&
                                <div className={"dbCasualties"}>
                                    <h2>Bleeding out</h2>
                                    <ul>{r.casualties.map(this.casualty)}</ul>
                                    <p className={"dbEmpty"}>Left unpaid, they don't get up.</p>
                                </div>}
                            <h2>Take <b className={"dbPayday"}>{payday}¥</b>
                                {r.fenced > 0 && <em className={"dbFenced"}>{r.fenced}¥ fenced</em>}</h2>
                            {r.loot.length > 0
                                ? <ul className={"dbLoots"}>{r.loot.map(this.loot)}</ul>
                                : <p className={"dbEmpty"}>Nothing worth carrying off the bodies.</p>}
                            {r.gear.length > 0 &&
                                <ul className={"dbGears"}>
                                    {r.gear.map(this.gear)}
                                    {/* phones show the first few and count the rest — see style.css */}
                                    {r.gear.length > 3 &&
                                        <li className={"dbGearMore"}>+{r.gear.length - 3} more fitted</li>}
                                </ul>}
                            {won && !r.kitted &&
                                <button className={"dbKit"} onClick={this.props.onAutoKit}>
                                    ⚒ Auto-kit squad{held.length > 0 ? ` (uses ${held.length} salvaged)` : ""} — spends eddies
                                </button>}
                        </div>
                    </div>

                    <div className={"debriefActions"}>
                        {this.props.canRevive &&
                            <button onClick={this.props.onRevive}>✚ Call Trauma Team — revive (one per run)</button>}
                        <button className={"prim"} onClick={this.props.onContinue}>
                            {won ? "Continue ▸" : "Accept fate ▸"}
                        </button>
                    </div>
                </div>
            </div>);
    }
}
