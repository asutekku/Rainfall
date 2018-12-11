import * as React from 'react';
import {Player} from '../../actors/player';
import {Category} from '../general/category';

export interface StoreProps {
    player?: Player;
    messages: any;
}

interface StoreState {
    activeInventory: string;
}

class ItemInfo extends React.Component {
    public render() {
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
                        <Category title={'Drugs'} update={this.handleClick} active={this.state.activeInventory}/>
                        <Category title={'Medical'} update={this.handleClick} active={this.state.activeInventory}/>
                    </div>
                    <div className={'itemCollectionCategories'}>
                        <Category title={'Implants'} update={this.handleClick} active={this.state.activeInventory}/>
                        <Category title={'Hackerware'} update={this.handleClick} active={this.state.activeInventory}/>
                        <Category title={'Misc'} update={this.handleClick} active={this.state.activeInventory}/>
                        <Category title={'Food'} update={this.handleClick} active={this.state.activeInventory}/>
                    </div>
                    <div className={'itemCollection-50'}>

                    </div>
                </div>
                <ItemInfo/>
            </div>);
    }
}
