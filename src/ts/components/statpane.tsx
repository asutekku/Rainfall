import * as React from 'react';
import {StatListItem} from './statListItem';
import {Player} from '../actors/player';
import {Actor} from '../actors/Actor';

interface StatpanelProps {
    actor: Player | undefined;
}

interface StatpanelState {
    actor: Player | Actor | undefined;
}

export class Statpane extends React.Component<StatpanelProps, StatpanelState> {

    constructor(props: any) {
        super(props);
        this.state = {actor: this.props.actor}
    }

    render() {
        return <div id='statpane'>
            <div className='UIelement' id='attributes'>
                <h2 className='statTitle vital'>Attributes</h2>
                <StatListItem name={'Name'} value={this.state.actor!.name}/>
                <StatListItem name={'Gender'} value={this.state.actor!.gender}/>
                <StatListItem name={'Role'} value={this.state.actor!.role.name}/>
                <StatListItem name={'Skill'} value={this.state.actor!.role.skill!}
                              tooltip={this.state.actor!.role.skillDescription}/>
                <StatListItem name={'Level'} value={this.state.actor!.level.toString()}/>
                <StatListItem name={'Experience'}
                              value={`${this.state.actor!.experience}/${this.state.actor!.maxExperience}`}/>
                <StatListItem name={'HP'}
                              value={`${this.state.actor!.health}/${this.state.actor!.maxHealth}`}/>
                <StatListItem name={'Currency'} value={`${this.state.actor!.currency}¥`}/>
            </div>
            <div className='UIelement' id='equipment'>
                <h2 className='statTitle vital'>Equipment</h2><br/>
                <div className='statCard tooltip'>
                    <span className='statTitle vital' id='weapon'>Weapon:</span>
                </div>
                <div className='inset'>
                    <StatListItem name={'Name'} value={this.state.actor!.weapon.name}
                                  tooltip={this.state.actor!.weapon.description}/>
                    <StatListItem name={'Type'} value={this.state.actor!.weapon.weaponType}/>
                    <StatListItem name={'Damage'}
                                  value={`${this.state.actor!.weapon.damage + this.state.actor!.weapon.diceThrows} - ${this.state.actor!.weapon.diceThrows * 6 + this.state.actor!.weapon.damage} * ${this.state.actor!.weapon.rateOfFire}`}/>
                    <StatListItem name={'Accuracy'} value={`${this.state.actor!.weapon.accuracy.toString()}%`}/>
                    <StatListItem name={'Range'} value={`${this.state.actor!.weapon.range}m`}/>
                    <StatListItem name={'Critical chance'} value={`${this.state.actor!.weapon.crit}%`}/>
                </div>
                <div className='statCard tooltip'>
                    <span className='statTitle vital' id='armor'>Armor:</span>
                </div>
                <div className='inset'>
                    <StatListItem name={'Head'} value={'Nothing'}
                                  tooltip={'You are wearing nothing on your head.'}/>
                    <StatListItem name={'Upperbody'} value={'Nothing'}
                                  tooltip={'You are wearing nothing on your upper body.'}/>
                    <StatListItem name={'Lowerbody'} value={'Nothing'}
                                  tooltip={'You are wearing nothing on your lower body.'}/>
                    <StatListItem name={'Stopping power'} value={'Nothing'}
                                  tooltip={'The total stopping power of your equipment: enemyDamage - x%'}/>
                </div>
            </div>
            <div className='UIelement' id='stats'>
                <h2 className='statTitle vital'>Statistics</h2>
                <div className='statCard'>
                    <span className='statTitle'>Kills:</span>
                    <span className='statValue' id='kills'>{this.state.actor!.kills.toString()}</span>
                </div>
            </div>
        </div>
    }
}