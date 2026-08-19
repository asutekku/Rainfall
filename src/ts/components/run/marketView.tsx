import * as React from "react";
import {Actor} from "../../actors/Actor";
import {AugOffer, Chrome} from "../../interact/chrome";
import {Crew, Purse, Stash} from "../../interact/crew";
import {KIT, KIT_ORDER, KIT_PICKS} from "../../interact/loadout";
import {Economy} from "../../interact/economy";
import {GetItem} from "../../interact/getItem";
import Equipment from "../../items/Equipment";
import {Weapon} from "../../items/Weapon";
import armors from "../../items/armors";
import {randomMed} from "../../items/consumables";
import {Medical} from "../../items/Scrap";
import {EventCheck, makeCtx, odds, rollCheck} from "../../interact/events";
import {Gear} from "../../interact/gear";
import {NodeShell} from "./metaOverlay";

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

interface MarketViewState {
    notice: string; bought: string[]; version: number; open: string | null; rerolled: boolean;
    /** One haggle per visit: untried, won (prices drop), or blown (they stand). */
    haggle: "open" | "won" | "lost";
}

/**
 * Who's behind the counter tonight. The archetype bends the whole stall —
 * what's in the crate, what the fence pays, how deep the ripperdoc's shelf
 * goes — so "a market" stops being one list and starts being a person.
 */
interface Vendor {
    kind: string;
    name: string;
    patter: string;
    extraGuns: number;
    rarityBump: number;
    extraMeds: number;
    fenceBonus: number;
    chromeCount: number;
    priceMod: number;
}

const VENDOR_NAMES = ["Mama Chen", "Rossi", "Deacon", "Old Wire", "Kansas", "Suki", "Vartan", "The Twins"];

const VENDORS: Array<Omit<Vendor, "name">> = [
    {kind: "Gun Runner", patter: "\"Everything on this table has a history. None of it has a serial.\"",
        extraGuns: 2, rarityBump: 1, extraMeds: 0, fenceBonus: 0, chromeCount: 2, priceMod: 1},
    {kind: "Surplus Medic", patter: "\"Field-expired is a paperwork term. Bodies don't read paperwork.\"",
        extraGuns: 0, rarityBump: 0, extraMeds: 2, fenceBonus: 0, chromeCount: 2, priceMod: 0.95},
    {kind: "Scav Fence", patter: "\"You sell, I don't ask. You buy, you don't ask. Beautiful system.\"",
        extraGuns: 0, rarityBump: 0, extraMeds: 0, fenceBonus: 0.1, chromeCount: 2, priceMod: 0.9},
    {kind: "Chrome Den", patter: "\"The chair's clean. The chrome's cleaner. Your Humanity's your own problem.\"",
        extraGuns: 0, rarityBump: 0, extraMeds: 0, fenceBonus: 0, chromeCount: 4, priceMod: 1},
];

