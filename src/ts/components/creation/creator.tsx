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
    initial: CharacterSpec;
    canCancel: boolean;
    /** A checkpointed run exists on this device. */
    canContinue?: boolean | undefined;
    onDeploy: (spec: CharacterSpec) => void;
    onCancel: () => void;
    onContinue?: (() => void) | undefined;
}

interface CreatorState {
    spec: CharacterSpec;
    /** Point-buy + lifepath revealed. Closed, the role's own stat line is used. */
    advanced: boolean;
}

/**
 * Boot screen: you, not a squad.
 *
 * The rest of the crew is hired off the street from the merc market, so this
 * only builds the one character who persists across runs. Pick a role, take
 * the name or roll another, hit the street — the role's signature stat line
 * does the rest. The full RED Complete Package point-buy and the Lifepath
 * tables are still here for anyone who wants them, folded behind "customise".
 */
export class Creator extends React.Component<CreatorProps, CreatorState> {

    private base: CharacterSpec;   // snapshot for Reset

    constructor(props: CreatorProps) {
        super(props);
        const spec = Creator.normalize(props.initial);
        this.base = Creator.clone(spec);
        this.state = {spec, advanced: false};
    }

    /** Fill in every stat + a lifepath so the editor never reads an undefined field. */
    private static normalize(spec: CharacterSpec): CharacterSpec {
        const role = spec.role || "solo";
        const src = spec.stats || CharacterCreation.statsForRole(role);
        const stats: any = {};
        STAT_KEYS.forEach((k) => stats[k] = (src as any)[k] === undefined ? STAT_MIN : (src as any)[k]);
        return {
            name: spec.name || CharacterCreation.randomName(),
            role,
            roleRank: spec.roleRank === undefined ? 4 : spec.roleRank,
            stats,
            lifepath: spec.lifepath || CharacterCreation.randomLifepath(),
        };
    }

    private static clone(s: CharacterSpec): CharacterSpec {
        return {...s, stats: {...s.stats}, lifepath: {...(s.lifepath as Lifepath)}};
    }

    private used(s: CharacterSpec): number {
        return STAT_KEYS.reduce((n, k) => n + ((s.stats as any)[k] || 0), 0);
    }

    private update(mut: (s: CharacterSpec) => CharacterSpec): void {
        this.setState({spec: mut(Creator.clone(this.state.spec))});
    }

    /**
     * Picking a role also takes its stat line — until you've opened customise,
     * at which point the numbers are yours and switching role leaves them alone.
     */
    private pickRole = (role: string) => {
        this.update((s) => this.state.advanced
            ? {...s, role}
            : {...s, role, stats: CharacterCreation.statsForRole(role)});
    };

    private setStat = (key: string, delta: number) => {
        this.update((s) => {
            const stats: any = {...s.stats};
            const cur = stats[key] || STAT_MIN;
            const next = Math.max(STAT_MIN, Math.min(STAT_MAX, cur + delta));
            const after = this.used(s) - cur + next;
            if (after > STAT_BUDGET) { return s; }
            stats[key] = next;
            return {...s, stats};
        });
    };


    private randomize = () => {
        const rolled = CharacterCreation.randomSpec();
        this.setState({
            spec: Creator.normalize(this.state.advanced
                ? rolled
                : {...rolled, stats: CharacterCreation.statsForRole(rolled.role || "solo")}),
        });
    };

    private reset = () => this.setState({spec: Creator.clone(this.base)});

    /** Opening customise keeps the role line as the starting point for edits. */
    private toggleAdvanced = () => this.setState({advanced: !this.state.advanced});

    // ---- derived RED numbers, live-previewed as you build ----
    private derived(s: CharacterSpec): Array<[string, string]> {
        const st: any = s.stats;
        const hp = 10 + 5 * Math.ceil((st.body + st.will) / 2);
        return [
            ["HP", "" + hp],
            ["Humanity", "" + (st.emp * 10)],
            ["Run", (st.move * 3) + "m"],
            ["Initiative", "+" + st.ref],
            ["Evasion", "+" + st.dex],
        ];
    }

    private identity(s: CharacterSpec) {
        return (
            <div className={"crRow crId"}>
                <input value={s.name} spellCheck={false}
                       onChange={(e) => { const v = e.target.value; this.update((x) => ({...x, name: v})); }}/>
                <button title={"Reroll name"}
                        onClick={() => this.update((x) => ({...x, name: CharacterCreation.randomName()}))}>⟳</button>
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
                                    onClick={() => this.pickRole(k)}>
                                <img src={`src/media/portraits/${k}.png`} alt={role.name}/>
                                {role.name}
                            </button>);
                    })}
                </div>
                <div className={"crRoleInfo"}>
                    <div className={"crRoleAbil"}><b style={{color: r.color}}>{r.skill}</b>
                        <span className={"crRank"}>Rank <em>{s.roleRank}</em></span>
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
                        const lbl = STAT_LABEL[k]!;
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

    public override render() {
        const s = this.state.spec;
        const r = ROLE_MAP[s.role || "solo"];
        return (
            <div className={"creator solo"}>
                <header className={"crHead"}>
                    <div>
                        <h1>Hit the Street</h1>
                        <p>Your merc — the crew gets hired on the way</p>
                    </div>
                    <div className={"crActions"}>
                        <button onClick={this.randomize}>⚄ Randomize</button>
                        <button onClick={this.reset}>⟲ Reset</button>
                        {this.props.canCancel && <button onClick={this.props.onCancel}>✕ Cancel</button>}
                        {this.props.canContinue && this.props.onContinue &&
                            <button className={"prim crContinue"} onClick={this.props.onContinue}>▸ Continue Run</button>}
                        <button className={"prim"} onClick={() => this.props.onDeploy(this.state.spec)}>
                            {this.props.canContinue ? "New Run ▸" : "Hit the Street ▸"}
                        </button>
                    </div>
                </header>
                <div className={"crBody"}>
                    <main className={"crEdit"}>
                        <div className={"crEditHead"}>
                            <img className={"crPortrait"} src={`src/media/portraits/${s.role}.png`} alt={r.name}/>
                            {this.identity(s)}
                        </div>
                        {this.rolePicker(s)}
                        {this.derivedBar(s)}
                        <button className={"crAdvToggle" + (this.state.advanced ? " on" : "")}
                                onClick={this.toggleAdvanced}>
                            {this.state.advanced ? "▾" : "▸"} Customise — stat point-buy & lifepath
                        </button>
                        {this.state.advanced && this.statBuy(s)}
                        {this.state.advanced && this.lifepath(s)}
                    </main>
                </div>
            </div>);
    }
}
