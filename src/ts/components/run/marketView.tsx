import * as React from "react";
import {Actor} from "../../actors/Actor";
import {GetItem} from "../../interact/getItem";
import Equipment from "../../items/Equipment";
import armors from "../../items/armors";
import cyberwareData from "../../../objects/cyberware";

export interface MarketViewProps {
    party: Actor[];
    onLeave: () => void;
}

interface Stock { name: string; cost: number; detail: string; buy: (a: Actor) => string; }
interface Fence { owner: Actor; kind: "weapon" | "armor"; idx: number; name: string; price: number; }

interface MarketViewState { notice: string; bought: string[]; version: number; }

/**
 * A Black Market node: a SMALL random stock (this market, this run — adapt to
 * what's on the table), a fence that buys the crew's scavenged gear at street
 * rates, and one service slot. One visit, then it's gone — proper roguelike
 * shop economics instead of the old infinite catalog.
 */
export class MarketView extends React.Component<MarketViewProps, MarketViewState> {

    private stock: Stock[];
    private service: Stock;

    constructor(props: MarketViewProps) {
        super(props);
        this.state = {notice: "", bought: [], version: 0};
        this.stock = MarketView.rollStock(props.party);
        this.service = MarketView.rollService();
    }

    private static rollStock(party: Actor[]): Stock[] {
        const level = party.reduce((m, p) => Math.max(m, p.level), 1);
        const cap = Math.min(5, 2 + Math.floor(level / 2));
        const out: Stock[] = [];
        const guns = Equipment.weapons.filter((w) => w.damageType === "kinetic" && w.cost > 0 && w.rarity <= cap);
        for (let i = 0; i < 3 && guns.length; i++) {
            const w = guns[(Math.random() * guns.length) << 0]!;
            out.push({
                name: w.name, cost: w.cost,
                detail: `${w.weaponType} · ${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}${w.ap ? " AP" : ""}`,
                buy: (a) => { a.inventory.weapons.push(GetItem.weapon(w.name)); return `${w.name} into the duffel.`; },
            });
        }
        const wearable = armors.filter((r) => r.cost > 0);
        for (let i = 0; i < 2 && wearable.length; i++) {
            const r = wearable[(Math.random() * wearable.length) << 0]!;
            out.push({
                name: r.name, cost: r.cost, detail: `${r.bodyPart} · SP ${r.stoppingPower}`,
                buy: (a) => { a.inventory.armor.push(GetItem.armor(r.name)); return `${r.name} bagged.`; },
            });
        }
        const cw = cyberwareData[(Math.random() * cyberwareData.length) << 0]!;
        out.push({
            name: cw.name, cost: cw.cost, detail: `chrome · HL ${cw.humanityLoss} (installed on the spot)`,
            buy: (a) => { a.installCyberware(GetItem.cyberware(cw.name)); return `${cw.name} installed. It itches.`; },
        });
        return out;
    }

    private static rollService(): Stock {
        const r = Math.random();
        if (r < 0.34) {
            return {
                name: "Med-bay patch-up", cost: 90, detail: "service · squad heals 40%",
                buy: () => "The med-bay hums. Everyone breathes easier.",
            };
        }
        if (r < 0.67) {
            return {
                name: "Humanity therapy", cost: 110, detail: "service · squad +5 Humanity",
                buy: () => "An hour of guided empathy calibration. It helps. It actually helps.",
            };
        }
        return {
            name: "Combat stims, clean", cost: 70, detail: "service · squad +6 HP now",
            buy: () => "Pharma-grade, no comedown. The crew steadies.",
        };
    }

    private buy(item: Stock) {
        const leader = this.props.party[0]!;
        if (leader.currency < item.cost) { this.setState({notice: `Not enough eddies (${item.cost}¥).`}); return; }
        leader.currency -= item.cost;
        let line: string;
        if (item.detail.indexOf("service") === 0) {
            line = item.buy(leader);
            if (item.name === "Med-bay patch-up") { this.props.party.forEach((p) => p.heal(Math.floor(p.maxHealth * 0.4))); }
            if (item.name === "Humanity therapy") {
                this.props.party.forEach((p) => {
                    p.humanity = Math.min(p.maxHumanity, p.humanity + 5);
                    p.stats.emp = Math.floor(p.humanity / 10);
                });
            }
            if (item.name === "Combat stims, clean") { this.props.party.forEach((p) => p.heal(6)); }
        } else {
            line = item.buy(leader);
        }
        this.setState({notice: line, bought: this.state.bought.concat(item.name)});
    }

    private fenceList(): Fence[] {
        const out: Fence[] = [];
        this.props.party.forEach((owner) => {
            owner.inventory.weapons.forEach((w, idx) => {
                if (w.name === "Fists") { return; }
                out.push({owner, kind: "weapon", idx, name: w.name, price: Math.max(5, Math.floor(w.cost * 0.4))});
            });
            owner.inventory.armor.forEach((a, idx) => {
                out.push({owner, kind: "armor", idx, name: `${a.name} (SP ${a.stoppingPower})`, price: Math.max(5, Math.floor(a.cost * 0.4))});
            });
        });
        return out;
    }

    private sell(f: Fence) {
        if (f.kind === "weapon") { f.owner.inventory.weapons.splice(f.idx, 1); }
        else { f.owner.inventory.armor.splice(f.idx, 1); }
        f.owner.currency += f.price;
        this.setState({notice: `Fenced the ${f.name} for ${f.price}¥.`, version: this.state.version + 1});
    }

    public override render() {
        const leader = this.props.party[0]!;
        const fence = this.fenceList();
        return (
            <div className={"metaOverlay"}>
                <div className={"metaHead"}>
                    <span className={"metaTitle"}>▤ Black Market</span>
                    <span className={"evEddies"}>{Math.floor(leader.currency)}¥</span>
                    <button className={"metaLeave"} onClick={this.props.onLeave}>Leave ▸</button>
                </div>
                <div className={"mkBody"}>
                    {this.state.notice && <div className={"mkNotice"}>{this.state.notice}</div>}
                    <h4 className={"mkHead"}>Tonight's stock</h4>
                    <div className={"mkStock"}>
                        {[...this.stock, this.service].map((item, i) => {
                            const sold = this.state.bought.indexOf(item.name) >= 0;
                            return (
                                <div key={i} className={"mkItem" + (sold ? " sold" : "")}>
                                    <span className={"mkName"}>{item.name}</span>
                                    <span className={"mkDetail"}>{item.detail}</span>
                                    <button className={"mkBuy"} disabled={sold || leader.currency < item.cost}
                                            onClick={() => this.buy(item)}>
                                        {sold ? "SOLD" : item.cost + "¥"}
                                    </button>
                                </div>);
                        })}
                    </div>
                    <h4 className={"mkHead"}>The fence buys · 40% street rate</h4>
                    {fence.length === 0 && <div className={"mkEmpty"}>Nothing in the duffel worth fencing.</div>}
                    <div className={"mkStock"}>
                        {fence.map((f, i) => (
                            <div key={i} className={"mkItem"}>
                                <span className={"mkName"}>{f.name}</span>
                                <span className={"mkDetail"}>{f.owner.name.split(" ")[0]}'s stash</span>
                                <button className={"mkBuy sellBtn"} onClick={() => this.sell(f)}>+{f.price}¥</button>
                            </div>))}
                    </div>
                </div>
            </div>);
    }
}
