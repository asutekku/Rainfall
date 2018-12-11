import * as React from "react";
import {Actor} from "../../actors/Actor";
import {StatListItem} from "../statListItem";
import {CharacterPortrait} from "./characterPortrait";

export interface StatsProps {
    actor: Actor;
}

interface StatsState {
    actor: Actor;
}

export class CharacterStats extends React.Component<StatsProps, StatsState> {

    constructor(props: any) {
        super(props);
        this.state = {actor: this.props.actor}
    }

    handleChange = () => {
        this.setState({actor: this.props.actor});
    };

    render() {
        return (
            <div className={'characterInfo'}>
                <CharacterPortrait imgSource={this.props.actor.role.portrait}/>
                <div className={'characterAbout'}>
                    <div className='statCard tooltip'>
                        <span className='statTitle' id='weapon'>Weapon:</span>
                    </div>
                    <StatListItem name={'Name:'} value={this.props.actor!.weapon.name}
                                  tooltip={this.props.actor!.weapon.description}/>
                    <StatListItem name={'Type:'} value={this.props.actor!.weapon.weaponType}/>
                    <StatListItem name={'Damage:'}
                                  value={`${this.props.actor!.weapon.damage + this.props.actor!.weapon.diceThrows} - ${this.props.actor!.weapon.diceThrows * 6 + this.props.actor!.weapon.damage} * ${this.props.actor!.weapon.rateOfFire}`}/>
                    <StatListItem name={'Accuracy:'} value={`${this.props.actor!.weapon.accuracy.toString()}%`}/>
                    <StatListItem name={'Range:'} value={`${this.props.actor!.weapon.range}m`}/>
                    <StatListItem name={'Critical chance:'} value={`${this.props.actor!.weapon.crit}%`}/>
                </div>
            </div>)
    }
}