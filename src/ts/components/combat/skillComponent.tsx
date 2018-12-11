import * as React from 'react';
import {Skill} from '../../items/Skill';
import {Combat} from "../../interact/combat";
import {Actor} from "../../actors/Actor";

interface SkillState {
    active: boolean;
}

interface SkillProps {
    skill: Skill;
    actor: Actor;
    enemy: Actor;
    skillMSG: any;
}

export class SkillComponent extends React.Component<SkillProps, SkillState> {

    constructor(props: any) {
        super(props);
        this.state = {active: false}
    }

    handleClick = () => {
        const state = !this.state.active;
        this.setState({active: state});
        this.props.skillMSG(Combat.basicAction(this.props.actor, this.props.enemy));
    };

    render() {
        return (
            <div className={'itemContainer-100'} onClick={this.handleClick}>
                <div className={'itemContainerRow-top'}>
                    <span className={'itemContainer-top-left'}>{this.props.skill.name}</span>
                    <span className={'itemContainer-top-right'}>{`Lvl: ${this.props.skill.level}`}</span>
                </div>
                <div className={'itemContainerRow-middle'}>
                    <span className={'itemContainer-middle'}>{this.props.skill.description}</span>
                </div>
                <div className={'itemContainerRow-bottom'}>
                    <span className={'itemContainer-bottom-left noSelect'}>{`Skill stats`}</span>
                </div>
            </div>)
    }
}