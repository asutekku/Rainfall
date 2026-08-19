import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Economy} from "../../interact/economy";
import {Beat, Beats} from "../general/beats";
import {NodeShell} from "./metaOverlay";

export interface SafehouseViewProps {
    party: Actor[];
    /** Leave with the night's summary — and, off a watch shift, fresh map intel. */
    onLeave: (lines: string[], reveal?: number) => void;
}

interface SafehouseViewState {
    /** The chosen night, playing or played. */
    night: {beats: Beat[]; summary: string; reveal?: number} | null;
    played: boolean;
}

/**
 * The campfire choice: one night in a safehouse buys exactly ONE of —
 * patching up, drilling, decompressing, or whatever the fourth thing is
 * tonight. The mechanics land the moment you choose; the screen then plays
 * the night in cuts, naming the actual crew, because a line like "Ricardo
 * cheats at cards and nobody calls it" is the entire reason to rest at all.
 */
export class SafehouseView extends React.Component<SafehouseViewProps, SafehouseViewState> {

    /** Tonight's fourth option — rolled once, different safehouses offer different nights. */
    private extra: "watch" | "forge" = Math.random() < 0.5 ? "watch" : "forge";

    constructor(props: SafehouseViewProps) {
        super(props);
        this.state = {night: null, played: false};
    }

    /** First names to hang the vignette on — the crew, or "you" alone. */
    private names(): string[] {
        const out = this.props.party.map((p) => p.name.split(" ")[0]!);
        return out.length ? out : ["you"];
    }

    private n(i: number): string {
        const names = this.names();
        return names[i % names.length]!;
    }

    private patch = () => {
        this.props.party.forEach((p) => {
            if (p.mortallyWounded) { p.stabilize(); }
            p.heal(Math.floor(p.maxHealth * 0.5));
        });
        const solo = this.props.party.length === 1;
        this.setState({played: false, night: {
            summary: "Field dressings, hot water, four hours of real sleep. The squad heals half its wounds.",
            beats: [
                {text: "The stove hisses. Water goes on. Kits open on the table.", tone: "dim"},
                solo
                    ? {text: `${this.n(0)} does their own sutures in the mirror, swearing quietly at each one.`, tone: "sys"}
                    : {text: `${this.n(0)} does the sutures; ${this.n(1)} holds the light and doesn't look away.`, tone: "sys"},
                {text: "Somebody finds real coffee in a cupboard. It gets rationed like ammunition.", tone: "sys"},
                {text: "Four hours of sleep behind a door that holds. It's enough. It has to be.", tone: "dim"},
                {text: "By dawn the bandages are brown and the faces are better — half the damage, gone.", tone: "ok"},
            ],
        }});
    };

    private drill = () => {
        this.props.party.forEach((p) => p.trainWeaponSkill());
        this.setState({played: false, night: {
            summary: "Dry-fire drills in the stairwell until dawn. Everyone's weapon handling sharpens (+1 skill).",
            beats: [
                {text: "Furniture against the walls. The stairwell becomes a kill house.", tone: "dim"},
                {text: `${this.n(0)} calls the drills: draw, clear, reload, again. Again. Again.`, tone: "sys"},
                {text: `${this.n(1)} misses the same dry snap twice and runs it fifty more times out of spite.`, tone: "sys"},
                {text: "By 4am nobody's hands are thinking any more. That's the point.", tone: "dim"},
                {text: "Dawn. Everyone's weapon handling is sharper — +1 skill, and it stays.", tone: "ok"},
            ],
        }});
    };

    private decompress = () => {
        this.props.party.forEach((p) => {
            p.humanity = Math.min(p.maxHumanity, p.humanity + 6);
            p.stats.emp = Math.floor(p.humanity / 10);
            p.refreshLuck();
        });
        this.setState({played: false, night: {
            summary: "Music, bad jokes, no screens. The crew remembers what they're doing this for (+6 Humanity, Luck restored).",
            beats: [
                {text: "Weapons stay by the door. House rule, invented tonight.", tone: "dim"},
                {text: `${this.n(0)} finds a music chip in the couch. It's terrible. It stays on.`, tone: "sys"},
                {text: `${this.n(1)} cheats at cards, badly and obviously. Nobody calls it.`, tone: "sys"},
                {text: "Stories get told with the body counts left out. Everyone knows. Nobody minds.", tone: "sys"},
                {text: "For one night the chrome is just jewellery. +6 Humanity, Luck refilled, everyone.", tone: "ok"},
            ],
        }});
    };

