import * as React from "react";
import {Actor} from "../../actors/Actor";
import {MercOffer} from "../../interact/mercMarket";
import {Purse} from "../../interact/crew";
import {HireBoard} from "./hireBoard";
import {NodeShell} from "./metaOverlay";

export interface FixerViewProps {
    offers: MercOffer[];
    party: Actor[];
    funds: number;
    cap: number;
    onHire: (id: string) => void;
    onLeave: () => void;
}

/**
 * The fixer's table — the mid-sector hire node. It used to be a bare list of
 * names and prices with no hint of what any of it meant; now the place
 * introduces itself: who the fixer is, what hiring buys you, and why the
 * same bodies cost less on the between-sector board.
 */
export class FixerView extends React.Component<FixerViewProps, {}> {
    public override render() {
        const room = this.props.cap - this.props.party.length;
        return (
            <NodeShell accent={"fx"} icon={"☰"} label={"Fixer’s Table"}
                       kicker={"Mid-sector broker"} title={"The Fixer’s Table"}
                       eddies={Purse.balance(this.props.party[0]!)}
                       onLeave={this.props.onLeave} leaveLabel={"Leave ▸"}
                       sub={"A booth at the back of a noodle bar, three phones face-down. " +
                            "The fixer deals in people — hired guns, vouched for, mid-job rates."}
                       guide={<React.Fragment>
                           Hire mercs to fill the squad — they fight beside you, level up, and carry
                           their own gear, <b>but they die for real</b>. {room > 0
                               ? <React.Fragment>Room for <b>{room}</b> more.</React.Fragment>
                               : "The squad is full."} Mid-sector is the expensive way to hire:
                           the board after each boss runs cheaper.
                       </React.Fragment>}>
                <HireBoard offers={this.props.offers} party={this.props.party}
                           funds={this.props.funds} cap={this.props.cap}
                           onHire={this.props.onHire}/>
            </NodeShell>);
    }
}
