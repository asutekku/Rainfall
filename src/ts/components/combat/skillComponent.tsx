import * as React from 'react';
import {Actor} from "../../actors/Actor";
import {Combat} from "../../interact/combat";
import {Skill} from '../../items/Skill';

interface SkillState {
    active: boolean;
}

interface SkillProps {
    skill: Skill;
    actor: Actor;
    enemy: Actor;
    update: any;
}

export class SkillComponent extends React.Component<SkillProps, SkillState> {

    constructor(props: any) {
        super(props);
        this.state = {active: false};
    }

    public render() {
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
            </div>);
    }

    private handleClick = () => {
        const state = !this.state.active;
        this.setState({active: state});
        const message = Combat.basicAction(this.props.actor, this.props.enemy, this.props.skill);
        this.props.update(message);
    };
}