const rollVendor = (): Vendor => ({
    ...VENDORS[(Math.random() * VENDORS.length) << 0]!,
    name: VENDOR_NAMES[(Math.random() * VENDOR_NAMES.length) << 0]!,
});

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

    private vendor: Vendor;
    private stock: Stock[];
    private service: Stock;
    private chromeStock: AugOffer[];
    private backroom: Stock | null;

    /** REP that opens the back room — the street vouching for you. */
    private static readonly BACKROOM_REP = 4;

    constructor(props: MarketViewProps) {
        super(props);
        this.state = {notice: "", bought: [], version: 0, open: null, rerolled: false, haggle: "open"};
        this.vendor = rollVendor();
        this.stock = MarketView.rollStock(props.party, this.vendor);
        this.service = MarketView.rollService();
        this.chromeStock = Chrome.shopOffers(props.party[0]!, this.vendor.chromeCount);
        this.backroom = MarketView.rollBackroom();
    }

    /**
     * The case under the counter: one genuinely rare piece, shown to everyone
     * and sold only to a name the street vouches for. Reputation finally buys
     * something you can hold.
     */
    private static rollBackroom(): Stock | null {
        const rare = Equipment.weapons.filter((w) =>
            w.damageType === "kinetic" && w.cost > 0 && w.rarity >= 4);
        if (!rare.length) { return null; }
        const w = rare[(Math.random() * rare.length) << 0]!;
        return {
            name: w.name, cost: Math.round(w.cost * 1.15),
            detail: `back room · ${w.weaponType} · ${Gear.dmg(w)}`,
            info: weaponInfo(w),
            blurb: "It comes out of the case wrapped in cloth, like it's owed that.",
            buy: (a) => { Stash.of(a).weapons.push(GetItem.weapon(w.name)); return `The ${w.name}, wrapped and handed over like a ceremony.`; },
        };
    }

    private static rollStock(party: Actor[], vendor: Vendor): Stock[] {
        const level = party.reduce((m, p) => Math.max(m, p.level), 1);
        const cap = Math.min(5, 2 + Math.floor(level / 2) + vendor.rarityBump);
        const out: Stock[] = [];
        // Vendor-Handshake chrome: the back room opens — more guns on the table.
        const extra = (party[0] ? party[0].chromeNum("stockBonus") : 0) + vendor.extraGuns;
        const guns = Equipment.weapons.filter((w) => w.damageType === "kinetic" && w.cost > 0 && w.rarity <= cap);
        for (let i = 0; i < 3 + extra && guns.length; i++) {
            const w = guns[(Math.random() * guns.length) << 0]!;
            out.push({
                name: w.name, cost: w.cost,
                detail: `${w.weaponType} · ${Gear.dmg(w)}`,
                info: weaponInfo(w),
                blurb: w.manufacturer ? `${w.manufacturer} — serial filed off.` : undefined,
                buy: (a) => { Stash.of(a).weapons.push(GetItem.weapon(w.name)); return `${w.name} into The Stash.`; },
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
                buy: (a) => { Stash.of(a).armor.push(GetItem.armor(r.name)); return `${r.name} into The Stash.`; },
            });
        }
        for (let i = 0; i < 1 + vendor.extraMeds; i++) {
            const med = randomMed();
            out.push({
                name: med.name, cost: med.cost, detail: `consumable · ${med.restorePoints >= 999 ? "full heal" : "heals " + med.restorePoints + " HP"}`,
                info: [
                    ["Effect", med.restorePoints >= 999 ? "restores a member to full HP" : `restores ${med.restorePoints} HP`],
                    ["Use", "from the Gear tab, between fights"],
                ],
                blurb: med.description,
                buy: (a) => {
                    Stash.of(a).medical.push(new Medical(med.name, med.cost, med.restorePoints, med.description));
                    return `${med.name} into The Stash.`;
                },
            });
        }
        // Ordnance goes into the crew's crate, not onto a belt: what leaves the
        // crate is decided at staging, two pieces a job. Two kinds on offer per
        // market, so the flashbang you wanted is not always the one for sale.
        KIT_ORDER.slice().sort(() => Math.random() - 0.5).slice(0, 2).forEach((item) => {
            const spec = KIT[item];
            out.push({
                name: `${spec.label} ×2`, cost: Math.round(spec.cost * 1.7), detail: "ordnance · into the crate",
                info: [
                    ["Effect", spec.blurb],
                    ["Thrown", spec.when],
                    ["Carried", `chosen at staging — ${KIT_PICKS} pieces go out on a job`],
                ],
                blurb: "Militech surplus, crate stencils sanded off.",
                buy: () => {
                    const crate = Crew.active ? Crew.active.kit : null;
                    if (crate) { crate[item] += 2; }
                    return `Two ${spec.label.toLowerCase()}s into the crate.`;
                },
            });
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

    /** Sticker price: vendor's mood, the crew's discounts, and a won haggle. */
    private price(cost: number): number {
        const base = Economy.marketPrice(cost * this.vendor.priceMod, this.props.party);
        return Math.max(1, Math.round(this.state.haggle === "won" ? base * 0.85 : base));
    }

    // -------------------------------------------------------------- haggle --

    private static HAGGLE: EventCheck = {stat: "cool", dv: 13, label: "haggle"};

    /** One shot per visit: talk the whole stall down, or get laughed at. */
    private haggle = () => {
        if (this.state.haggle !== "open") { return; }
        const ctx = makeCtx(this.props.party);
        const who = ctx.best("cool");
        const r = rollCheck(who, MarketView.HAGGLE);
        if (r.success) {
            this.setState({haggle: "won",
                notice: `${who.name.split(" ")[0]} talks numbers until ${this.vendor.name} stops enjoying it. 15% off the stall.`});
        } else {
            this.setState({haggle: "lost",
                notice: `${this.vendor.name} hears the pitch out, smiling. "Prices are on the tags, sweetheart."`});
        }
    };

    private buy(item: Stock) {
        const leader = this.props.party[0]!;
        const cost = this.price(item.cost);
        if (!Purse.spend(leader, cost)) { this.setState({notice: `Not enough eddies (${cost}¥).`}); return; }
        let line: string;
        if (item.detail.indexOf("service") === 0) {
            line = item.buy(leader);
            if (item.name === "Med-bay patch-up") { this.props.party.forEach((p) => p.heal(Math.floor(p.maxHealth * 0.4))); }
            if (item.name === "Humanity therapy") {
                // shiftHumanity keeps EMP in step and can lift a cyberpsychosis lock
                this.props.party.forEach((p) => p.shiftHumanity(5));
            }
            if (item.name === "Combat stims, clean") { this.props.party.forEach((p) => p.heal(6)); }
        } else {
            line = item.buy(leader);
        }
        this.setState({notice: line, bought: this.state.bought.concat(item.name)});
    }

    /** Street rate: 40%, plus a Fixer's cut ("Operator") — and a Scav Fence pays over the odds. */
    private fenceRate(): number {
        return Economy.fenceRate(this.props.party) + this.vendor.fenceBonus;
    }

    // ------------------------------------------------------------ ripperdoc --

    /** Vendor-Handshake Mk.III: once per visit, the other crate comes out. */
    private rerollStock = () => {
        this.stock = MarketView.rollStock(this.props.party, this.vendor);
        this.service = MarketView.rollService();
        this.chromeStock = Chrome.shopOffers(this.props.party[0]!, this.vendor.chromeCount);
        this.setState({rerolled: true, open: null, notice: "The shutter rolls up on the other crate."});
    };

    private buyChrome(offer: AugOffer) {
        const you = this.props.party[0]!;
        const cost = this.price(offer.cost);
        if (!Chrome.canInstall(you)) { this.setState({notice: "The doc looks at your eyes and shakes his head."}); return; }
        if (!Purse.spend(you, cost)) { this.setState({notice: `Not enough eddies (${cost}¥).`}); return; }
        const cw = offer.isUpgrade ? Chrome.upgrade(you, offer.line.id) : Chrome.install(you, offer.line.id);
        this.setState({
            notice: cw ? `${cw.name} ${offer.isUpgrade ? "tuned up" : "installed"}. It itches (−${offer.hl} Humanity).`
                : "The chair stays empty.",
            bought: this.state.bought.concat(offer.line.id + offer.mk),
            version: this.state.version + 1,
        });
    }

    private chromeRow(offer: AugOffer, key: string) {
        const you = this.props.party[0]!;
        const mark = offer.line.marks[offer.mk - 1]!;
        const sold = this.state.bought.indexOf(offer.line.id + offer.mk) >= 0;
        const locked = !Chrome.canInstall(you);
        const open = this.state.open === key;
        const cost = this.price(offer.cost);
        return (
            <div key={key} className={"mkItem" + (sold ? " sold" : "") + (open ? " open" : "")}>
                <button className={"mkRow"} onClick={() => this.toggleInfo(key)} aria-expanded={open}>
                    <span className={"mkChevron"}>›</span>
                    <span className={"mkNameWrap"}>
                        <span className={"mkName"}>{offer.isUpgrade ? "▲ " : ""}{mark.name}</span>
                        <span className={"mkDetail"}>
                            {offer.line.tier} chrome · Mk.{offer.mk} · −{offer.hl} HUM{offer.isUpgrade ? " · upgrade" : ""}
                        </span>
                    </span>
                </button>
                <button className={"mkBuy"}
                        disabled={sold || locked || !Purse.canAfford(you, cost)}
                        onClick={() => this.buyChrome(offer)}>
                    {sold ? (offer.isUpgrade ? "TUNED" : "SOLD") : cost + "¥"}
                </button>
                <div className={"mkInfo"}>
                    <div className={"mkInfoBody"}>
                        <p className={"mkBlurb"}>{mark.description}</p>
                        <dl className={"mkSpecs"}>
                            <div className={"mkSpec"}><dt>Slot</dt><dd>{offer.line.slot}</dd></div>
                            <div className={"mkSpec"}><dt>Humanity</dt><dd>−{offer.hl} ({you.humanity} → {Math.max(0, you.humanity - offer.hl)})</dd></div>
                            <div className={"mkSpec"}><dt>Permanence</dt><dd>chrome survives death — gear doesn't</dd></div>
                        </dl>
                    </div>
                </div>
            </div>);
    }

    private ripperdoc() {
        const you = this.props.party[0]!;
        const locked = !Chrome.canInstall(you);
        const upgrades = Chrome.upgradeOffers(you);
        const canReroll = you.chromeHas("stockReroll") && !this.state.rerolled;
        return (
            <React.Fragment>
                <h4 className={"mkHead"}>
                    Ripperdoc counter · HUM {you.humanity}/{you.maxHumanity}
                    {you.humanity < 20 && !locked ? <em className={"mkWarn"}> — the edge is close</em> : null}
                    {canReroll && <button className={"mkReroll"} onClick={this.rerollStock}>⟲ other crate</button>}
                </h4>
                <p className={"mkHint"}>
                    Cyberware is the run's permanent upgrade — it stays with you through death.
                    Every piece costs Humanity; hit 0 and you go cyberpsycho.
                </p>
                {locked && <div className={"mkNotice psycho"}>CYBERPSYCHOSIS — the doc refuses the chair. Extraction or therapy first.</div>}
                <div className={"mkStock"}>
                    {this.chromeStock.map((o, i) => this.chromeRow(o, "c" + i))}
                    {upgrades.map((o, i) => this.chromeRow(o, "u" + o.line.id + i))}
                    {this.chromeStock.length === 0 && upgrades.length === 0 &&
                        <div className={"mkEmpty"}>Nothing on the shelf fits what you've got.</div>}
                </div>
            </React.Fragment>);
    }

    private fenceList(): Fence[] {
        const rate = this.fenceRate();
        const out: Fence[] = [];
        const leader = this.props.party[0]!;
        const bag = Stash.of(leader);
        // one stash, one list — chrome is part of a body, so it can't be fenced
        bag.weapons.forEach((w, idx) => {
            if (w.name === "Fists") { return; }
            out.push({
                owner: leader, kind: "weapon", idx, name: w.name,
                detail: Gear.dmg(w),
                price: Math.max(5, Math.floor(w.cost * rate)),
            });
        });
        bag.armor.forEach((a, idx) => {
            out.push({
                owner: leader, kind: "armor", idx, name: a.name,
                detail: `SP ${a.stoppingPower}`,
                price: Math.max(5, Math.floor(a.cost * rate)),
            });
        });
        bag.misc.forEach((m, idx) => {
            out.push({
                owner: leader, kind: "misc", idx, name: m.name,
                detail: `junk`,
                price: Math.max(2, Math.floor((m.cost || 0) * rate)),
            });
        });
        return out;
    }

    private sell(f: Fence) {
        const bag = Stash.of(f.owner);
        if (f.kind === "weapon") { bag.weapons.splice(f.idx, 1); }
        else if (f.kind === "misc") { bag.misc.splice(f.idx, 1); }
        else { bag.armor.splice(f.idx, 1); }
        Purse.earn(f.owner, f.price);
        this.setState({notice: `Fenced the ${f.name} for ${f.price}¥.`, version: this.state.version + 1});
    }

    private toggleInfo(key: string) {
        this.setState({open: this.state.open === key ? null : key});
    }

    private item(item: Stock, key: string, at: number = 0) {
        const leader = this.props.party[0]!;
        const sold = this.state.bought.indexOf(item.name) >= 0;
        const open = this.state.open === key;
        return (
            <div key={key} className={"mkItem" + (sold ? " sold" : "") + (open ? " open" : "")}
                 style={{animationDelay: `${at * 0.07}s`}}>
                <button className={"mkRow"} onClick={() => this.toggleInfo(key)}
                        aria-expanded={open}>
                    <span className={"mkChevron"}>›</span>
                    <span className={"mkNameWrap"}>
                        <span className={"mkName"}>{item.name}</span>
                        <span className={"mkDetail"}>{item.detail}</span>
                    </span>
                </button>
                <button className={"mkBuy"} disabled={sold || !Purse.canAfford(leader, this.price(item.cost))}
                        onClick={() => this.buy(item)}>
                    {sold ? "SOLD" : this.price(item.cost) + "¥"}
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

    /** The case under the counter — visible to everyone, sold to a name. */
    private backroomRow(at: number) {
        const item = this.backroom;
        if (!item) { return null; }
        const rep = this.props.party[0]!.reputation;
        const locked = rep < MarketView.BACKROOM_REP;
        if (locked) {
            return (
                <div className={"mkItem mkLocked"} style={{animationDelay: `${at * 0.07}s`}}>
                    <div className={"mkRow static"}>
                        <span className={"mkChevron"}>▣</span>
                        <span className={"mkNameWrap"}>
                            <span className={"mkName"}>The case under the counter</span>
                            <span className={"mkDetail"}>
                                {this.vendor.name} taps it once. "Not for strangers." — REP {MarketView.BACKROOM_REP} opens it (yours: {rep})
                            </span>
                        </span>
                    </div>
                    <button className={"mkBuy"} disabled>LOCKED</button>
                </div>);
        }
        return this.item(item, "backroom", at);
    }

    /** The one-shot haggle strip under the vendor's name. */
    private haggleRow() {
        const h = this.state.haggle;
        if (h !== "open") {
            return <p className={"mkHaggled" + (h === "won" ? " won" : "")}>
                {h === "won" ? "— haggled: 15% off everything on the stall —" : "— the tags stand —"}
            </p>;
        }
        const ctx = makeCtx(this.props.party);
        const who = ctx.best("cool");
        return (
            <button className={"mkHaggle"} onClick={this.haggle}>
                Talk the prices down <em>COOL check · {who.name.split(" ")[0]} · ~{odds(who, MarketView.HAGGLE)}% · one try</em>
            </button>);
    }

    public override render() {
        const leader = this.props.party[0]!;
        const fence = this.fenceList();
        return (
            <NodeShell accent={"mk"} icon={"▤"} label={"Black Market"}
                       kicker={"Night market · " + this.vendor.kind}
                       title={this.vendor.name}
                       sub={this.vendor.patter + " One visit: the stall is gone when you leave." +
                            (this.price(100) < Math.round(100 * this.vendor.priceMod)
                                ? " Someone else's account covers part of the bill — prices shown are yours."
                                : "")}
                       eddies={Purse.balance(leader)}
                       onLeave={this.props.onLeave} leaveLabel={"Leave the market ▸"}
                       guide={<React.Fragment>
                           Tap a row to unfold the full spec, tap the <b>price</b> to buy.
                           Bought gear lands in <b>The Stash</b> — hand it out from the Gear tab.
                       </React.Fragment>}>
                {this.haggleRow()}
                {this.state.notice && <div className={"mkNotice"}>{this.state.notice}</div>}
                <div className={"mkStock mkDeal"}>
                    {[...this.stock, this.service].map((item, i) => this.item(item, "s" + i, i))}
                    {this.backroomRow(this.stock.length + 1)}
                </div>
                {this.ripperdoc()}
                <h4 className={"mkHead"}>The fence buys · {Math.round(this.fenceRate() * 100)}% street rate{this.fenceRate() > 0.4 ? " (Operator\u2019s cut)" : ""}</h4>
                <p className={"mkHint"}>Sell anything in The Stash the crew doesn't use — scavenged guns, spare armour, junk. Eddies land in the purse.</p>
                {fence.length === 0 && <div className={"mkEmpty"}>Nothing in The Stash worth fencing.</div>}
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
            </NodeShell>);
    }
}
