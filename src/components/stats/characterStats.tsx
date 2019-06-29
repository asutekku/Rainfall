import * as React from "react";
import {Actor} from "../../ts/actors/Actor";
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
        this.state = {actor: this.props.actor};
    }

    public handleChange = () => {
        this.setState({actor: this.props.actor});
    };

    public render() {
        const act = this.props.actor!;
        return (
            <div className={'characterInfo'}>
                <CharacterPortrait imgSource={act.role.portrait}/>
                <div className={'characterAbout'}>
                    <div className='statCard tooltip'>
                        <span className='statTitle' id='weapon'>Weapon:</span>
                    </div>
                    <StatListItem name={'Name:'} value={act.weapon.name}
                                  tooltip={"act.weapon.description"}/>
                    <StatListItem name={'Type:'} value={act.weapon.weaponType}/>
                    <StatListItem name={'Damage:'}
                                  value={`${act.weapon.getDamage()}`}/>
                    <StatListItem name={'Accuracy:'} value={`${act.weapon.stats.accuracyModifier.toString()}%`}/>
                    <StatListItem name={'Range:'} value={`${act.weapon.range}m`}/>
                    <StatListItem name={'Critical chance:'} value={`${act.weapon.criticalChance}%`}/>
                </div>
            </div>);
    }
}
