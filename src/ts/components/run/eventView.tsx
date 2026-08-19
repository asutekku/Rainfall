import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Purse} from "../../interact/crew";
import {EventCheck, EventCtx, EventOutcome, GameEvent, makeCtx, odds, rollCheck} from "../../interact/events";
import {Beat, Beats} from "../general/beats";
import {NodeShell} from "./metaOverlay";

export interface EventViewProps {
    event: GameEvent;
    party: Actor[];
    onDone: (outcome: EventOutcome) => void;
}

/** The d10 spinning on screen while a check resolves. */
interface Rolling {
    actor: Actor;
    check: EventCheck;
    optIdx: number;
    face: number;                 // the number currently showing
    landed: boolean;              // stopped on the real roll
    result: {success: boolean; luckSpent: number; roll: number; total: number; stat: number} | null;
}

interface EventViewState {
    /** The stage on screen — two-stage encounters swap this out mid-scene. */
    event: GameEvent;
    resolved: EventOutcome | null;
    rolling: Rolling | null;
    /** The outcome beats have finished landing — the way out can show. */
    played: boolean;
    /** Feed lines carried over from earlier stages of this encounter. */
    carried: string[];
}

/**
 * A street encounter: hero header, flavor and 2-4 hard choices. Options can
 * gate on the crew (role, eddies, gear) and can hinge on a RED skill check —
 * the odds are shown up front, and choosing one spins a d10 on screen before
 * the outcome lands (Luck auto-covers a near miss, and says so). "Move on"
 * hands control back to the map (or straight into a fight).
 */
export class EventView extends React.Component<EventViewProps, EventViewState> {

    private spinTimer: number | null = null;
    private reduced = typeof window !== "undefined" && window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    constructor(props: EventViewProps) {
        super(props);
        this.state = {event: props.event, resolved: null, rolling: null, played: false, carried: []};
    }

    public override componentWillUnmount() {
        if (this.spinTimer !== null) { window.clearInterval(this.spinTimer); }
    }

    private ctx(): EventCtx {
        return makeCtx(this.props.party);
    }

    private choose(idx: number) {
        if (this.state.resolved || this.state.rolling) { return; }
        const opt = this.state.event.options[idx]!;
        const ctx = this.ctx();
        if (!opt.check || this.reduced) {
            this.resolve(idx, ctx);
            return;
        }
        // spin the die: cycle faces fast, slow down, land on the real roll
        const actor = ctx.best(opt.check.stat);
        this.setState({rolling: {actor, check: opt.check, optIdx: idx, face: 1 + ((Math.random() * 10) << 0), landed: false, result: null}});
        let ticks = 0;
        this.spinTimer = window.setInterval(() => {
            ticks++;
            const r = this.state.rolling;
            if (!r) { return; }
            if (ticks < 12) {
                this.setState({rolling: {...r, face: 1 + ((Math.random() * 10) << 0)}});
                return;
            }
            window.clearInterval(this.spinTimer!);
            this.spinTimer = null;
            const result = rollCheck(r.actor, r.check);
            this.setState({rolling: {...r, face: Math.max(1, Math.min(10, result.roll)), landed: true, result}});
            // hold the landed die a beat, then play the outcome
            window.setTimeout(() => this.resolve(idx, this.ctx(), result), 950);
        }, 75) as any;
    }

    private resolve(idx: number, ctx: EventCtx, pre?: {success: boolean; luckSpent: number}) {
        const opt = this.state.event.options[idx]!;
        let success = true, luckSpent = 0;
        const lines: string[] = [];
        if (opt.check) {
            const actor = this.state.rolling ? this.state.rolling.actor : ctx.best(opt.check.stat);
            const r = pre || rollCheck(actor, opt.check);
            success = r.success; luckSpent = r.luckSpent;
            lines.push(`${actor.name} ${success ? "makes" : "fails"} the ${opt.check.label} check` +
                (luckSpent > 0 ? ` (burned ${luckSpent} Luck)` : "") + ".");
        }
        const out = opt.run(ctx, success, luckSpent);
        this.setState({resolved: {...out, lines: [...lines, ...out.lines]}, rolling: null, played: false});
    }