    private watch = () => {
        this.setState({played: false, night: {
            summary: "A night on the roof with optics zoomed. The district maps itself.",
            reveal: 2,
            beats: [
                {text: "The roof access sticks, then gives. Cold air, city glow, rain like static.", tone: "dim"},
                {text: `${this.n(0)} takes first watch, optics dialled to maximum, drawing the district one street at a time.`, tone: "sys"},
                {text: "Patrol routes. Light patterns. Which corners the vans avoid, and why.", tone: "sys"},
                {text: `${this.n(1)} takes the dead shift and finds what the first shift missed.`, tone: "sys"},
                {text: "By dawn the map knows more than it did.", tone: "ok"},
            ],
        }});
    };

    private forge = () => {
        this.props.party.forEach((p) => Economy.repairArmor(p));
        this.setState({played: false, night: {
            summary: "A night at the workbench. Every plate hammered back to true.",
            beats: [
                {text: "There's a workbench under the dust sheet. A real one, with a vice.", tone: "dim"},
                {text: `${this.n(0)} strips the plates and lays out every dent like evidence.`, tone: "sys"},
                {text: "Hammer, heat gun, resin. The night smells like burnt polymer and progress.", tone: "sys"},
                {text: `${this.n(1)} falls asleep holding a chest plate like a pillow. It gets photographed.`, tone: "sys"},
                {text: "Morning kit check: every plate rings true again — armour repaired, everyone.", tone: "ok"},
            ],
        }});
    };

    public override render() {
        const night = this.state.night;
        const extra = this.extra;
        return (
            <NodeShell accent={"sh"} icon={"☾"} label={"Safehouse"}
                       kicker={"One night off the street"} title={"Safehouse"}
                       sub={"A cold-water flat with a working lock and a mattress that's seen worse. " +
                            "The whole squad gets one night behind a door that holds."}
                       foot={night
                           ? (this.state.played
                               ? <button className={"metaLeave"}
                                         onClick={() => this.props.onLeave([night.summary], night.reveal)}>
                                   Move out ▸
                               </button>
                               : null)
                           : <button className={"metaLeaveGhost"}
                                     onClick={() => this.props.onLeave(["— no time to rest —"])}>
                               Skip the night ▸
                           </button>}
                       guide={!night
                           ? <React.Fragment>
                               Pick <b>one</b> way to spend the night — it applies to the whole squad,
                               and the others are gone by morning.
                           </React.Fragment>
                           : undefined}>
                <div className={"shWindow"} aria-hidden={true}>
                    <i className={"shSky"}/><i className={"shRain"}/><i className={"shRain two"}/>
                </div>
                {!night && (
                    <div className={"evOpts"}>
                        <button className={"evOpt"} onClick={this.patch}>
                            <span className={"evOptLabel"}>Patch up</span>
                            <span className={"evOptMeta"}><em>squad heals 50% of max HP · stabilises the dying</em></span>
                        </button>
                        <button className={"evOpt"} onClick={this.drill}>
                            <span className={"evOptLabel"}>Run combat drills</span>
                            <span className={"evOptMeta"}><em>everyone +1 to their equipped weapon skill, permanently</em></span>
                        </button>
                        <button className={"evOpt"} onClick={this.decompress}>
                            <span className={"evOptLabel"}>Decompress</span>
                            <span className={"evOptMeta"}><em>squad +6 Humanity · Luck pools refill to full</em></span>
                        </button>
                        {extra === "watch"
                            ? <button className={"evOpt"} onClick={this.watch}>
                                <span className={"evOptLabel"}>Stand watch on the roof</span>
                                <span className={"evOptMeta"}><em>this one has roof access — chart 2 waypoints on the map</em></span>
                            </button>
                            : <button className={"evOpt"} onClick={this.forge}>
                                <span className={"evOptLabel"}>Work the bench</span>
                                <span className={"evOptMeta"}><em>this one has tools — every plate hammered back out (armour repaired)</em></span>
                            </button>}
                    </div>
                )}
                {night && (
                    <div className={"evResult"}>
                        <Beats beats={night.beats} onDone={() => this.setState({played: true})}/>
                    </div>
                )}
            </NodeShell>);
    }
}
