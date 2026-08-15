import * as React from 'react';
import {Actor} from '../../actors/Actor';
import {Category} from '../general/category';
import {GetItem} from '../../interact/getItem';
import Equipment from '../../items/Equipment';
import armors from '../../items/armors';
import cyberwareData from '../../../objects/cyberware';
import programData from '../../../objects/programs';

export interface StoreProps {
    player?: Actor;
    messages: any;
}

interface StoreState {
    activeInventory: string;
    eddies: number;
    notice: string;
}

interface StockItem {
    name: string;
    cost: number;
    detail: string;
    buy: (a: Actor) => void;
}

export class Store extends React.Component<StoreProps, StoreState> {

    constructor(props: any) {
        super(props);
        this.state = {activeInventory: 'Weapons', eddies: this.props.player ? this.props.player.currency : 0, notice: ''};
    }

    public handleClick = (selection: string) => {
        this.setState({activeInventory: selection});
    };

    private stock(): StockItem[] {
        switch (this.state.activeInventory) {
            case 'Weapons':
                return Equipment.weapons
                    .filter((w) => w.damageType === 'kinetic' && w.cost > 0 && w.rarity <= 2)
                    .sort((a, b) => a.cost - b.cost).slice(0, 24)
                    .map((w) => ({
                        name: w.name, cost: w.cost,
                        detail: `${w.weaponType} · ${w.diceThrows}d6${w.damage ? '+' + w.damage : ''}${w.ap ? ' AP' : ''}`,
                        buy: (a: Actor) => a.inventory.weapons.push(GetItem.weapon(w.name)),
                    }));
            case 'Armor':
                return armors.filter((r) => r.cost > 0).sort((a, b) => a.cost - b.cost)
                    .map((r) => ({
                        name: r.name, cost: r.cost, detail: `${r.bodyPart} · SP ${r.stoppingPower}`,
                        buy: (a: Actor) => a.inventory.armor.push(GetItem.armor(r.name)),
                    }));
            case 'Implants':
                return cyberwareData.map((c) => ({
                    name: c.name, cost: c.cost, detail: `${c.slot} · HL ${c.humanityLoss}`,
                    buy: (a: Actor) => a.installCyberware(GetItem.cyberware(c.name)),
                }));
            case 'Hackerware':
                return Object.keys(programData)
                    .map((k) => programData[k])
                    .filter((p) => p.cost > 0)
                    .map((p) => ({
                        name: p.name, cost: p.cost, detail: `${p.programClass}${p.damage ? ` · ${p.damage}d6` : ''}`,
                        buy: (a: Actor) => a.cyberdeck.push(GetItem.program(p.name)),
                    }));
            default:
                return [];
        }
    }

    private purchase = (item: StockItem) => {
        const a = this.props.player;
        if (!a) { return; }
        if (a.currency < item.cost) {
            this.setState({notice: `Not enough eddies for ${item.name} (need ${item.cost}¥).`});
            return;
        }
        a.currency -= item.cost;
        item.buy(a);
        this.setState({eddies: a.currency, notice: `Bought ${item.name} for ${item.cost}¥.`});
    };

    private cat = (title: string) =>
        <Category title={title} update={this.handleClick} active={this.state.activeInventory}/>

    public render() {
        const stock = this.stock();
        return (
            <div className={'itemCollection'}>
                <div className={'storeHeader'}>
                    <span className={'storeEddies'}>{this.state.eddies}¥</span>
                    {this.state.notice && <span className={'storeNotice'}>{this.state.notice}</span>}
                </div>
                <div className={'itemCollectionContainer'}>
                    <div className={'itemCollectionCategories'}>
                        {this.cat('Weapons')}{this.cat('Armor')}{this.cat('Implants')}{this.cat('Hackerware')}
                    </div>
                    <div className={'storeStock'}>
                        {stock.length === 0 && <div className={'redEmpty'}>No stock in this category yet.</div>}
                        {stock.map((item, i) => (
                            <div className={'storeItem'} key={i}>
                                <span className={'storeItemName'}>{item.name}</span>
                                <span className={'storeItemDetail'}>{item.detail}</span>
                                <button className={'redBtn ' + (this.props.player && this.props.player.currency >= item.cost ? '' : 'redBtnDisabled')}
                                        onClick={() => this.purchase(item)}>{item.cost}¥</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>);
    }
}
