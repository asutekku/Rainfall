import * as React from "react";
import {default as roles} from "../../actors/resources/roles";
import {
    CharacterCreation, CharacterSpec, Lifepath,
    STAT_KEYS, STAT_BUDGET, STAT_MIN, STAT_MAX,
} from "../../actors/resources/CharacterCreation";

const ROLE_MAP: any = roles;
const ROLE_KEYS: string[] = ["rockerboy", "solo", "netrunner", "techie", "media", "cop", "corporate", "fixer", "nomad"];

// stat key -> [short label, full name]
const STAT_LABEL: { [k: string]: [string, string] } = {
    int: ["INT", "Intelligence"], ref: ["REF", "Reflexes"], dex: ["DEX", "Dexterity"],
    tech: ["TECH", "Technique"], cool: ["COOL", "Cool"], will: ["WILL", "Willpower"],
    luck: ["LUCK", "Luck"], move: ["MOVE", "Movement"], body: ["BODY", "Body"], emp: ["EMP", "Empathy"],
};

// lifepath field -> [label, option list]
const LIFEPATH: Array<[keyof Lifepath, string, string[]]> = [
    ["culturalOrigin", "Cultural origin", CharacterCreation.origins()],
    ["personality", "Personality", CharacterCreation.personalities()],
    ["clothingStyle", "Signature style", CharacterCreation.clothing()],
    ["valueMost", "Values most", CharacterCreation.values()],
    ["familyBackground", "Family background", CharacterCreation.families()],
    ["lifeGoal", "Life goal", CharacterCreation.lifeGoals()],
];

export interface CreatorProps {
    initial: CharacterSpec[];
    canCancel: boolean;
    onDeploy: (specs: CharacterSpec[]) => void;
    onCancel: () => void;
}

interface CreatorState {
    squad: CharacterSpec[];
    sel: number;
}

/**
 * Cyberpunk RED "Complete Package" character creation for the whole squad: pick
 * each merc's Role, distribute the 62-point STAT budget (2-8 each), roll a
 * Lifepath, then deploy. Every choice maps to a CharacterSpec the Player
 * constructor already understands, so "Deploy" simply builds Players from these
 * specs. Opens pre-filled (randomized default) so a one-click Deploy still works.
 */
export class Creator extends React.Component<CreatorProps, CreatorState> {

    private base: CharacterSpec[];   // snapshot for Reset

    constructor(props: CreatorProps) {
        super(props);
        const squad = props.initial.map(Creator.normalize);
        this.base = squad.map(Creator.clone);
        this.state = {squad, sel: 0};
    }

    /** Fill in every stat + a lifepath so the editor never reads an undefined field. */
    private static normalize(spec: CharacterSpec): CharacterSpec {
        const src = spec.stats || {};
        const stats: any = {};
        STAT_KEYS.forEach((k) => stats[k] = (src as any)[k] === undefined ? STAT_MIN : (src as any)[k]);
        return {
            name: spec.name || CharacterCreation.randomName(),
            role: spec.role || "solo",
            roleRank: spec.roleRank === undefined ? 4 : spec.roleRank,
            stats,
            lifepath: spec.lifepath || CharacterCreation.randomLifepath(),
        };
    }

    private static clone(s: CharacterSpec): CharacterSpec {
        return {...s, stats: {...s.stats}, lifepath: {...(s.lifepath as Lifepath)}};
    }

    private cur(): CharacterSpec { return this.state.squad[this.state.sel]; }

    private used(s: CharacterSpec): number {
        return STAT_KEYS.reduce((n, k) => n + ((s.stats as any)[k] || 0), 0);
    }

    /** Replace the selected member with the result of `mut`. */
    private update(mut: (s: CharacterSpec) => CharacterSpec): void {
        const squad = this.state.squad.slice();
        squad[this.state.sel] = mut(Creator.clone(squad[this.state.sel]));
        this.setState({squad});
    }

