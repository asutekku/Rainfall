import * as React from "react";
import {Actor} from "../../actors/Actor";
import {MercOffer} from "../../interact/mercMarket";
import {HireBoard} from "./hireBoard";

export interface SectorClearViewProps {
    sector: number;
    funds: number;
    party: Actor[];
    offers: MercOffer[];
    cap: number;
    onHire: (id: string) => void;
    onContinue: () => void;
}

/**
 * Between sectors. The boss is down, the crew is patched up, and the street
 * has fresh talent on offer before the next city over. Hiring here is the
 * cheap option — the fixer's table mid-sector charges a premium for the same
 * bodies — so this is where a payday is meant to be spent.
 */
export class SectorClearView extends React.Component<SectorClearViewProps, {}> {

    private member = (a: Actor, i: number) => {
        const hp = Math.max(0, Math.min(100, (a.health / Math.max(1, a.maxHealth)) * 100));
        return (
            <li key={i} className={"scMember"}>
                <img src={a.role.portrait} alt={a.role.name}/>
                <span className={"scWho"}>
                    <b>{a.name}</b>
                    <i>{a.role.name} · L{a.level}{a.hireable ? "" : " · you"}</i>
                </span>
                <span className={"scBar"}><i style={{width: hp + "%"}}/></span>
            </li>);
    };

    public override render() {
        return (
            <div className={"sectorClear"}>
                <div className={"scCard"}>
                    <div className={"scHead"}>
                        <h1>SECTOR {this.props.sector} CLEAR</h1>
                        <p>The boss is cold and the block is yours. Sector {this.props.sector + 1} is worse.</p>
                        <p className={"scHint"}>
                            Spend the payday now — this board is the cheapest hiring in the game
                            (the fixer mid-sector marks the same talent up). Four walk onto each
                            street, so a deeper payroll buys you somebody to bench the wounded for.
                        </p>
                    </div>

                    <div className={"scCols"}>
                        <div className={"scBlock"}>
                            <h2>Crew <b>{this.props.funds}¥</b></h2>
                            <ul className={"scMembers"}>{this.props.party.map(this.member)}</ul>
                        </div>

                        <div className={"scBlock"}>
                            <h2>For hire</h2>
                            <HireBoard offers={this.props.offers} party={this.props.party}
                                       funds={this.props.funds} cap={this.props.cap}
                                       onHire={this.props.onHire}/>
                        </div>
                    </div>

                    <div className={"scActions"}>
                        <button className={"prim"} onClick={this.props.onContinue}>
                            Sector {this.props.sector + 1} ▸
                        </button>
                    </div>
                </div>
            </div>);
    }
}
