import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Purse} from "../../interact/crew";
import {GetItem} from "../../interact/getItem";
import Equipment from "../../items/Equipment";
import {Weapon} from "../../items/Weapon";
import armors from "../../items/armors";
import cyberwareData from "../../../objects/cyberware";
import {randomMed} from "../../items/consumables";
import {Medical} from "../../items/Scrap";

export interface MarketViewProps {
    party: Actor[];
    onLeave: () => void;
}

interface Stock {
    name: string;
    cost: number;
    detail: string;
    /** Spec rows for the expandable info panel. */
    info: Array<[string, string]>;
    blurb?: string | undefined;
    buy: (a: Actor) => string;
}
interface Fence { owner: Actor; kind: "weapon" | "armor" | "medical" | "misc"; idx: number; name: string; detail: string; price: number; }

interface MarketViewState { notice: string; bought: string[]; version: number; open: string | null; }

const weaponInfo = (w: Weapon): Array<[string, string]> => {
    const rows: Array<[string, string]> = [
        ["Class", `${w.weaponType}${w.weaponClass ? " · " + w.weaponClass : ""}`],
        ["Damage", `${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}${w.ap ? " · armor-piercing" : ""}`],
        ["Fire", `ROF ${w.rateOfFire}${w.autofire ? " · autofire" : ""} · ${w.shots} shots`],
        ["Range", `${w.range}m · ${w.hands}-handed`],
    ];
    if (w.accuracyBonus) { rows.push(["Accuracy", `+${w.accuracyBonus}`]); }
    rows.push(["Build", `rarity ${w.rarity} · reliability ${w.reliability}${w.concealment ? " · concealable" : ""}`]);
    return rows;
};

/**
 * A Black Market node: a SMALL random stock (this market, this run — adapt to
 * what's on the table), a fence that buys the crew's scavenged gear at street
 * rates, and one service slot. Every row folds open for the full spec sheet.
 * One visit, then it's gone — roguelike shop economics.
 */
export class MarketView extends React.Component<MarketViewProps, MarketViewState> {

    private stock: Stock[];
    private service: Stock;

