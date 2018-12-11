import * as React from 'react';
import {MenuButton} from './general/button';
import {PrimaryTitle} from "./general/primaryTitle";

interface SidebarProps {
    activeSelection: any;
}

interface SidebarState {
    activeSelection: string;
}

export class Sidebar extends React.Component<SidebarProps, SidebarState> {

    public state: Readonly<SidebarState> = {
        activeSelection: "Character",
    };

    public handleClick = (selection: string) => {
        this.setState({activeSelection: selection});
        this.props.activeSelection(selection);
    };

    public render() {
        return (
            <div id='sidebar'>
                <PrimaryTitle title={'Menu'} noMenus={true}/>
                <MenuButton text='Character' update={this.handleClick} active={this.state.activeSelection}/>
                <MenuButton text='Quests' update={this.handleClick} active={this.state.activeSelection}/>
                <MenuButton text='Store' update={this.handleClick} active={this.state.activeSelection}/>
                <MenuButton text='Inventory' update={this.handleClick} active={this.state.activeSelection}/>
                <MenuButton text='Combat' update={this.handleClick} active={this.state.activeSelection}/>
                <MenuButton text='Auto' update={this.handleClick} active={this.state.activeSelection}/>
                <MenuButton text='Restart' update={this.handleClick} active={this.state.activeSelection}/>
                <MenuButton text='Respawn' update={this.handleClick} active={this.state.activeSelection}/>
                <MenuButton text='Stats' update={this.handleClick} active={this.state.activeSelection}/>
            </div>);
    }
}
