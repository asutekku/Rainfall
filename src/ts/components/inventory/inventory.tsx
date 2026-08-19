import * as React from "react";
import {Gear} from "../../interact/gear";
import {Actor} from "../../actors/Actor";
import {Armor} from "../../items/Armor";
import {Weapon} from "../../items/Weapon";
import {Medical} from "../../items/Scrap";
import {Crew, Stash} from "../../interact/crew";
import {KIT, KIT_ORDER} from "../../interact/loadout";

export interface InventoryProps {
    party: Actor[];
    /** Which run screen is up — equipping is locked mid-fight. */
    screen: string;
    onNotice?: ((msg: any) => void) | undefined;
}

interface InventoryState { memberIdx: number; version: number; }

/**
 * The crew's actual gear: what each member holds, and The Stash underneath —
 * the one shared inventory. Everything scavenged in fights or bought at a
 * market lands in it, and any member can kit up out of it (the tabs pick who
 * the SWAP/WEAR buttons dress). Between fights, tap SWAP/WEAR to re-kit;
 * mid-fight the loadout is locked (holster discipline).
 */
export class Inventory extends React.Component<InventoryProps, InventoryState> {

    /** What's in the crew's ordnance crate, in one line. */
    private static crateLine(): string {
        const crate = Crew.active ? Crew.active.kit : null;
        if (!crate) { return "empty"; }
        const parts = KIT_ORDER.filter((k) => crate[k] > 0).map((k) => `${KIT[k].label} ×${crate[k]}`);
        return parts.length ? parts.join(" · ") : "empty";
    }

    constructor(props: InventoryProps) {
        super(props);
        this.state = {memberIdx: 0, version: 0};
    }

    private canEquip(): boolean {
        return this.props.screen !== "combat";
    }

    private notice(msg: string) {
        if (this.props.onNotice) { this.props.onNotice({msg}); }
        this.setState({version: this.state.version + 1});
    }

    private member(): Actor {
        const idx = Math.min(this.state.memberIdx, this.props.party.length - 1);
        return this.props.party[idx]!;
    }

    private equipWeapon(a: Actor, w: Weapon) {
        if (!this.canEquip()) { return; }
        const msg = Gear.equipWeapon(a, w);
        if (msg) { this.notice(msg); }
    }

    private useMed(a: Actor, idx: number) {
        if (!this.canEquip()) { return; }
        const med = Stash.of(a).medical.splice(idx, 1)[0] as Medical;
        const wasDying = a.mortallyWounded;
        if (wasDying) { a.stabilize(); }               // meds stop the bleeding first
        // Blood Pump Mk.II/III: meds circulate harder in an assisted system.
        const dose = Math.floor(Math.min(med.restorePoints, a.maxHealth) * (1 + a.chromeNum("medBoost")));
        const healed = a.heal(dose);
        this.notice(wasDying
            ? `${a.name.split(" ")[0]} is stabilised by the ${med.name}${healed > 0 ? ` (+${healed} HP)` : ""} — back from the brink.`
            : healed > 0
                ? `${a.name.split(" ")[0]} uses the ${med.name} (+${healed} HP).`
                : `${a.name.split(" ")[0]} burns the ${med.name} on nothing — already at full health.`);
    }

    private equipArmor(a: Actor, piece: Armor) {
        if (!this.canEquip()) { return; }
        const msg = Gear.equipArmor(a, piece);
        if (msg) { this.notice(msg); }
    }

    private wStats(w: Weapon): string {
        return Gear.weaponLine(w);
    }

    private equipped(a: Actor) {
        const upper = a.equipment.upper as Armor | null;
        const head = a.equipment.headgear as Armor | null;
        return (
            <div className={"gearSect"}>
                <h4 className={"mkHead"}>Equipped</h4>
                <div className={"gearRow eq"}>
                    <span className={"gearSlot"}>✦</span>
                    <span className={"mkNameWrap"}>
                        <span className={"mkName"} style={{color: Gear.rarityColor(a.weapon)}}>{a.weapon.name}</span>
                        <span className={"mkDetail"}>{a.weapon.weaponType} · {this.wStats(a.weapon)}</span>
                    </span>
                </div>
                <div className={"gearRow eq"}>
                    <span className={"gearSlot"}>▣</span>
                    <span className={"mkNameWrap"}>
                        <span className={"mkName"} style={upper ? {color: Gear.rarityColor(upper)} : undefined}>{upper ? upper.name : "No body armor"}</span>
                        <span className={"mkDetail"}>{upper ? `torso · SP ${upper.stoppingPower}/${upper.maxStoppingPower}` : "torso · SP 0"}</span>
                    </span>
                </div>
                {head && (
                    <div className={"gearRow eq"}>
                        <span className={"gearSlot"}>◠</span>
                        <span className={"mkNameWrap"}>
                            <span className={"mkName"} style={{color: Gear.rarityColor(head)}}>{head.name}</span>
                            <span className={"mkDetail"}>head · SP {head.stoppingPower}/{head.maxStoppingPower}</span>
                        </span>
                    </div>
                )}
                {/* Ordnance is crew property, not personal: it lives in the crate
                    and gets handed out at staging, two pieces a job. */}
                <div className={"gearRow eq"}>
                    <span className={"gearSlot"}>✸</span>
                    <span className={"mkNameWrap"}>
                        <span className={"mkName"}>Crate — {Inventory.crateLine()}</span>
                        <span className={"mkDetail"}>picked at staging · restock at markets or off bodies</span>
                    </span>
                </div>
            </div>);
    }

