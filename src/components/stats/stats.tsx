import * as React from "react";
import {Actor} from "../../ts/actors/Actor";
import {Category} from "../general/category";
import {CharacterAbout} from "./characterAbout";
import {CharacterStats} from "./characterStats";

interface StatProps {
    actor: Actor;
}

interface StatState {
    actor: Actor;
    selection: string;
}

export class Character extends React.Component<StatProps, StatState> {

    constructor(props: any) {
        super(props);
        this.state = {
            actor: this.props.actor,
            selection: 'About',
        };
    }

    public changeView(selection: string) {
        return selection == 'About' ? <CharacterAbout actor={this.props.actor}/> : <CharacterStats actor={this.props.actor}/>;
    }

    public handleClick = (selection: string) => {
        this.setState({selection});
    };

    public render() {
        return (
            <div className={"itemCollection"}>
                <div className={"itemCollectionContainer"}>
                    <div className={"itemCollectionCategories"}>
                        <Category title={"About"} update={this.handleClick} active={this.state.selection}/>
                        <Category title={"Stats"} update={this.handleClick} active={this.state.selection}/>
                    </div>
                    <div className={"itemCollection-100"}>
                        {this.changeView(this.state.selection)}
                    </div>
                </div>
            </div>);
    }
}