    private setStat(key: string, delta: number): void {
        this.update((s) => {
            const stats: any = s.stats;
            const cur = stats[key] || STAT_MIN;
            const next = Math.max(STAT_MIN, Math.min(STAT_MAX, cur + delta));
            if (delta > 0 && this.used(s) - cur + next > STAT_BUDGET) { return s; }  // over budget
            stats[key] = next;
            return s;
        });
    }

    private setRank(delta: number): void {
        this.update((s) => ({...s, roleRank: Math.max(4, Math.min(10, (s.roleRank || 4) + delta))}));
    }

    private randomizeMember(): void {
        this.update(() => Creator.normalize(CharacterCreation.randomSpec()));
    }

    private randomizeAll = (): void => {
        this.setState({squad: this.state.squad.map(() => Creator.normalize(CharacterCreation.randomSpec()))});
    }

    private reset = (): void => {
        this.setState({squad: this.base.map(Creator.clone), sel: 0});
    }

    private addMember = (): void => {
        if (this.state.squad.length >= 4) { return; }
        const squad = this.state.squad.concat(Creator.normalize(CharacterCreation.randomSpec()));
        this.setState({squad, sel: squad.length - 1});
    }

    private removeMember = (): void => {
        if (this.state.squad.length <= 1) { return; }
        const squad = this.state.squad.slice();
        squad.splice(this.state.sel, 1);
        this.setState({squad, sel: Math.max(0, this.state.sel - 1)});
    }

    // ---- derived RED numbers, live-previewed as you build ----
    private derived(s: CharacterSpec): Array<[string, string]> {
        const st: any = s.stats;
        const hp = 10 + 5 * Math.ceil((st.body + st.will) / 2);
        return [
            ["HP", "" + hp],
            ["Humanity", "" + (st.emp * 10)],
            ["Run", (st.move * 2) + "m"],
            ["Initiative", "+" + st.ref],
            ["Evasion", "+" + st.dex],
        ];
    }

    private roster() {
        return (
            <aside className={"crRoster"}>
                {this.state.squad.map((s, i) => {
                    const r = ROLE_MAP[s.role || "solo"];
                    return (
                        <button key={i} className={"crMerc" + (i === this.state.sel ? " on" : "")}
                                onClick={() => this.setState({sel: i})}>
                            <img src={`src/media/portraits/${s.role}.png`} alt={r.name}/>
                            <span className={"crMercX"}>
                                <b>{s.name}</b>
                                <i style={{color: r.color}}>{r.name}</i>
                            </span>
                        </button>);
                })}
                {this.state.squad.length < 4 &&
                    <button className={"crAdd"} onClick={this.addMember}>＋ Add merc</button>}
            </aside>);
    }

    private identity(s: CharacterSpec) {
        return (
            <div className={"crRow crId"}>
                <input value={s.name} spellCheck={false}
                       onChange={(e) => { const v = e.target.value; this.update((x) => ({...x, name: v})); }}/>
                <button title={"Reroll name"}
                        onClick={() => this.update((x) => ({...x, name: CharacterCreation.randomName()}))}>⟳</button>
                {this.state.squad.length > 1 &&
                    <button className={"crDel"} title={"Remove merc"} onClick={this.removeMember}>✕</button>}
            </div>);
    }

    private rolePicker(s: CharacterSpec) {
        const r = ROLE_MAP[s.role || "solo"];
        return (
            <div className={"crSect"}>
                <h4>Role</h4>
                <div className={"crRoles"}>
                    {ROLE_KEYS.map((k) => {
                        const role = ROLE_MAP[k];
                        const on = k === s.role;
                        return (
                            <button key={k} className={"crRole" + (on ? " on" : "")}
                                    style={on ? {borderColor: role.color, color: role.color} : {}}
                                    onClick={() => this.update((x) => ({...x, role: k}))}>
                                <img src={`src/media/portraits/${k}.png`} alt={role.name}/>
                                {role.name}
                            </button>);
                    })}
                </div>
                <div className={"crRoleInfo"}>
                    <div className={"crRoleAbil"}><b style={{color: r.color}}>{r.skill}</b>
                        <span className={"crRank"}>Rank
                            <button onClick={() => this.setRank(-1)}>−</button>
                            <em>{s.roleRank}</em>
                            <button onClick={() => this.setRank(1)}>+</button>
                        </span>
                    </div>
                    <p>{r.skillDescription}</p>
                </div>
            </div>);
    }

