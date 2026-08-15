import * as React from "react";
import {BattleReport, CombatantTally, GearChange, HostileEntry, LootItem} from "../../interact/battleReport";

export interface DebriefViewProps {
    report: BattleReport;
    depth: number;
    canRevive: boolean;
    onClaim: (id: string) => void;
    onSell: (id: string) => void;
    onAutoKit: () => void;
    onContinue: () => void;
    onRevive: () => void;
}

const pct = (n: number, max: number): number => Math.max(0, Math.min(100, (n / Math.max(1, max)) * 100));

/**
 * The after-action report shown between a finished fight and the city map.
 * It reads the sealed `BattleReport`: who was on the field, how the squad
 * performed, what the payday was, and what came off the bodies. Salvage is
 * claimed here — anything left when the player moves on is auto-kitted by the
 * fixer, so hitting Continue immediately behaves exactly like the old flow.
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

    private hostile = (h: HostileEntry, i: number) => (
        <li key={i} className={"dbHostile" + (h.killed ? " down" : "")}>
            <span className={"dbRank rank-" + h.rank} title={"threat rank " + h.rank}>✦</span>
            <span className={"dbHName"}>{h.name}</span>
            <span className={"dbHMeta"}>{h.label} · L{h.level}</span>
            <span className={"dbHState"}>{h.killed ? "NEUTRALISED" : "STILL UP"}</span>
        </li>);

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
                    <span className={"dbBar xp"} title={`XP ${t.xp} / ${t.maxXp}`}>
                        <i style={{width: pct(t.xp, t.maxXp) + "%"}}/>
                    </span>
                    <span className={"dbBarVal"}>+{t.xpGained} XP</span>
                </div>
                <div className={"dbTallies"}>
                    <span><i>DMG</i><b>{t.damageDealt}</b></span>
                    <span><i>Taken</i><b>{t.damageTaken}</b></span>
                    <span><i>Acc</i><b>{acc}%</b></span>
                    <span><i>Shots</i><b>{t.hits}/{t.shots}</b></span>
                    <span><i>Kills</i><b>{t.kills}</b></span>
                    <span><i>Eddies</i><b>{t.eddies}¥</b></span>
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
        <li key={i} className={"dbGear " + c.source}>
            <span className={"dbGearWho"}>{c.actorName}</span>
            <span className={"dbGearSwap"}>{c.from} <em>▸</em> <b>{c.to}</b></span>
            <span className={"dbGearDetail"}>{c.detail}</span>
            <span className={"dbGearDelta" + (c.delta > 0 ? " up" : "")}>
                {c.delta > 0 ? "+" + c.delta : c.delta}{c.slot === "armor" ? " SP" : " dmg"}
            </span>
            <span className={"dbGearCost"}>{c.cost > 0 ? "−" + c.cost + "¥" : "salvage"}</span>
        </li>);

    public override render() {
        const r = this.props.report;
        const won = r.outcome === "victory";
        const held = r.loot.filter((l) => l.fate === "held");
        return (
            <div className={"debrief " + (won ? "win" : "lose")}>
                <div className={"debriefCard"}>
                    <div className={"debriefHead"}>
                        <span className={"debriefTag"}>After-action report</span>
                        <h1>{won ? "ENGAGEMENT CLEAR" : "SQUAD DOWN"}</h1>
                        <p className={"debriefSub"}>
                            {r.nodeLabel} · {r.rounds} round{r.rounds === 1 ? "" : "s"} · sector {this.props.depth + 1}
                        </p>
                    </div>

                    <div className={"debriefTotals"}>
                        <span><i>Payday</i><b>{r.eddies + r.fenced}¥</b></span>
                        <span><i>XP</i><b>{r.xp}</b></span>
                        <span><i>Kills</i><b>{r.kills}/{r.hostiles.length}</b></span>
                        <span><i>Damage</i><b>{r.damageDealt}</b></span>
                        <span><i>Taken</i><b>{r.damageTaken}</b></span>
                    </div>

                    <div className={"debriefCols"}>
                        <div className={"debriefBlock"}>
                            <h2>Squad</h2>
                            <ul className={"dbMembers"}>{r.party.map(this.member)}</ul>
                        </div>

                        <div className={"debriefBlock"}>
                            <h2>Contacts</h2>
                            <ul className={"dbHostiles"}>{r.hostiles.map(this.hostile)}</ul>

                            <h2>Salvage</h2>
                            {r.loot.length > 0
                                ? <ul className={"dbLoots"}>{r.loot.map(this.loot)}</ul>
                                : <p className={"dbEmpty"}>Nothing worth carrying off the bodies.</p>}

                            <h2>Requisition</h2>
                            {r.gear.length > 0 && <ul className={"dbGears"}>{r.gear.map(this.gear)}</ul>}
                            {won && !r.kitted &&
                                <button className={"dbKit"} onClick={this.props.onAutoKit}>
                                    ⚒ Auto-kit squad{held.length > 0 ? ` (uses ${held.length} salvaged)` : ""} — spends eddies
                                </button>}
                            {r.kitted && r.gear.length === 0 && <p className={"dbEmpty"}>No upgrades within budget.</p>}
                            {!won && r.gear.length === 0 && <p className={"dbEmpty"}>No one left standing to kit out.</p>}
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
