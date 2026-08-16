import * as React from "react";

export interface NodeShellProps {
    /** Colorway key — ev / mk / sh / net / aug / fx — themes the title bar and hero. */
    accent: string;
    /** The glyph in the hero diamond, repeated small in the title bar. */
    icon: string;
    /** Title-bar name of the place. */
    label: string;
    /** Small uppercase line above the hero title — the place's category. */
    kicker: string;
    /** Hero title. */
    title: string;
    /** What this place IS — one or two sentences of themed description. */
    sub?: React.ReactNode;
    /** What you DO here — one imperative sentence, shown boxed under the hero. */
    guide?: React.ReactNode;
    /** Crew purse readout in the title bar. */
    eddies?: number | undefined;
    /** Humanity readout in the title bar (current / max). */
    hum?: [number, number] | undefined;
    onLeave?: (() => void) | undefined;
    leaveLabel?: string | undefined;
    /** Quiet leave variant — for skipping a place that hasn't been used yet. */
    leaveGhost?: boolean | undefined;
    children: React.ReactNode;
}

/**
 * The shared frame for every non-combat map node — encounter, market,
 * safehouse, NET access, fixer's table, chrome claim. One layout language:
 * a themed title bar, a centred hero (diamond glyph, kicker, title, themed
 * description), and a one-line guide that says what the player actually does
 * here. Views supply only their content and their words.
 *
 * Screens were explaining themselves inconsistently — the fixer's table said
 * nothing at all — so the shell makes the explanation a required part of the
 * layout instead of something each view remembers to add.
 */
export class NodeShell extends React.Component<NodeShellProps, {}> {
    public override render() {
        const p = this.props;
        return (
            <div className={"metaOverlay nodeWrap " + p.accent + "Wrap"}>
                <div className={"metaHead"}>
                    <span className={"metaTitle"}>{p.icon} {p.label}</span>
                    {p.eddies !== undefined && <span className={"evEddies"}>{Math.floor(p.eddies)}¥</span>}
                    {p.hum && <span className={"evEddies"}>HUM {p.hum[0]}/{p.hum[1]}</span>}
                    {p.onLeave && (
                        <button className={p.leaveGhost ? "metaLeaveGhost" : "metaLeave"} onClick={p.onLeave}>
                            {p.leaveLabel || "Leave ▸"}
                        </button>)}
                </div>
                <div className={"ovScroll"}>
                    <div className={"ovInner"}>
                        <div className={"mHero " + p.accent}>
                            <span className={"mHeroGlyph"}><i>{p.icon}</i></span>
                            <span className={"mHeroKicker"}>{p.kicker}</span>
                            <h2 className={"mHeroTitle"}>{p.title}</h2>
                            {p.sub && <p className={"mHeroSub"}>{p.sub}</p>}
                        </div>
                        {p.guide && <p className={"mGuide"}>{p.guide}</p>}
                        {p.children}
                    </div>
                </div>
            </div>);
    }
}
