import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Battlefield} from "../../interact/battlefield";
import {rangeDV} from "../../interact/rangeTable";
import {RunNode, RunState} from "../../interact/runMap";
import {MainPanel} from "../mainPanel";
import {IsoMap} from "./isoMap";
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
    onNotice: (msg: any) => void;
    onSelectAlly: (a: Actor) => void;
    onSelectEnemy: (a: Actor) => void;
    onGotoCombat: () => void;
    onPickNode: (node: RunNode) => void;
}

/**
 * The centre stage. Between fights it shows the holographic city map; in a fight
 * it shows the iso arena (combat is fully auto-resolved, so there are no manual
 * action buttons — just a status line); other nav views show their panel.
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
        const active = e.name === this.props.enemy.name;
        const dist = Math.round(Battlefield.distance(this.props.actor, e));
        const cls = this.props.actor.weapon.weaponClass;
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

    /** Map token click: route to ally- or enemy-selection by side. */
    private select = (a: Actor) => {
        if (this.props.enemies.indexOf(a) >= 0) { this.props.onSelectEnemy(a); }
        else { this.props.onSelectAlly(a); }
    };

    public override render() {
        const combat = this.props.view === "Combat";
        // Between fights, the "combat" view is the holographic city map.
        if (combat && this.props.screen === "map" && this.props.run) {
            return <CityMap run={this.props.run} party={this.props.party} onPick={this.props.onPickNode}/>;
        }
        const inFight = combat && this.props.screen === "combat";
        const w = this.props.actor.weapon;
        return (
            <section id={"stage"}>
                {inFight && <div className={"strips"}>{this.props.enemies.map(this.strip)}</div>}

                {inFight ? (
                    <div className={"arena"}>
                        <IsoMap party={this.props.party} enemies={this.props.enemies}
                                activeAlly={this.props.actor.name} activeEnemy={this.props.enemy.name}
                                onSelect={this.select}/>
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
                        <div className={"autoStatus"}>
                            <span className={"autoDot"}>▸</span> AUTO-RESOLVING
                            <span className={"wpn"}>
                                <b>{w.name}</b> · {w.diceThrows}d6{w.damage ? "+" + w.damage : ""}
                                {w.ap ? " AP" : ""}{w.autofire ? " · AUTO" : ""}
                            </span>
                        </div>
                    </div>
                )}
            </section>);
    }
}
