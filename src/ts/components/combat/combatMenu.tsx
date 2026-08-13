import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Combat} from "../../interact/combat";
import {Facedown} from "../../interact/Facedown";
import {Driving} from "../../interact/Driving";
import {Bar} from "../general/bar";

export interface CombatMenuProps {
    actor: Actor;
    enemy: Actor;
    messages: any;
}

interface Floater {
    id: number;
    text: string;
    kind: string;
}

interface CombatMenuState {
    floaters: Floater[];
    note: string;
}

export class CombatMenu extends React.Component<CombatMenuProps, CombatMenuState> {

    private floaterId = 0;

    constructor(props: any) {
        super(props);
        this.state = {floaters: [], note: ""};
    }

    private addFloater(text: string, kind: string) {
        const id = ++this.floaterId;
        this.setState((s) => ({floaters: [...s.floaters, {id, text, kind}]}));
        setTimeout(() => this.setState((s) => ({floaters: s.floaters.filter((f) => f.id !== id)})), 850);
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

    private intimidate = () => {
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

    private enemyArmor(a: Actor): number {
        const sp = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
        return Math.max(sp, a.cyberSP());
    }

    public render() {
        const e = this.props.enemy;
        const w = this.props.actor.weapon;
        return (
            <div className={"combatUi"}>
                <div className={"panel"}>
                    <h3>Hostile</h3>
                    <div className={"enemy"}>
                        <div className={"floaterLayer"}>
                            {this.state.floaters.map((f) => (
                                <span key={f.id} className={"floater floater-" + f.kind}>{f.text}</span>
                            ))}
                        </div>
                        <img src={e.role.portrait} className={"pf"} alt={e.role.name}/>
                        <div className={"ei"}>
                            <div className={"en"}>
                                <b>{e.name}</b>
                                <span>{e.role.name} · Lvl {e.level}</span>
                            </div>
                            <Bar value={e.health} max={e.maxHealth} kind={"hp"}/>
                            <div className={"est"}>
                                <span><u>SP</u> {this.enemyArmor(e)}</span>
                                <span><u>ARM</u> {e.weapon.name}</span>
                                <span>{e.weapon.diceThrows}d6{e.weapon.damage ? "+" + e.weapon.damage : ""}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={"panel"}>
                    <h3>Actions</h3>
                    <div className={"acts"}>
                        <button className={"act prim"} onClick={this.attack}>
                            {w.autofire ? "Open Fire" : "Attack"}
                            <small>{w.autofire ? "Autofire · 2d6 × margin" : "single shot"}</small>
                        </button>
                        <button className={"act"} onClick={this.intimidate}>Facedown</button>
                        <button className={"act"} onClick={this.flee}>Flee</button>
                    </div>
                    <div className={"wpn"}>
                        <b>{w.name}</b>
                        <span>{w.diceThrows}d6{w.damage ? "+" + w.damage : ""}</span>
                        {w.ap ? <span>AP</span> : null}
                        {w.autofire ? <span>AUTO</span> : null}
                        <span>acc {w.accuracyBonus >= 0 ? "+" : ""}{w.accuracyBonus} · {w.range}m</span>
                    </div>
                    {this.state.note && <div className={"note"}>{this.state.note}</div>}
                </div>
            </div>);
    }
}
