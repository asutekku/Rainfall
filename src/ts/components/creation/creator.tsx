import * as React from "react";
import {CLASSES, CLASS_IDS, classFromLegacyRole} from "../../actors/resources/classes";
import {
    CharacterCreation, CharacterSpec, Lifepath,
    STAT_KEYS, STAT_BUDGET, STAT_MIN, STAT_MAX,
} from "../../actors/resources/CharacterCreation";
import type {Career} from "../../interact/career";
import {KgBack, KgBar, KgRow} from "../general/kgKit";

const ROLE_MAP: any = CLASSES;
// The class list comes from the registry now, so adding a tenth class is a
// row in classes.ts rather than a second list to keep in sync.
const ROLE_KEYS: string[] = CLASS_IDS;

// The row keys: a–i down the class list, in registry order.
const CLASS_HOTKEYS = "abcdefghi";

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

/** "Glassing: strikes first…" → the name the row prints beside the class. */
function edgeName(edge: string): string {
    const at = edge.indexOf(":");
    return at > 0 ? edge.slice(0, at) : edge;
}

const LINE_NAME: { [k: string]: string } = {point: "Point", mid: "Mid", overwatch: "Overwatch"};

export interface CreatorProps {
    initial: CharacterSpec;
    /** The merc on file. Present → this screen asks one question before it asks nine. */
    career: Career | null;
    /** Opened via "New character": skip the veteran card, start on someone new. */
    startFresh?: boolean;
    onDeploy: (spec: CharacterSpec, veteran: boolean) => void;
    onCancel: () => void;
}

interface CreatorState {
    spec: CharacterSpec;
    /** A stat has been hand-edited — switching class now leaves the numbers alone. */
    touched: boolean;
    /** The veteran was retired here — the editor is open and this is someone new. */
    retired: boolean;
}

/**
 * The one door into a run, as a keyed grid: the nine classes down the left on
 * a–i, the point-buy and the Lifepath in the middle in the open (no fold — the
 * screen is the sheet), the name and the derived numbers on the right with the
 * deploy button under them.
 *
 * With a merc already on file this opens as their record instead of a blank
 * form: sending them back out is one key, and retiring them is the other.
 */
export class Creator extends React.Component<CreatorProps, CreatorState> {

    private base: CharacterSpec;   // snapshot for Reset

    constructor(props: CreatorProps) {
        super(props);
        // "New character" from the title opens on a rolled stranger, exactly as
        // if the veteran had been retired here — and just like a retire, nothing
        // is deleted unless the stranger actually deploys.
        const fresh = !!(props.career && props.startFresh);
        const spec = fresh
            ? Creator.freshSpec()
            : Creator.normalize(props.initial);
        this.base = Creator.clone(spec);
        this.state = {spec, touched: false, retired: fresh};
    }

    public override componentDidMount() { window.addEventListener("keydown", this.onKey); }
    public override componentWillUnmount() { window.removeEventListener("keydown", this.onKey); }

