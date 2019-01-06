import * as React from "react";
import {Actor} from "../../actors/Actor";
import {Skill} from "../../items/Skill";
import skills from "../../items/skills";
import {Message} from "../actionLog/messageComponent";
import {Category} from "../general/category";
import {SkillComponent} from "./skillComponent";

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


    public handleClick = (selection: string) => {
        this.setState({selection});
    };

    public getMessage = (msg: Message) => {
        this.props.messages(msg);
    };

    public getSkills() {
        return skills.combat.map((e: Skill, i) => {
            return <SkillComponent skill={e} key={i} actor={this.props.actor} enemy={this.props.enemy} update={this.getMessage}/>;
        });
    }

    public render() {
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
            </div>);
    }
}
