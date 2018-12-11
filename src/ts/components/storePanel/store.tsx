import * as React from 'react';
import {Category} from '../general/category';
import {Player} from '../../actors/player';

export interface StoreProps {
    player?: Player;
}

interface StoreState {
    activeInventory: string;
}

class ItemInfo extends React.Component {
    render() {
        return <div id={"itemInfoContainer"}>
            <div id={"itemStatsContainer"}>

            </div>
            <div id={"itemExtraContainer"}>

            </div>
        </div>;
    }
}

export class Store extends React.Component<StoreProps, StoreState> {

    constructor(props: any) {
        super(props);
        this.state = {activeInventory: 'Weapons'}
    }

    handleClick = (selection: string) => {
        this.setState({activeInventory: selection});
    };

    render() {
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
                <ItemInfo/>
            </div>)
    }
}