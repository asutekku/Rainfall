import * as React from "react";
import {Category} from "../general/category";
import {CharacterAbout} from "./characterAbout";
import {Actor} from "../../actors/Actor";
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
            selection: 'About'
        }
    }

    changeView(selection: string) {
        if (selection == 'About') {
            return <CharacterAbout actor={this.props.actor}/>
        } else {
            return <CharacterStats actor={this.props.actor}/>
        }
    }

    handleClick = (selection: string) => {
        this.setState({selection: selection});
    };

    render() {
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
            </div>)
    }
}