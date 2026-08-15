import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Battlefield, Point} from "../../interact/battlefield";
import {rangeDV} from "../../interact/rangeTable";
import {aimPreview} from "../../interact/aimPreview";
import {RunNode, RunState} from "../../interact/runMap";
import {MainPanel} from "../mainPanel";
import {IsoMap} from "./isoMap";
import {BattleScene, OrderCtx, PlaybackBundle} from "./battleScene";
import {CityMap} from "../run/cityMap";

export interface StageProps {
    actor: Actor;
    enemy: Actor;
    party: Actor[];
    enemies: Actor[];
    view: string;
    screen: string;
    run: RunState | null;
    messages: any;
    auto: boolean;
    battleId: number;
    playback: PlaybackBundle | null;
    orders: OrderCtx | null;
    turnOrder: Actor[];
    onNotice: (msg: any) => void;
    onSelectAlly: (a: Actor) => void;
    onSelectEnemy: (a: Actor) => void;
    onGotoCombat: () => void;
    onPickNode: (node: RunNode) => void;
    onPlaybackDone: (id: number) => void;
    onPickMove: (p: Point) => void;
    onClearMove: () => void;
    onPickTarget: (a: Actor) => void;
    onToggleAim: () => void;
    onExecute: () => void;
    onPass: () => void;
    onToggleAuto: () => void;
}

/**
 * The centre stage. Between fights it shows the holographic city map; in a
 * fight it shows the 3D street arena. Turns resolve one unit at a time: AI
 * turns play back as animations, and when a squad member set to manual comes
 * up the bottom bar switches to XCOM-style orders (move / target / aimed shot
 * / execute), with the street itself as the input surface.
 */
export class Stage extends React.Component<StageProps, {}> {

    private static TEMPER: { [k: string]: [string, string] } = {
        aggressive: ["AGGRO", "t-aggro"],
        berserker: ["RUSH", "t-rush"],
        flanker: ["FLANK", "t-flank"],
        camper: ["CAMP", "t-camp"],
        balanced: ["STEADY", "t-steady"],
    };

    private enemyArmor(a: Actor): number {
        const sp = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
        return Math.max(sp, a.cyberSP());
    }

    private strip = (e: Actor, i: number) => {
        const hpPct = Math.max(0, Math.min(100, (e.health / Math.max(1, e.maxHealth)) * 100));
        const orders = this.props.orders;
        const active = orders && orders.target ? e === orders.target : e.name === this.props.enemy.name;
        const shooter = orders ? orders.actor : this.props.actor;
        const dist = Math.round(Battlefield.distance(shooter, e));
        const cls = shooter.weapon.weaponClass;
        const outOfRange = cls !== "melee" && rangeDV(cls, dist) === null;
        const temper = Stage.TEMPER[e.temperament] || Stage.TEMPER["balanced"]!;
        const sub = e.faction ? `${e.faction}${e.archetype ? " " + e.archetype : ""}` : e.role.name;
        return (
            <button key={i} className={"es" + (active ? " on" : "") + (e.canFight() ? "" : " dead")}
                    onClick={() => this.props.onSelectEnemy(e)}>
                <span className={"d rank-" + (e.rank || 1)} title={"threat rank " + (e.rank || 1)}>✦</span>
                <span className={"nm"}>{e.name} <span className={"lv"}>{sub} · L{e.level}</span></span>
                <span className={"temp " + temper[1]} title={"AI temperament"}>{temper[0]}</span>
                <span className={"bar hp"}><i style={{width: hpPct + "%"}}/></span>
                <span className={"rng" + (outOfRange ? " oor" : "")}>{dist}m</span>
                <span className={"sp"}>SP {this.enemyArmor(e)}</span>
            </button>);
    };

    /** Initiative queue chips: whose turn it is, and who's up next. */
    private turnChips() {
        const order = this.props.turnOrder;
        if (!order.length) { return null; }
        return (
            <div className={"turnRow"}>
                <span className={"trLabel"}>INITIATIVE</span>
                {order.slice(0, 8).map((a, i) => {
                    const foe = this.props.enemies.indexOf(a) >= 0;
                    const dead = !a.canFight();
                    return <span key={i}
                                 className={"tc" + (foe ? " foe" : " pal") + (i === 0 ? " now" : "") + (dead ? " out" : "")}>
                        {foe ? "✦" : "◈"} {a.name.split(" ")[0]}
                    </span>;
                })}
            </div>);
    }

