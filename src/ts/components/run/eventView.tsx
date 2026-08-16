import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Purse} from "../../interact/crew";
import {EventCheck, EventCtx, EventOutcome, GameEvent, makeCtx, odds, rollCheck} from "../../interact/events";
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
    resolved: EventOutcome | null;
    rolling: Rolling | null;
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
        this.state = {resolved: null, rolling: null};
    }

    public override componentWillUnmount() {
        if (this.spinTimer !== null) { window.clearInterval(this.spinTimer); }
    }

    private ctx(): EventCtx {
        return makeCtx(this.props.party);
    }

    private choose(idx: number) {
        if (this.state.resolved || this.state.rolling) { return; }
        const opt = this.props.event.options[idx]!;
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
        const opt = this.props.event.options[idx]!;
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
        this.setState({resolved: {...out, lines: [...lines, ...out.lines]}, rolling: null});
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
        const e = this.props.event;
        const done = this.state.resolved;
        const rolling = this.state.rolling;
        return (
            <NodeShell accent={"ev"} icon={"◈"} label={"Encounter"}
                       kicker={"Street encounter"} title={e.title}
                       sub={e.flavor}
                       eddies={Purse.balance(this.props.party[0]!)}
                       guide={!done && !rolling
                           ? <React.Fragment>
                               Pick <b>one</b> — the run moves on after. Greyed options say what they need;
                               a <b>check</b> rolls a d10 + the named stat, and the odds shown are yours.
                           </React.Fragment>
                           : undefined}>
                {rolling && this.roller(rolling)}
                {!done && !rolling && <div className={"evOpts"}>{e.options.map(this.option)}</div>}
                {done && (
                    <div className={"evResult"}>
                        {done.lines.map((l, i) => <p key={i} style={{animationDelay: `${i * 0.12}s`}}>{l}</p>)}
                        <button className={"metaLeave"} onClick={() => this.props.onDone(done)}>
                            {done.combat ? "Weapons out ▸" : "Move on ▸"}
                        </button>
                    </div>
                )}
            </NodeShell>);
    }
}