    private statBuy(s: CharacterSpec) {
        const remaining = STAT_BUDGET - this.used(s);
        return (
            <div className={"crSect"}>
                <h4>Stats <span className={"crBudget" + (remaining === 0 ? " done" : "")}>
                    {remaining} <i>pts left</i></span></h4>
                <div className={"crStats"}>
                    {STAT_KEYS.map((k) => {
                        const v = (s.stats as any)[k];
                        const lbl = STAT_LABEL[k];
                        return (
                            <div key={k} className={"crStat"} title={lbl[1]}>
                                <span className={"crStatK"}>{lbl[0]}</span>
                                <button disabled={v <= STAT_MIN} onClick={() => this.setStat(k, -1)}>−</button>
                                <span className={"crStatV"}>{v}</span>
                                <button disabled={v >= STAT_MAX || remaining <= 0}
                                        onClick={() => this.setStat(k, 1)}>+</button>
                                <span className={"crStatBar"}><i style={{width: (v / STAT_MAX * 100) + "%"}}/></span>
                            </div>);
                    })}
                </div>
            </div>);
    }

    private derivedBar(s: CharacterSpec) {
        return (
            <div className={"crDerived"}>
                {this.derived(s).map(([k, v]) => (
                    <span key={k}><i>{k}</i><b>{v}</b></span>
                ))}
            </div>);
    }

    private lifepath(s: CharacterSpec) {
        const lp: any = s.lifepath;
        return (
            <div className={"crSect"}>
                <h4>Lifepath
                    <button className={"crReroll"} title={"Reroll lifepath"}
                            onClick={() => this.update((x) => ({...x, lifepath: CharacterCreation.randomLifepath()}))}>⚄</button>
                </h4>
                <div className={"crLife"}>
                    {LIFEPATH.map(([field, label, opts]) => (
                        <label key={field as string}>
                            <span>{label}</span>
                            <select value={lp[field]}
                                    onChange={(e) => { const v = e.target.value;
                                        this.update((x) => ({...x, lifepath: {...(x.lifepath as Lifepath), [field]: v}})); }}>
                                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </label>
                    ))}
                </div>
            </div>);
    }

    public render() {
        const s = this.cur();
        return (
            <div className={"creator"}>
                <header className={"crHead"}>
                    <div>
                        <h1>Assemble Your Crew</h1>
                        <p>Cyberpunk RED · Complete Package</p>
                    </div>
                    <div className={"crActions"}>
                        <button onClick={this.randomizeAll}>⚄ Randomize all</button>
                        <button onClick={this.reset}>⟲ Reset</button>
                        {this.props.canCancel && <button onClick={this.props.onCancel}>✕ Cancel</button>}
                        <button className={"prim"} onClick={() => this.props.onDeploy(this.state.squad)}>Deploy Squad ▸</button>
                    </div>
                </header>
                <div className={"crBody"}>
                    {this.roster()}
                    <main className={"crEdit"}>
                        <div className={"crEditHead"}>
                            {this.identity(s)}
                            <button className={"crRand"} title={"Randomize this merc"}
                                    onClick={() => this.randomizeMember()}>⚄ Randomize</button>
                        </div>
                        {this.rolePicker(s)}
                        {this.statBuy(s)}
                        {this.derivedBar(s)}
                        {this.lifepath(s)}
                    </main>
                </div>
            </div>);
    }
}
