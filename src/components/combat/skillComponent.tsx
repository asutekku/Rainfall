import * as React from 'react';
import {Actor} from "../../ts/actors/Actor";
import {Combat} from "../../ts/interact/combat";
import {Skill, SkillType} from '../../ts/items/Skill';
import Projectile from "../../objects/Projectile";

interface SkillState {
    active: boolean;
}

interface SkillProps {
    skill: Skill;
    actor: Actor;
    enemy: Actor;
    update: any;
    addObjectToMap: any;
}

export class SkillComponent extends React.Component<SkillProps, SkillState> {
    constructor(props: any) {
        super(props);
        this.state = {active: false};
    }

    componentDidMount() {
        document.addEventListener("keydown", this._handleKeyDown);
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
                    <span className={'itemContainer-bottom-right noSelect'}>{`Key [${this.props.skill.key}]`}</span>
                </div>
            </div>);
    }

    private _handleKeyDown = (event: any) => {
        2;
        if (this.props.skill.key === event.key) {
            this.handleClick();
        }
    };

    private handleClick = () => {
        const state = !this.state.active;
        this.setState({active: state});
        let message;
        if (this.props.skill.category === SkillType.combat) {
            message = Combat.basicAction(this.props.actor, this.props.enemy, this.props.skill);
            this.props.addObjectToMap(new Projectile(this.props.actor.position, this.props.enemy.position));
        }
        this.props.update(message);
    };
}