    private option = (opt: GameEvent["options"][number], i: number) => {
        const ctx = this.ctx();
        const blocked = opt.req ? opt.req(ctx) : null;
        const chk = opt.check;
        const actor = chk ? ctx.best(chk.stat) : null;
        return (
            <button key={i} className={"evOpt"} disabled={!!blocked || !!this.state.resolved}
                    onClick={() => this.choose(i)}>
                <span className={"evOptLabel"}>{opt.label}</span>
                <span className={"evOptMeta"}>
                    {blocked ? <em className={"evNo"}>{blocked}</em> : null}
                    {!blocked && chk && actor ? <em className={"evOdds"}>{chk.stat.toUpperCase()} check · {actor.name.split(" ")[0]} · ~{odds(actor, chk)}%</em> : null}
                    {!blocked && opt.detail ? <em>{opt.detail}</em> : null}
                </span>
            </button>);
    };

    /** The outcome, told a line at a time — the register every node speaks in now. */
    private static toBeats(lines: string[]): Beat[] {
        return lines.map((text) => {
            const hurt = /loses \d+ HP|takes \d+|bleed|flatline|HP and/i.test(text);
            const tone = /fails the .* check/.test(text) ? "bad" as const
                : /makes the .* check/.test(text) ? "ok" as const
                : hurt ? "bad" as const
                : /\+\d+¥|¥ richer|eddies|payday/i.test(text) ? "gold" as const
                : /^—.*—$/.test(text) ? "dim" as const
                : "sys" as const;
            return {text, tone, ...(hurt ? {glitch: true} : {}), ...(tone === "bad" || tone === "gold" ? {hold: 1.4} : {})};
        });
    }

    /** The situation turns: swap the next stage in, keeping the story so far. */
    private nextStage = () => {
        const done = this.state.resolved;
        if (!done || !done.next) { return; }
        this.setState({
            event: done.next, resolved: null, rolling: null, played: false,
            carried: [...this.state.carried, ...done.lines],
        });
    };

    /** All stages' lines, in order, for the feed. */
    private finish = () => {
        const done = this.state.resolved;
        if (!done) { return; }
        this.props.onDone({...done, lines: [...this.state.carried, ...done.lines]});
    };

    /** The d10 spinner takeover while a check resolves. */
    private roller(r: Rolling) {
        const cls = "evDie" + (r.landed ? (r.result!.success ? " win" : " lose") : " spin");
        return (
            <div className={"evRoll"}>
                <span className={"evRollWho"}>{r.actor.name.split(" ")[0]} · {r.check.label}</span>
                <span className={cls}><i>{r.face}</i></span>
                <span className={"evRollMath" + (r.landed ? " show" : "")}>
                    {r.landed
                        ? `${r.result!.roll} + ${r.check.stat.toUpperCase()} ${r.result!.stat}` +
                          (r.result!.luckSpent ? ` + ${r.result!.luckSpent} LUCK` : "") +
                          ` = ${r.result!.total} vs DV ${r.check.dv}`
                        : `d10 + ${r.check.stat.toUpperCase()} vs DV ${r.check.dv}`}
                </span>
                {r.landed && <span className={"evRollVerdict " + (r.result!.success ? "win" : "lose")}>
                    {r.result!.success ? "SUCCESS" : "FAILED"}
                </span>}
            </div>);
    }

    public override render() {
        const e = this.state.event;
        const done = this.state.resolved;
        const rolling = this.state.rolling;
        const played = this.state.played;
        return (
            <NodeShell accent={"ev"} icon={"◈"} label={"Encounter"}
                       kicker={"Street encounter"} title={e.title}
                       sub={e.flavor}
                       eddies={Purse.balance(this.props.party[0]!)}
                       guide={!done && !rolling && this.state.carried.length === 0
                           ? <React.Fragment>
                               Pick <b>one</b> — the run moves on after. Greyed options say what they need;
                               a <b>check</b> rolls a d10 + the named stat, and the odds shown are yours.
                           </React.Fragment>
                           : undefined}
                       foot={done && played
                           ? done.next
                               ? <button className={"metaLeave"} onClick={this.nextStage}>
                                   It's not over ▸
                               </button>
                               : <button className={"metaLeave"} onClick={this.finish}>
                                   {done.combat ? "Weapons out ▸" : "Move on ▸"}
                               </button>
                           : null}>
                {rolling && this.roller(rolling)}
                {!done && !rolling && <div className={"evOpts"}>{e.options.map(this.option)}</div>}
                {done && (
                    <div className={"evResult"}>
                        <Beats key={e.id + this.state.carried.length}
                               beats={EventView.toBeats(done.lines)}
                               onDone={() => this.setState({played: true})}/>
                    </div>
                )}
            </NodeShell>);
    }
}
