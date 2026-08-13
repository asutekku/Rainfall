import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Combat} from "../../interact/combat";
import {Facedown} from "../../interact/Facedown";
import {Driving} from "../../interact/Driving";
import {MainPanel} from "../mainPanel";
import {IsoMap, Floater} from "./isoMap";

export interface StageProps {
    actor: Actor;
    enemy: Actor;
    party: Actor[];
    enemies: Actor[];
    view: string;
    messages: any;
    onSelectAlly: (a: Actor) => void;
    onSelectEnemy: (a: Actor) => void;
    onGotoCombat: () => void;
}

interface StageState { floaters: Floater[]; note: string; }

export class Stage extends React.Component<StageProps, StageState> {

    private floaterId = 0;

    constructor(props: StageProps) {
        super(props);
        this.state = {floaters: [], note: ""};
    }

    private addFloater(text: string, kind: string) {
        const id = ++this.floaterId;
        this.setState((s) => ({floaters: [...s.floaters, {id, text, kind}]}));
        setTimeout(() => this.setState((s) => ({floaters: s.floaters.filter((f) => f.id !== id)})), 850);
    }

    private enemyArmor(a: Actor): number {
        const sp = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
        return Math.max(sp, a.cyberSP());
    }

    private attack = () => {
        const enemy = this.props.enemy;
        const before = enemy.health;
        const msgs = Combat.basicAction(this.props.actor, enemy, null as any);
        const dealt = Math.round(before - enemy.health);
        this.addFloater(dealt > 0 ? "-" + dealt : "MISS", dealt > 0 ? (dealt >= 20 ? "dmg-big" : "dmg") : "miss");
        this.setState({note: !enemy.canFight() ? `${enemy.name} is down.` : ""});
        this.props.messages(msgs);
    };

    private facedown = () => {
        const fd = Facedown.resolve(this.props.actor, this.props.enemy);
        const backed = Facedown.applyOutcome(fd);
        const won = fd.winner === this.props.actor;
        this.addFloater(won ? "FACEDOWN" : "STARE", won ? "buff" : "miss");
        this.setState({
            note: fd.tie ? "Facedown: a stand-off." :
                won ? (backed ? `${this.props.enemy.name} backs down!` : `${this.props.enemy.name} is shaken (-2).`)
                    : `You blink first (-2 vs ${this.props.enemy.name}).`,
        });
    };

    private flee = () => {
        const v = this.props.actor.vehicle;
        const ok = v ? Driving.escape(this.props.actor, v, 15) : false;
        this.addFloater(ok ? "ESCAPED" : "PINNED", ok ? "buff" : "miss");
        this.setState({note: v ? (ok ? `Peeled out in the ${v.name}.` : `Couldn't shake them.`) : `No ride to flee in.`});
    };

    private strip = (e: Actor, i: number) => {
        const hpPct = Math.max(0, Math.min(100, (e.health / Math.max(1, e.maxHealth)) * 100));
        const active = e.name === this.props.enemy.name;
        return (
            <button key={i} className={"es" + (active ? " on" : "") + (e.canFight() ? "" : " dead")}
                    onClick={() => this.props.onSelectEnemy(e)}>
                <span className={"d"}>✦</span>
                <span className={"nm"}>{e.name} <span className={"lv"}>L{e.level}</span></span>
                <span className={"bar hp"}><i style={{width: hpPct + "%"}}/></span>
                <span className={"sp"}>SP {this.enemyArmor(e)}</span>
            </button>);
    };

    public render() {
        const combat = this.props.view === "Combat";
        const w = this.props.actor.weapon;
        return (
            <section id={"stage"}>
                <div className={"strips"}>
                    {this.props.enemies.map(this.strip)}
                </div>

                {combat ? (
                    <div className={"arena"}>
                        <IsoMap party={this.props.party} enemies={this.props.enemies}
                                activeAlly={this.props.actor.name} activeEnemy={this.props.enemy.name}
                                onSelect={this.select} floaters={this.state.floaters}/>
                    </div>
                ) : (
                    <React.Fragment>
                        <div className={"viewwrap"}>
                            <MainPanel activeView={this.props.view} currentActor={this.props.actor}
                                       party={this.props.party} messages={this.props.messages}/>
                        </div>
                        <div className={"minimap"} title={"Return to combat"} onClick={this.props.onGotoCombat}>
                            <IsoMap party={this.props.party} enemies={this.props.enemies} mini={true}/>
                            <span className={"minimapHint"}>◤ TACTICAL — click to engage</span>
                        </div>
                    </React.Fragment>
                )}

                {combat && (
                    <div className={"stageActions"}>
                        <div className={"acts"}>
                            <button className={"act prim"} onClick={this.attack}>
                                {w.autofire ? "Open Fire" : "Attack"}
                            </button>
                            <button className={"act"} onClick={this.facedown}>Facedown</button>
                            <button className={"act"} onClick={this.flee}>Flee</button>
                            <span className={"wpn"}>
                                <b>{w.name}</b> · {w.diceThrows}d6{w.damage ? "+" + w.damage : ""}
                                {w.ap ? " AP" : ""}{w.autofire ? " · AUTO" : ""} · acc {w.accuracyBonus >= 0 ? "+" : ""}{w.accuracyBonus}
                            </span>
                        </div>
                        {this.state.note && <div className={"note"}>{this.state.note}</div>}
                    </div>
                )}
            </section>);
    }

    /** Map token click: route to ally- or enemy-selection by side. */
    private select = (a: Actor) => {
        if (this.props.enemies.indexOf(a) >= 0) { this.props.onSelectEnemy(a); }
        else { this.props.onSelectAlly(a); }
    };
}
