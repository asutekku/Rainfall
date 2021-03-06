import * as React from 'react';
import {Player} from '../../actors/player';
import {Category} from '../general/category';

export interface InventoryProps {
    player?: Player;
}

interface InventoryState {
    activeInventory: string;
}

export class Inventory extends React.Component<InventoryProps, InventoryState> {

    constructor(props: any) {
        super(props);
        this.state = {activeInventory: 'Weapons'};
    }

    public handleClick = (selection: string) => {
        this.setState({activeInventory: selection});
    };

    public render() {
        return (
            <div className={'itemCollection'}>
                <div className={'itemCollectionContainer'}>
                    <div className={'itemCollectionCategories'}>
                        <Category title={'Weapons'} update={this.handleClick} active={this.state.activeInventory}/>
                        <Category title={'Armor'} update={this.handleClick} active={this.state.activeInventory}/>
                        <Category title={'Misc'} update={this.handleClick} active={this.state.activeInventory}/>
                        <Category title={'Medical'} update={this.handleClick} active={this.state.activeInventory}/>
                    </div>
                    <div className={'itemCollection-50'}>

                    </div>
                </div>
                <div id={'itemInfoContainer'}>
                    <div id={'itemStatsContainer'}>

                    </div>
                    <div id={'itemExtraContainer'}>

                    </div>
                </div>
            </div>);
    }
}