    private static freshSpec(): CharacterSpec {
        const rolled = CharacterCreation.randomSpec();
        return Creator.normalize({...rolled, stats: CharacterCreation.statsForRole(rolled.role || "solo")});
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

    // ---------------------------------------------------------------- keys --

    private onKey = (e: KeyboardEvent) => {
        const t = e.target as HTMLElement | null;
        if (t && ["INPUT", "SELECT", "TEXTAREA"].indexOf(t.tagName) >= 0) {
            if (e.key === "Escape") { (t as HTMLInputElement).blur(); }
            return;
        }
        if (e.metaKey || e.ctrlKey || e.altKey) { return; }
        const k = e.key.toLowerCase();
        const veteran = this.state.retired ? null : this.props.career;
        if (veteran) {
            if (k === "enter") { this.props.onDeploy(this.state.spec, true); }
            else if (k === "b") { this.retire(); }
            else if (k === "escape") { this.props.onCancel(); }
            else { return; }
            e.preventDefault();
            return;
        }
        const at = CLASS_HOTKEYS.indexOf(k);
        if (at >= 0 && at < ROLE_KEYS.length) { this.pickRole(ROLE_KEYS[at]!); }
        else if (k === "n") { this.update((x) => ({...x, name: CharacterCreation.randomName()})); }
        else if (k === "l") { this.update((x) => ({...x, lifepath: CharacterCreation.randomLifepath()})); }
        else if (k === "r") { this.randomize(); }
        else if (k === "enter") { this.props.onDeploy(this.state.spec, false); }
        else if (k === "escape") { this.props.onCancel(); }
        else { return; }
        e.preventDefault();
    };

    // -------------------------------------------------------------- edits --

    /**
     * Picking a class also takes its stat line — until a stat has been edited
     * by hand, at which point the numbers are yours and switching class leaves
     * them alone.
     */
    private pickRole = (role: string) => {
        this.update((s) => this.state.touched
            ? {...s, role}
            : {...s, role, stats: CharacterCreation.statsForRole(role)});
    };

    private setStat = (key: string, delta: number) => {
        this.setState({touched: true});
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
            spec: Creator.normalize(this.state.touched
                ? rolled
                : {...rolled, stats: CharacterCreation.statsForRole(rolled.role || "solo")}),
        });
    };

    private reset = () => this.setState({spec: Creator.clone(this.base), touched: false});

    /**
     * Retire the merc on file and open the editor on someone else entirely.
     * Nothing is deleted yet — the record only dies if this new person actually
     * deploys, so backing out of here leaves the veteran exactly where they were.
     */
    private retire = () => {
        const spec = Creator.freshSpec();
        this.base = Creator.clone(spec);
        this.setState({spec, retired: true, touched: false});
    };

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

    // ------------------------------------------------------------- columns --

    private classColumn(s: CharacterSpec) {
        const picked = classFromLegacyRole(s.role);
        const r = ROLE_MAP[picked];
        return (
            <div className={"kgCol n"} style={{width: "min(320px, 30vw)"}}>
                <h3 className={"kgH"}>Class <em>a–i</em></h3>
                {ROLE_KEYS.map((k, i) => {
                    const role = ROLE_MAP[k];
                    const on = k === picked || k === s.role;
                    return (
                        <KgRow key={k} hotkey={CLASS_HOTKEYS[i]} label={role.name} on={on}
                               labelStyle={on ? {color: role.color} : undefined}
                               value={edgeName(role.edge)} onClick={() => this.pickRole(k)}/>);
                })}
                <div className={"kgHr"}/>
                <p className={"kgP"}><b>{r.role}.</b> {r.edge}</p>
                <dl className={"kgDfn"}>
                    <dt>Fights from</dt><dd>{LINE_NAME[r.line] || r.line}</dd>
                    <dt>Weapons</dt><dd>{r.weapons.join(" · ")}</dd>
                </dl>
            </div>);
    }

    private statColumn(s: CharacterSpec) {
        const remaining = STAT_BUDGET - this.used(s);
        const lp: any = s.lifepath;
        return (
            <div className={"kgCol"}>
                <h3 className={"kgH"}>Stats
                    <em>{remaining === 0 ? `all ${STAT_BUDGET} spent` : `${remaining} pts left`}</em>
                </h3>
                {STAT_KEYS.map((k) => {
                    const v = (s.stats as any)[k];
                    const lbl = STAT_LABEL[k]!;
                    return (
                        <div key={k} className={"kgStat"} title={lbl[1]}>
                            <span className={"k"}>{lbl[0]}</span>
                            <button disabled={v <= STAT_MIN} onClick={() => this.setStat(k, -1)}>−</button>
                            <u><i style={{width: (v / STAT_MAX * 100) + "%"}}/></u>
                            <button disabled={v >= STAT_MAX || remaining <= 0}
                                    onClick={() => this.setStat(k, 1)}>+</button>
                            <b>{v}</b>
                        </div>);
                })}
                <div className={"kgHr"}/>
                <h3 className={"kgH"}>Lifepath <em>l — reroll all</em></h3>
                <div className={"kgLife"}>
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

    private nameColumn(s: CharacterSpec) {
        return (
            <div className={"kgCol n"} style={{width: "min(280px, 26vw)"}}>
                <h3 className={"kgH"}>Name <em>n — reroll</em></h3>
                <div className={"kgName"}>
                    <input value={s.name} spellCheck={false}
                           onChange={(e) => { const v = e.target.value; this.update((x) => ({...x, name: v})); }}/>
                    <button title={"Reroll name"}
                            onClick={() => this.update((x) => ({...x, name: CharacterCreation.randomName()}))}>⟳</button>
                </div>
                <h3 className={"kgH"}>Opens with</h3>
                <dl className={"kgDfn"}>
                    {this.derived(s).map(([k, v]) => (
                        <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>
                    ))}
                    <dt>Rank</dt><dd>{s.roleRank}</dd>
                    <dt>Crew</dt><dd>1 rookie</dd>
                </dl>
                <div className={"kgHr"}/>
                <KgRow hotkey={"R"} label={"Randomize"} value={"roll everything"} onClick={this.randomize}/>
                <KgRow hotkey={"⟲"} label={"Reset"} value={"back to opening"} onClick={this.reset}/>
                <button className={"kgPrim wide"} style={{marginTop: "auto"}}
                        onClick={() => this.props.onDeploy(this.state.spec, false)}>
                    Hit the street ▸
                </button>
            </div>);
    }

    /**
     * The merc on file, ready to go back out. Read-only on purpose: a veteran's
     * numbers are what they earned, and editing them here would quietly mean
     * "start over at level 1". Retiring is the honest way to that, and it says so.
     */
    private veteranBody(career: Career) {
        const role = ROLE_MAP[classFromLegacyRole(career.spec.role)];
        const m = career.merc;
        const first = career.name.split(" ")[0];
        return (
            <div className={"kgBody"}>
                <div className={"kgCol"}>
                    <h3 className={"kgH"}>The merc on file</h3>
                    <dl className={"kgDfn"}>
                        <dt>Name</dt><dd>{career.name}</dd>
                        <dt>Class</dt><dd style={{color: role.color}}>{role.name}</dd>
                        <dt>Level</dt><dd>{m.level}</dd>
                        <dt>Kills</dt><dd>{career.kills}</dd>
                        <dt>Rep</dt><dd>{m.reputation}/10</dd>
                        <dt>Humanity</dt><dd>{m.humanity}/{m.maxHumanity}</dd>
                        <dt>Chrome</dt><dd>{m.chrome.length} line{m.chrome.length === 1 ? "" : "s"}</dd>
                        <dt>Runs</dt><dd>{career.runs}</dd>
                    </dl>
                    <p className={"kgP dim"}>
                        Goes out at Sector 1 in basic kit with a rookie in tow. Levels, training,
                        reputation and chrome come along; gear, eddies and crew never do.
                    </p>
                </div>
                <div className={"kgCol n"} style={{width: "min(360px, 34vw)"}}>
                    <h3 className={"kgH"}>Actions</h3>
                    <KgRow hotkey={"↵"} label={`Send ${first} back out`} on value={`run ${career.runs + 1}`}
                           onClick={() => this.props.onDeploy(this.state.spec, true)}/>
                    <KgRow hotkey={"B"} label={`Retire ${first}`} danger value={"build someone new"}
                           onClick={this.retire}/>
                </div>
            </div>);
    }

    public override render() {
        const s = this.state.spec;
        // The veteran holds the screen until they're retired, at which point
        // this is an ordinary build-a-merc form again.
        const career = this.state.retired ? null : this.props.career;
        const remaining = STAT_BUDGET - this.used(s);
        return (
            <div className={"kg"}>
                <div className={"kgTop"}>
                    <span className={"brand"}>RAINFALL</span>
                    <span>{career ? `Back to work · run ${career.runs + 1}` : "New character"}</span>
                    <span className={"r"}>{career ? career.name : s.name}</span>
                    {!career && <span>Points <b>{STAT_BUDGET - remaining}/{STAT_BUDGET}</b></span>}
                </div>
                {career
                    ? this.veteranBody(career)
                    : <div className={"kgBody"}>
                        {this.classColumn(s)}
                        {this.statColumn(s)}
                        {this.nameColumn(s)}
                    </div>}
                <KgBar>
                    {career
                        ? <React.Fragment>
                            <span className={"keysOnly"}><b>B</b> retire</span>
                            <span className={"r keysOnly"}><b>enter</b> send {career.name.split(" ")[0]} back out · <b>esc</b> back</span>
                        </React.Fragment>
                        : <React.Fragment>
                            <span className={"keysOnly"}><b>a–i</b> class</span>
                            <span className={"keysOnly"}><b>n</b> name · <b>l</b> lifepath · <b>r</b> randomize</span>
                            <span className={"r keysOnly"}><b>enter</b> hit the street · <b>esc</b> back</span>
                        </React.Fragment>}
                    <KgBack onClick={this.props.onCancel}/>
                </KgBar>
            </div>);
    }
}