    /** XCOM-style order bar for the unit awaiting commands. */
    private orderBar(o: OrderCtx) {
        const target = o.target && o.target.canFight() ? o.target : null;
        const prev = target ? aimPreview(o.actor, target, o.pendingMove || undefined, o.aimed) : null;
        const w = o.actor.weapon;
        const canAim = !!target && !w.autofire && w.weaponClass !== "melee";
        const pctCls = prev && prev.ok ? (prev.pct >= 60 ? "hi" : prev.pct >= 30 ? "mid" : "lo") : "lo";
        return (
            <div className={"acts orderActs"}>
                <span className={"ordWho"}>◈ {o.actor.name}</span>
                <button className={"ob" + (o.pendingMove ? " set" : "")}
                        title={o.pendingMove ? "clear the planned move" : "tap the street to set a move"}
                        onClick={this.props.onClearMove} disabled={!o.pendingMove}>
                    {o.pendingMove ? "⊹ MOVE SET ✕" : "⊹ TAP STREET TO MOVE"}
                </button>
                <span className={"ordTgt" + (target ? " has" : "")}>
                    {target
                        ? <React.Fragment>✦ {target.name} {prev && (prev.ok
                            ? <b className={"pct " + pctCls}>{prev.pct}%</b>
                            : <b className={"pct lo"}>NO SHOT</b>)}{prev && prev.covered ? <i className={"covTag"}> COVER</i> : null}</React.Fragment>
                        : "✦ TAP A HOSTILE TO TARGET"}
                </span>
                {canAim &&
                    <button className={"ob" + (o.aimed ? " set" : "")} onClick={this.props.onToggleAim}
                            title={"Aimed head shot: -8 to hit, double damage through head armour"}>◎ AIM</button>}
                <button className={"ob go"} onClick={this.props.onExecute}
                        disabled={!o.pendingMove && !target}>▶ EXECUTE</button>
                <button className={"ob"} onClick={this.props.onPass} title={"do nothing this turn"}>SKIP</button>
                <button className={"ob"} onClick={this.props.onToggleAuto} title={"let the AI play the whole squad"}>▸ AUTO</button>
            </div>);
    }

    private statusBar() {
        const w = this.props.actor.weapon;
        const active = this.props.turnOrder[0];
        return (
            <div className={"autoStatus"}>
                <span className={"autoDot"}>▸</span> {this.props.auto ? "AUTO" : "RESOLVING"}
                {active ? <span className={"nowTurn"}> — {active.name}'s turn</span> : null}
                <button className={"ob slim"} onClick={this.props.onToggleAuto}>
                    {this.props.auto ? "❚❚ TAKE CONTROL" : "▸ AUTO"}
                </button>
                <span className={"wpn"}>
                    <b>{w.name}</b> · {w.diceThrows}d6{w.damage ? "+" + w.damage : ""}
                    {w.ap ? " AP" : ""}{w.autofire ? " · AUTO" : ""}
                </span>
            </div>);
    }

    public override render() {
        const combat = this.props.view === "Combat";
        // Between fights, the "combat" view is the holographic city map.
        if (combat && this.props.screen === "map" && this.props.run) {
            return <CityMap run={this.props.run} party={this.props.party} onPick={this.props.onPickNode}/>;
        }
        const inFight = combat && this.props.screen === "combat";
        const orders = this.props.orders;
        const activeName = orders ? orders.actor.name
            : this.props.turnOrder.length ? this.props.turnOrder[0]!.name : undefined;
        return (
            <section id={"stage"}>
                {inFight && <div className={"strips"}>{this.props.enemies.map(this.strip)}</div>}

                {inFight ? (
                    <div className={"arena"}>
                        <BattleScene party={this.props.party} enemies={this.props.enemies}
                                     battleId={this.props.battleId}
                                     playback={this.props.playback}
                                     onPlaybackDone={this.props.onPlaybackDone}
                                     orders={orders}
                                     onPickMove={this.props.onPickMove}
                                     onPickTarget={this.props.onPickTarget}
                                     speed={this.props.auto ? 1.6 : 1}
                                     activeName={activeName}/>
                    </div>
                ) : (
                    <React.Fragment>
                        <div className={"viewwrap"}>
                            <MainPanel activeView={this.props.view} currentActor={this.props.actor}
                                       party={this.props.party} messages={this.props.messages}
                                       onNotice={this.props.onNotice}/>
                        </div>
                        <div className={"minimap"} title={"Return to combat"} onClick={this.props.onGotoCombat}>
                            <IsoMap party={this.props.party} enemies={this.props.enemies} mini={true}/>
                            <span className={"minimapHint"}>◤ TACTICAL — click to engage</span>
                        </div>
                    </React.Fragment>
                )}

                {inFight && (
                    <div className={"stageActions"}>
                        {this.turnChips()}
                        {orders ? this.orderBar(orders) : this.statusBar()}
                    </div>
                )}
            </section>);
    }
}
