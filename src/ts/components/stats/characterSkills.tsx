import * as React from "react";
import {Actor} from "../../actors/Actor";

export interface SkillsProps {
    actor: Actor;
}

/**
 * The skills the loop actually rolls against: combat skills (trained at
 * safehouses), Dodge, First Aid, Interface (NET dives) and Drive — each as a
 * 0-10 meter. The equipped weapon's governing skill is flagged.
 */
export class CharacterSkills extends React.Component<SkillsProps, {}> {

    public override render() {
        const a = this.props.actor;
        const raw = a.weapon ? a.weapon.skill : "";
        const active = raw === "Melee Weapon" ? "Melee" : raw;   // sheet row naming
        const rows = a.skillSheet();
        return (
            <div className={"skillList"}>
                <div className={"skillHint"}>
                    ✦ marks the skill behind the equipped {a.weapon ? a.weapon.name : "weapon"} —
                    safehouse drills train it.
                </div>
                {rows.map(([name, lvl], i) => {
                    const isActive = name === active;
                    return (
                        <div key={i} className={"skillRow" + (isActive ? " on" : "")}>
                            <span className={"skillName"}>{isActive ? "✦ " : ""}{name}</span>
                            <span className={"skillMeter"}>
                                {Array.from({length: 10}, (_x, k) => (
                                    <i key={k} className={k < lvl ? "sOn" : ""}/>
                                ))}
                            </span>
                            <span className={"skillLvl"}>{lvl}</span>
                        </div>);
                })}
            </div>);
    }
}