    constructor(props: MarketViewProps) {
        super(props);
        this.state = {notice: "", bought: [], version: 0, open: null};
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
                info: weaponInfo(w),
                blurb: w.manufacturer ? `${w.manufacturer} — serial filed off.` : undefined,
                buy: (a) => { a.inventory.weapons.push(GetItem.weapon(w.name)); return `${w.name} into the duffel.`; },
            });
        }
        const wearable = armors.filter((r) => r.cost > 0);
        for (let i = 0; i < 2 && wearable.length; i++) {
            const r = wearable[(Math.random() * wearable.length) << 0]!;
            out.push({
                name: r.name, cost: r.cost, detail: `${r.bodyPart} · SP ${r.stoppingPower}`,
                info: [
                    ["Slot", r.bodyPart],
                    ["Stopping power", `SP ${r.stoppingPower}`],
                    ["Build", `rarity ${r.rarity}`],
                ],
                buy: (a) => { a.inventory.armor.push(GetItem.armor(r.name)); return `${r.name} bagged.`; },
            });
        }
        const med = randomMed();
        out.push({
            name: med.name, cost: med.cost, detail: `consumable · ${med.restorePoints >= 999 ? "full heal" : "heals " + med.restorePoints + " HP"}`,
            info: [
                ["Effect", med.restorePoints >= 999 ? "restores a member to full HP" : `restores ${med.restorePoints} HP`],
                ["Use", "from the Gear tab, between fights"],
            ],
            blurb: med.description,
            buy: (a) => {
                a.inventory.medical.push(new Medical(med.name, med.cost, med.restorePoints, med.description));
                return `${med.name} into the med pouch.`;
            },
        });
        out.push({
            name: "Crate of frags", cost: 120, detail: "ordnance · +1 grenade per member",
            info: [
                ["Effect", "every standing member pockets one frag grenade"],
                ["Use", "thrown in battle — 6d6 in a blast radius, armour halved"],
            ],
            blurb: "Militech surplus, crate stencils sanded off.",
            buy: () => {
                party.forEach((m) => { if (m.canFight()) { m.grenades += 1; } });
                return "Frags handed round. Everyone stands a little straighter.";
            },
        });
        const cw = cyberwareData[(Math.random() * cyberwareData.length) << 0]!;
        out.push({
            name: cw.name, cost: cw.cost, detail: `chrome · HL ${cw.humanityLoss} (installed on the spot)`,
            info: [
                ["Slot", cw.slot],
                ["Humanity loss", `${cw.humanityLoss}`],
                ["Install", "on the spot, no anaesthetic surcharge"],
            ],
            blurb: cw.description,
            buy: (a) => { a.installCyberware(GetItem.cyberware(cw.name)); return `${cw.name} installed. It itches.`; },
        });
        return out;
    }

    private static rollService(): Stock {
        const r = Math.random();
        if (r < 0.34) {
            return {
                name: "Med-bay patch-up", cost: 90, detail: "service · squad heals 40%",
                info: [["Effect", "every member heals 40% of max HP"]],
                buy: () => "The med-bay hums. Everyone breathes easier.",
            };
        }
        if (r < 0.67) {
            return {
                name: "Humanity therapy", cost: 110, detail: "service · squad +5 Humanity",
                info: [["Effect", "every member regains 5 Humanity"]],
                buy: () => "An hour of guided empathy calibration. It helps. It actually helps.",
            };
        }
        return {
            name: "Combat stims, clean", cost: 70, detail: "service · squad +6 HP now",
            info: [["Effect", "every member heals 6 HP immediately"]],
            buy: () => "Pharma-grade, no comedown. The crew steadies.",
        };
    }

    private buy(item: Stock) {
        const leader = this.props.party[0]!;
        if (!Purse.spend(leader, item.cost)) { this.setState({notice: `Not enough eddies (${item.cost}¥).`}); return; }
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

    /** Street rate: 40%, plus 5% per rank of the crew's best Fixer ("Operator"). */
    private fenceRate(): number {
        const op = this.props.party.reduce((m, p) => Math.max(m, p.operatorBonus()), 0);
        return 0.4 + op * 0.05;
    }

    private fenceList(): Fence[] {
        const rate = this.fenceRate();
        const out: Fence[] = [];
        this.props.party.forEach((owner) => {
            owner.inventory.weapons.forEach((w, idx) => {
                if (w.name === "Fists") { return; }
                out.push({
                    owner, kind: "weapon", idx, name: w.name,
                    detail: `${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}${w.ap ? " AP" : ""} · ${owner.name.split(" ")[0]}'s stash`,
                    price: Math.max(5, Math.floor(w.cost * rate)),
                });
            });
            owner.inventory.armor.forEach((a, idx) => {
                out.push({
                    owner, kind: "armor", idx, name: a.name,
                    detail: `SP ${a.stoppingPower} · ${owner.name.split(" ")[0]}'s stash`,
                    price: Math.max(5, Math.floor(a.cost * rate)),
                });
            });
            owner.inventory.misc.forEach((m, idx) => {
                out.push({
                    owner, kind: "misc", idx, name: m.name,
                    detail: `junk · ${owner.name.split(" ")[0]}'s stash`,
                    price: Math.max(2, Math.floor((m.cost || 0) * rate)),
                });
            });
        });
        return out;
    }

    private sell(f: Fence) {
        if (f.kind === "weapon") { f.owner.inventory.weapons.splice(f.idx, 1); }
        else if (f.kind === "misc") { f.owner.inventory.misc.splice(f.idx, 1); }
        else { f.owner.inventory.armor.splice(f.idx, 1); }
        Purse.earn(f.owner, f.price);
        this.setState({notice: `Fenced the ${f.name} for ${f.price}¥.`, version: this.state.version + 1});
    }

    private toggleInfo(key: string) {
        this.setState({open: this.state.open === key ? null : key});
    }

    private item(item: Stock, key: string) {
        const leader = this.props.party[0]!;
        const sold = this.state.bought.indexOf(item.name) >= 0;
        const open = this.state.open === key;
        return (
            <div key={key} className={"mkItem" + (sold ? " sold" : "") + (open ? " open" : "")}>
                <button className={"mkRow"} onClick={() => this.toggleInfo(key)}
                        aria-expanded={open}>
                    <span className={"mkChevron"}>›</span>
                    <span className={"mkNameWrap"}>
                        <span className={"mkName"}>{item.name}</span>
                        <span className={"mkDetail"}>{item.detail}</span>
                    </span>
                </button>
                <button className={"mkBuy"} disabled={sold || !Purse.canAfford(leader, item.cost)}
                        onClick={() => this.buy(item)}>
                    {sold ? "SOLD" : item.cost + "¥"}
                </button>
                <div className={"mkInfo"}>
                    <div className={"mkInfoBody"}>
                        {item.blurb && <p className={"mkBlurb"}>{item.blurb}</p>}
                        <dl className={"mkSpecs"}>
                            {item.info.map(([k, v], i) => (
                                <div key={i} className={"mkSpec"}><dt>{k}</dt><dd>{v}</dd></div>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>);
    }

    public override render() {
        const leader = this.props.party[0]!;
        const fence = this.fenceList();
        return (
            <div className={"metaOverlay mkWrap"}>
                <div className={"metaHead"}>
                    <span className={"metaTitle"}>▤ Black Market</span>
                    <span className={"evEddies"}>{Math.floor(Purse.balance(leader))}¥</span>
                    <button className={"metaLeave"} onClick={this.props.onLeave}>Leave ▸</button>
                </div>
                <div className={"ovScroll"}>
                    <div className={"ovInner"}>
                        <div className={"mHero mk"}>
                            <span className={"mHeroGlyph"}><i>▤</i></span>
                            <span className={"mHeroKicker"}>Night market</span>
                            <h2 className={"mHeroTitle"}>Tonight's Stock</h2>
                            <p className={"mHeroSub"}>What fell off a truck this week. Tap a row for the spec sheet.</p>
                        </div>
                        {this.state.notice && <div className={"mkNotice"}>{this.state.notice}</div>}
                        <div className={"mkStock"}>
                            {[...this.stock, this.service].map((item, i) => this.item(item, "s" + i))}
                        </div>
                        <h4 className={"mkHead"}>The fence buys · {Math.round(this.fenceRate() * 100)}% street rate{this.fenceRate() > 0.4 ? " (Operator\u2019s cut)" : ""}</h4>
                        {fence.length === 0 && <div className={"mkEmpty"}>Nothing in the duffel worth fencing.</div>}
                        <div className={"mkStock"}>
                            {fence.map((f, i) => (
                                <div key={"f" + i} className={"mkItem"}>
                                    <div className={"mkRow static"}>
                                        <span className={"mkNameWrap"}>
                                            <span className={"mkName"}>{f.name}</span>
                                            <span className={"mkDetail"}>{f.detail}</span>
                                        </span>
                                    </div>
                                    <button className={"mkBuy sellBtn"} onClick={() => this.sell(f)}>+{f.price}¥</button>
                                </div>))}
                        </div>
                    </div>
                </div>
            </div>);
    }
}
