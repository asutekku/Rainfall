import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Combat} from "../../interact/combat";
import {Facedown} from "../../interact/Facedown";
import {Driving} from "../../interact/Driving";
import {Battlefield, Point} from "../../interact/battlefield";
import {rangeDV} from "../../interact/rangeTable";
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

interface StageState { floaters: Floater[]; note: string; moveMode: boolean; pending: Point | null; }

export class Stage extends React.Component<StageProps, StageState> {

    private floaterId = 0;

    constructor(props: StageProps) {
        super(props);
        this.state = {floaters: [], note: "", moveMode: false, pending: null};
    }

    private addFloater(text: string, kind: string) {
        const id = ++this.floaterId;
        this.setState((s) => ({floaters: [...s.floaters, {id, text, kind}]}));
        setTimeout(() => this.setState((s) => ({floaters: s.floaters.filter((f) => f.id !== id)})), 850);
    }

    private toggleMove = () => {
        this.setState((s) => ({moveMode: !s.moveMode, pending: s.moveMode ? null : s.pending}));
    };

    /** Arena click while in move mode: clamp the destination to this turn's run distance. */
    private pickMove = (p: Point) => {
        const from: Point = {x: this.props.actor.position.x, y: this.props.actor.position.y};
        const gap = Battlefield.gap(from, p);
        const run = this.props.actor.runMeters();
        const dest = gap <= run ? p : {x: from.x + (p.x - from.x) * (run / gap), y: from.y + (p.y - from.y) * (run / gap)};
        this.setState({pending: Battlefield.clamp(dest)});
    };

    /** Resolve the manual turn: apply the pending move + optional attack, run the round. */
    private commit(target: Actor | null, aimed: boolean = false) {
        const enemy = this.props.enemy;
        const before = enemy.health;
        const action: any = {moveTo: this.state.pending || undefined, target: target || undefined, aimed};
        const msgs = this.props.actor.auto
            ? Combat.autoRound(this.props.party, this.props.enemies)
            : Combat.round(this.props.party, this.props.enemies, this.props.actor, action);
        if (target) {
            const dealt = Math.round(before - enemy.health);
            this.addFloater(dealt > 0 ? "-" + dealt : "MISS", dealt > 0 ? (dealt >= 20 ? "dmg-big" : "dmg") : "miss");
        }
        this.setState({moveMode: false, pending: null, note: target && !enemy.canFight() ? `${enemy.name} is down.` : ""});
        this.props.messages(msgs);
    }

    private enemyArmor(a: Actor): number {
        const sp = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
        return Math.max(sp, a.cyberSP());
    }

    private attack = () => this.commit(this.props.enemy);
    private aimedShot = () => this.commit(this.props.enemy, true);
    private wait = () => this.commit(null);

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

    private static TEMPER: { [k: string]: [string, string] } = {
        aggressive: ["AGGRO", "t-aggro"],
        berserker: ["RUSH", "t-rush"],
        flanker: ["FLANK", "t-flank"],
        camper: ["CAMP", "t-camp"],
        balanced: ["STEADY", "t-steady"],
    };

    private strip = (e: Actor, i: number) => {
        const hpPct = Math.max(0, Math.min(100, (e.health / Math.max(1, e.maxHealth)) * 100));
        const active = e.name === this.props.enemy.name;
        const dist = Math.round(Battlefield.distance(this.props.actor, e));
        const cls = this.props.actor.weapon.weaponClass;
        const outOfRange = cls !== "melee" && rangeDV(cls, dist) === null;
        const temper = Stage.TEMPER[e.temperament] || Stage.TEMPER.balanced;
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
                                onSelect={this.select} floaters={this.state.floaters}
                                onPick={this.state.moveMode ? this.pickMove : undefined}
                                pending={this.state.pending || undefined}/>
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
                        {this.props.actor.auto ? (
                            <div className={"acts"}>
                                <button className={"act prim"} onClick={this.wait}>▸ Auto Turn</button>
                                <span className={"wpn"}>{this.props.actor.name} is AI-controlled — plays its own turn.</span>
                            </div>
                        ) : (
                            <div className={"acts"}>
                                <button className={"act" + (this.state.moveMode ? " prim" : "")} onClick={this.toggleMove}>
                                    {this.state.moveMode ? "Moving…" : "Move"}
                                </button>
                                <button className={"act prim"} onClick={this.attack}>
                                    {w.autofire ? "Open Fire" : "Attack"}
                                </button>
                                {!w.autofire && <button className={"act"} onClick={this.aimedShot} title={"-8 to hit, hits the head: doubles what gets through"}>Aimed</button>}
                                <button className={"act"} onClick={this.facedown}>Facedown</button>
                                <button className={"act"} onClick={this.wait}>Wait</button>
                                <button className={"act"} onClick={this.flee}>Flee</button>
                                <span className={"wpn"}>
                                    <b>{w.name}</b> · {w.diceThrows}d6{w.damage ? "+" + w.damage : ""}
                                    {w.ap ? " AP" : ""}{w.autofire ? " · AUTO" : ""} · acc {w.accuracyBonus >= 0 ? "+" : ""}{w.accuracyBonus}
                                </span>
                            </div>
                        )}
                        {this.state.moveMode && (
                            <div className={"note"}>
                                {this.state.pending
                                    ? `Move to ${Math.round(Battlefield.gap({x: this.props.actor.position.x, y: this.props.actor.position.y}, this.state.pending))}m — Attack or Wait to commit.`
                                    : "Click the arena to reposition (within your run range)."}
                            </div>
                        )}
                        {!this.state.moveMode && this.state.note && <div className={"note"}>{this.state.note}</div>}
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
