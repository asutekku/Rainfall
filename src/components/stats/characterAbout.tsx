import * as React from "react";
import {Actor} from "../../ts/actors/Actor";
import {StatListItem} from "../statListItem";
import {CharacterPortrait} from "./characterPortrait";

export interface AboutProps {
    actor: Actor;
}

export class CharacterAbout extends React.Component<AboutProps> {

    constructor(props: any) {
        super(props);
    }

    public render() {
        return (
            <div className={"characterInfo"}>
                <CharacterPortrait imgSource={this.props.actor.role.portrait}/>
                <div className={"characterAbout"}>
                    <StatListItem name={"Name:"} value={this.props.actor.name}/>
                    <StatListItem name={"Gender:"} value={this.props.actor.gender}/>
                    <StatListItem name={"Role:"} value={this.props.actor.role.name}/>
                    <StatListItem name={"Skill:"} value={this.props.actor.role.skill!}
                                  tooltip={this.props.actor.role.skillDescription}/>
                    <StatListItem name={"Level:"} value={this.props.actor.level.toString()}/>
                    <StatListItem name={"Experience:"}
                                  value={`${this.props.actor.experience}/${this.props.actor.maxExperience}`}/>
                    <StatListItem name={"HP:"}
                                  value={`${this.props.actor.health}/${this.props.actor.maxHealth}`}/>
                    <StatListItem name={"Currency:"} value={`${this.props.actor.currency}¥`}/>
                </div>
            </div>);
    }
}
