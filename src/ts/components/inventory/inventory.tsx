import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Armor} from "../../items/Armor";
import {Weapon} from "../../items/Weapon";
import {Medical} from "../../items/Scrap";

export interface InventoryProps {
    party: Actor[];
    /** Which run screen is up — equipping is locked mid-fight. */
    screen: string;
    onNotice?: ((msg: any) => void) | undefined;
}

interface InventoryState { memberIdx: number; version: number; }

/**
 * The crew's actual gear, member by member: what's in their hands and on
 * their backs, and the stash underneath — everything scavenged in fights or
 * bought at a market lands here. Between fights, tap SWAP/WEAR to re-kit;
 * mid-fight the loadout is locked (holster discipline).
 */
export class Inventory extends React.Component<InventoryProps, InventoryState> {

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

    private equipWeapon(a: Actor, idx: number) {
        if (!this.canEquip()) { return; }
        const w = a.inventory.weapons.splice(idx, 1)[0]!;
        const old = a.weapon;
        if (old && old.name !== "Fists") {
            old.equipped = false;
            a.inventory.weapons.push(old);
        }
        a.weapon = w;
        w.equipped = true;
        this.notice(`${a.name.split(" ")[0]} swaps to the ${w.name}.`);
    }

    private useMed(a: Actor, idx: number) {
        if (!this.canEquip()) { return; }
        const med = a.inventory.medical.splice(idx, 1)[0] as Medical;
        const healed = a.heal(Math.min(med.restorePoints, a.maxHealth));
        this.notice(healed > 0
            ? `${a.name.split(" ")[0]} uses the ${med.name} (+${healed} HP).`
            : `${a.name.split(" ")[0]} burns the ${med.name} on nothing — already at full health.`);
    }

    private equipArmor(a: Actor, idx: number) {
        if (!this.canEquip()) { return; }
        const piece = a.inventory.armor.splice(idx, 1)[0]!;
        const slot = piece.bodyPart === "headgear" ? "headgear" : "upper";
        const old = a.equipment[slot] as Armor | null;
        if (old) {
            old.equipped = false;
            a.inventory.armor.push(old);
        }
        a.equipment[slot] = piece;
        piece.equipped = true;
        this.notice(`${a.name.split(" ")[0]} straps on the ${piece.name} (SP ${piece.stoppingPower}).`);
    }

    private wStats(w: Weapon): string {
        return `${w.diceThrows}d6${w.damage ? "+" + w.damage : ""}${w.ap ? " AP" : ""}` +
            ` · ROF ${w.rateOfFire} · ${w.range}m`;
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
                        <span className={"mkName"}>{a.weapon.name}</span>
                        <span className={"mkDetail"}>{a.weapon.weaponType} · {this.wStats(a.weapon)}</span>
                    </span>
                </div>
                <div className={"gearRow eq"}>
                    <span className={"gearSlot"}>▣</span>
                    <span className={"mkNameWrap"}>
                        <span className={"mkName"}>{upper ? upper.name : "No body armor"}</span>
                        <span className={"mkDetail"}>{upper ? `torso · SP ${upper.stoppingPower}/${upper.maxStoppingPower}` : "torso · SP 0"}</span>
                    </span>
                </div>
                {head && (
                    <div className={"gearRow eq"}>
                        <span className={"gearSlot"}>◠</span>
                        <span className={"mkNameWrap"}>
                            <span className={"mkName"}>{head.name}</span>
                            <span className={"mkDetail"}>head · SP {head.stoppingPower}/{head.maxStoppingPower}</span>
                        </span>
                    </div>
                )}
            </div>);
    }

    private stash(a: Actor) {
        const lock = !this.canEquip();
        const weapons = a.inventory.weapons.filter((w) => w.name !== "Fists");
        const meds = a.inventory.medical as Medical[];
        const misc = a.inventory.misc || [];
        return (
            <div className={"gearSect"}>
                <h4 className={"mkHead"}>Stash{lock && <em className={"gearLock"}> · locked mid-fight</em>}</h4>
                {weapons.length === 0 && a.inventory.armor.length === 0 && meds.length === 0 && misc.length === 0 &&
                    <div className={"mkEmpty"}>Empty duffel. Scavenge fights or hit a Black Market.</div>}
                {weapons.map((w, i) => {
                    const idx = a.inventory.weapons.indexOf(w);
                    return (
                        <div key={"w" + i} className={"gearRow"}>
                            <span className={"gearSlot"}>✦</span>
                            <span className={"mkNameWrap"}>
                                <span className={"mkName"}>{w.name}</span>
                                <span className={"mkDetail"}>{w.weaponType} · {this.wStats(w)}</span>
                            </span>
                            <button className={"mkBuy gearEquip"} disabled={lock}
                                    onClick={() => this.equipWeapon(a, idx)}>SWAP</button>
                        </div>);
                })}
                {a.inventory.armor.map((r, i) => (
                    <div key={"a" + i} className={"gearRow"}>
                        <span className={"gearSlot"}>▣</span>
                        <span className={"mkNameWrap"}>
                            <span className={"mkName"}>{r.name}</span>
                            <span className={"mkDetail"}>{r.bodyPart} · SP {r.stoppingPower}</span>
                        </span>
                        <button className={"mkBuy gearEquip"} disabled={lock}
                                onClick={() => this.equipArmor(a, i)}>WEAR</button>
                    </div>))}
                {meds.map((m, i) => (
                    <div key={"h" + i} className={"gearRow"}>
                        <span className={"gearSlot med"}>✚</span>
                        <span className={"mkNameWrap"}>
                            <span className={"mkName"}>{m.name}</span>
                            <span className={"mkDetail"}>{m.restorePoints >= 999 ? "full heal" : `heals ${m.restorePoints} HP`}</span>
                        </span>
                        <button className={"mkBuy gearEquip useBtn"} disabled={lock || a.health >= a.maxHealth}
                                title={a.health >= a.maxHealth ? "already at full health" : undefined}
                                onClick={() => this.useMed(a, i)}>USE</button>
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