    private stash(a: Actor) {
        const lock = !this.canEquip();
        const bag = Stash.of(a);
        // the member's swap list: The Stash plus their own bolted-in chrome
        const weapons = Gear.weaponChoices(a);
        const armor = Gear.armorChoices(a);
        const meds = bag.medical as Medical[];
        const misc = bag.misc || [];
        return (
            <div className={"gearSect"}>
                <h4 className={"mkHead"}>The Stash <em className={"gearShared"}>· shared — anyone kits up out of it</em>
                    {lock && <em className={"gearLock"}> · locked mid-fight</em>}</h4>
                {weapons.length === 0 && armor.length === 0 && meds.length === 0 && misc.length === 0 &&
                    <div className={"mkEmpty"}>The Stash is empty. Scavenge fights or hit a Black Market.</div>}
                {weapons.map((w, i) => {
                    const chrome = Gear.isCyberweapon(a, w);
                    return (
                        <div key={"w" + i} className={"gearRow"}>
                            <span className={"gearSlot"}>{chrome ? "⌁" : "✦"}</span>
                            <span className={"mkNameWrap"}>
                                <span className={"mkName"} style={{color: Gear.rarityColor(w)}}>{w.name}</span>
                                <span className={"mkDetail"}>{chrome ? "chrome · " : ""}{w.weaponType} · {this.wStats(w)}</span>
                            </span>
                            <button className={"mkBuy gearEquip"} disabled={lock}
                                    onClick={() => this.equipWeapon(a, w)}>SWAP</button>
                        </div>);
                })}
                {armor.map((r, i) => (
                    <div key={"a" + i} className={"gearRow"}>
                        <span className={"gearSlot"}>▣</span>
                        <span className={"mkNameWrap"}>
                            <span className={"mkName"} style={{color: Gear.rarityColor(r)}}>{r.name}</span>
                            <span className={"mkDetail"}>{r.bodyPart} · SP {r.stoppingPower}</span>
                        </span>
                        <button className={"mkBuy gearEquip"} disabled={lock}
                                onClick={() => this.equipArmor(a, r)}>WEAR</button>
                    </div>))}
                {meds.map((m, i) => (
                    <div key={"h" + i} className={"gearRow"}>
                        <span className={"gearSlot med"}>✚</span>
                        <span className={"mkNameWrap"}>
                            <span className={"mkName"}>{m.name}</span>
                            <span className={"mkDetail"}>{m.restorePoints >= 999 ? "full heal" : `heals ${m.restorePoints} HP`}</span>
                        </span>
                        <button className={"mkBuy gearEquip useBtn" + (a.mortallyWounded ? " crit" : "")}
                                disabled={lock || (!a.mortallyWounded && a.health >= a.maxHealth)}
                                title={a.mortallyWounded ? "stop the dying" : a.health >= a.maxHealth ? "already at full health" : undefined}
                                onClick={() => this.useMed(a, i)}>{a.mortallyWounded ? "STABILIZE" : "USE"}</button>
                    </div>))}
                {misc.map((m: any, i: number) => (
                    <div key={"m" + i} className={"gearRow"}>
                        <span className={"gearSlot"}>◌</span>
                        <span className={"mkNameWrap"}>
                            <span className={"mkName"}>{m.name}</span>
                            <span className={"mkDetail"}>junk · a fence pays for this</span>
                        </span>
                    </div>))}
            </div>);
    }

    public override render() {
        const a = this.member();
        return (
            <div className={"gearView"}>
                <div className={"gearTabs"}>
                    {this.props.party.map((p, i) => (
                        <button key={i}
                                className={"gearTab" + (i === Math.min(this.state.memberIdx, this.props.party.length - 1) ? " on" : "")}
                                onClick={() => this.setState({memberIdx: i})}>
                            {p.name.split(" ")[0]}{i === 0 ? " ★" : ""}
                        </button>
                    ))}
                </div>
                {this.equipped(a)}
                {this.stash(a)}
            </div>);
    }
}
