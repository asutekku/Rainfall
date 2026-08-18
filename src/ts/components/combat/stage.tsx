import * as React from "react";
import {Actor} from "../../actors/Actor";
import {accentCss} from "../../actors/resources/factionStyles";
import {Battlefield} from "../../interact/battlefield";
import {outOfRange} from "../../interact/damageModel";
import {RunNode, RunState} from "../../interact/runMap";
import {MainPanel} from "../mainPanel";
import {BattleNotice, BattleScene, PlaybackBundle} from "./battleScene";
import {BattleHud} from "./battleHud";
import {UnitCard} from "./unitCard";
import {ShownState} from "../../interact/shownState";
import {CityMap} from "../run/cityMap";

export interface StageProps {
    actor: Actor;
    /** The payroll — what the map and the character panels are about. */
    party: Actor[];
    /** Who is on the street: the payroll minus whoever was benched at staging. */
    squad: Actor[];
    enemies: Actor[];
    view: string;
    screen: string;
    run: RunState | null;
    messages: any;
    battleId: number;
    playback: PlaybackBundle | null;
    turnOrder: Actor[];
    /** Fight clock: which round is resolving, and how many are left to survive on a holdout. */
    round: number;
    holdLeft: number;
    /** The unit whose card is open, if any. */
    inspecting: Actor | null;
    /** Health as the board is drawing it — see shownState.ts. */
    shown: ShownState;
    /** A fight-level announcement for the board (reinforcements, revive). */
    notice: BattleNotice | null;
    onNotice: (msg: any) => void;
    /** Open (or close, with null) a unit's card — what a HUD row tap means now. */
    onInspect: (a: Actor | null) => void;
    onImpact: (target: Actor, damage: number) => void;
    onMend: (target: Actor, hp: number) => void;
    onPickNode: (node: RunNode) => void;
    onPlaybackDone: (id: number) => void;
}

/**
 * The centre stage. Between fights it shows the holographic city map; in a
 * fight it shows the 3D street arena and resolves turns one unit at a time,
 * every one of them played by the tactical AI. Nothing here takes orders —
 * the board is a thing to read, so everything on it earns its space by
 * telling you something you cannot get from the row above it.
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

    /** Desktop target rail. Selection is the card, not a target — combat is automatic. */
    private strip = (e: Actor, i: number) => {
        const hp = this.props.shown.of(e);
        const hpPct = Math.max(0, Math.min(100, (hp / Math.max(1, e.maxHealth)) * 100));
        const hpCls = hpPct > 60 ? "h-good" : hpPct > 30 ? "h-warn" : "h-crit";
        const shooter = this.props.actor;
        const dist = Math.round(Battlefield.distance(shooter, e));
        const cls = shooter.weapon.weaponClass;
        const unreachable = cls !== "melee" && outOfRange(cls, dist);
        const temper = Stage.TEMPER[e.temperament] || Stage.TEMPER["balanced"]!;
        const sub = e.faction ? `${e.faction}${e.archetype ? " " + e.archetype : ""}` : e.role.name;
        return (
            <button key={i} className={"es" + (e === this.props.inspecting ? " on" : "") + (this.props.shown.up(e) ? "" : " dead")}
                    style={{borderLeft: "3px solid " + accentCss(e.faction)}}
                    onClick={() => this.props.onInspect(e)}>
                <span className={"d rank-" + (e.rank || 1)} title={"threat rank " + (e.rank || 1)}>✦</span>
                <span className={"nm"}>{e.name} <span className={"lv"}>{sub} · L{e.level}</span></span>
                <span className={"temp " + temper[1]} title={"AI temperament"}>{temper[0]}</span>
                <span className={"bar hp"}><i className={hpCls} style={{width: hpPct + "%"}}/></span>
                <b className={"hpn " + hpCls}>{Math.max(0, Math.ceil(hp))}</b>
                <span className={"rng" + (unreachable ? " oor" : "")}>{dist}m</span>
                <span className={"sp"}>SP {this.enemyArmor(e)}</span>
            </button>);
    };

    /**
     * One fixed-height line under the board. It used to say "LIVE" or
     * "RESOLVING" (the auto flag, spelled out) and repeat whose turn it was —
     * which the TURN tag on the HUD row already says. What it says now is the
     * only thing the board cannot: which round this is, whether there is a
     * clock to survive, and what the unit acting right now is holding.
     */
    private statusBar() {
        const acting = this.props.turnOrder[0];
        const w = (acting || this.props.actor).weapon;
        return (
            <div className={"autoStatus"}>
                <span className={"asRound"}>ROUND {Math.max(1, this.props.round)}</span>
                {this.props.holdLeft > 0 &&
                    <span className={"asHold"}>HOLD {this.props.holdLeft} MORE</span>}
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
        const acting = this.props.turnOrder[0] || null;
        const next = this.props.turnOrder.find((a, i) => i > 0 && a.canFight()) || null;
        return (
            <section id={"stage"}>
                {inFight && <div className={"strips"}>{this.props.enemies.map(this.strip)}</div>}

                {inFight ? (
                    <div className={"arena"}>
                        <BattleScene party={this.props.squad} enemies={this.props.enemies}
                                     battleId={this.props.battleId}
                                     playback={this.props.playback}
                                     onPlaybackDone={this.props.onPlaybackDone}
                                     speed={1.6}
                                     shown={this.props.shown}
                                     notice={this.props.notice}
                                     onImpact={this.props.onImpact}
                                     onMend={this.props.onMend}
                                     activeName={acting ? acting.name : undefined}/>
                        {this.props.inspecting &&
                            <UnitCard unit={this.props.inspecting}
                                      party={this.props.squad} enemies={this.props.enemies}
                                      shown={this.props.shown}
                                      onClose={() => this.props.onInspect(null)}/>}
                    </div>
                ) : (
                    <React.Fragment>
                        {/* keyed by view so switching categories remounts the panel
                            and replays the holo re-tune animation */}
                        <div className={"viewwrap"} key={this.props.view}>
                            <MainPanel activeView={this.props.view} currentActor={this.props.actor}
                                       party={this.props.party} screen={this.props.screen}
                                       messages={this.props.messages}
                                       onNotice={this.props.onNotice}/>
                        </div>
                    </React.Fragment>
                )}

                {/* phone battle HUD — replaces the docked log under the breakpoint */}
                {inFight && <BattleHud party={this.props.squad} enemies={this.props.enemies}
                                       acting={acting} next={next}
                                       selected={this.props.inspecting}
                                       shown={this.props.shown}
                                       onSelect={this.props.onInspect}/>}

                {inFight && <div className={"stageActions"}>{this.statusBar()}</div>}
            </section>);
    }
}
