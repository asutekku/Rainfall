import * as React from "react";
import {Category} from "../general/category";
import skills from "../../items/skills";
import {SkillComponent} from "./skillComponent";
import {Skill} from "../../items/Skill";
import {Actor} from "../../actors/Actor";
import {Message} from "../actionLog/messageComponent";

export interface CombatMenuProps {
    actor: Actor;
    enemy: Actor;
    messages: any;
}

interface CombatMenuState {
    selection: string;
}

export class CombatMenu extends React.Component<CombatMenuProps, CombatMenuState> {

    constructor(props: any) {
        super(props);
        this.state = {selection: 'Skills'};
    }


    handleClick = (selection: string) => {
        this.setState({selection: selection});
    };

    getMessage = (msg: Message) => {
        this.props.messages(msg);
    };

    getSkills() {
        return skills.combat.map((e: Skill, i) => {
            return <SkillComponent skill={e} key={i} actor={this.props.actor} enemy={this.props.enemy} skillMSG={this.getMessage}/>;
        })
    }

    render() {
        return (
            <div className={"itemCollection"}>
                <div className={"itemCollectionContainer"}>
                    <div className={"itemCollectionCategories"}>
                        <Category title={"Skills"} update={this.handleClick} active={this.state.selection}/>
                        <Category title={"Items"} update={this.handleClick} active={this.state.selection}/>
                    </div>
                    <div className={'itemCollection-50'}>
                        {this.getSkills()}
                    </div>
                </div>
            </div>)
    }
}