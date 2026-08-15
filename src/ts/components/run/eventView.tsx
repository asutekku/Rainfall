import * as React from "react";
import {Actor} from "../../actors/Actor";
import {EventCtx, EventOutcome, GameEvent, makeCtx, odds, rollCheck} from "../../interact/events";

export interface EventViewProps {
    event: GameEvent;
    party: Actor[];
    onDone: (outcome: EventOutcome) => void;
}

interface EventViewState {
    resolved: EventOutcome | null;
}

/**
 * A street encounter: flavor text and 2-4 hard choices. Options can gate on
 * the crew (role, eddies, gear) and can hinge on a visible RED skill check —
 * the odds are shown, the crew's best member steps up, and Luck auto-covers a
 * near miss (and says so). After the choice, the outcome plays out in-view and
 * "Move on" hands control back to the map (or straight into a fight).
 */
export class EventView extends React.Component<EventViewProps, EventViewState> {

    constructor(props: EventViewProps) {
        super(props);
        this.state = {resolved: null};
    }

    private ctx(): EventCtx {
        return makeCtx(this.props.party);
    }

    private choose(idx: number) {
        if (this.state.resolved) { return; }
        const opt = this.props.event.options[idx]!;
        const ctx = this.ctx();
        let success = true, luckSpent = 0;
        const pre: string[] = [];
        if (opt.check) {
            const actor = ctx.best(opt.check.stat);
            const r = rollCheck(actor, opt.check);
            success = r.success; luckSpent = r.luckSpent;
            pre.push(`${actor.name} ${success ? "makes" : "fails"} the ${opt.check.label} check` +
                (luckSpent > 0 ? ` (burned ${luckSpent} Luck)` : "") + ".");
        }
        const out = opt.run(ctx, success, luckSpent);
        this.setState({resolved: {...out, lines: [...pre, ...out.lines]}});
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

    public override render() {
        const e = this.props.event;
        const done = this.state.resolved;
        return (
            <div className={"metaOverlay evWrap"}>
                <div className={"metaHead"}>
                    <span className={"metaTitle"}>◈ {e.title}</span>
                    <span className={"evEddies"}>{Math.floor(this.props.party[0]!.currency)}¥</span>
                </div>
                <div className={"evBody"}>
                    <p className={"evFlavor"}>{e.flavor}</p>
                    {!done && <div className={"evOpts"}>{e.options.map(this.option)}</div>}
                    {done && (
                        <div className={"evResult"}>
                            {done.lines.map((l, i) => <p key={i}>{l}</p>)}
                            <button className={"metaLeave"} onClick={() => this.props.onDone(done)}>
                                {done.combat ? "Weapons out ▸" : "Move on ▸"}
                            </button>
                        </div>
                    )}
                </div>
            </div>);
    }
}
