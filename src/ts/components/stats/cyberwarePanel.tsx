import * as React from "react";
import {Actor} from "../../actors/Actor";

export interface CyberwareProps {
    actor: Actor;
}

export class CyberwarePanel extends React.Component<CyberwareProps, {}> {
    public override render() {
        const a = this.props.actor;
        const lp = a.lifepath;
        return (
            <div className={"redPanel"}>
                <div className={"redSection"}>
                    <div className={"redSectionTitle"}>Installed Cyberware — Humanity {a.humanity}/{a.maxHumanity}</div>
                    {a.cybernetics.length === 0
                        ? <div className={"redEmpty"}>No chrome installed.</div>
                        : a.cybernetics.map((c, i) => (
                            <div className={"redRow"} key={i}>
                                <span className={"redRowName"}>{c.name}</span>
                                <span className={"redRowMeta"}>{c.slot} · HL {c.humanityLoss}</span>
                                <span className={"redRowDesc"}>{c.description}</span>
                            </div>
                        ))}
                </div>
                <div className={"redSection"}>
                    <div className={"redSectionTitle"}>Cyberdeck</div>
                    {a.cyberdeck.length === 0
                        ? <div className={"redEmpty"}>No deck.</div>
                        : a.cyberdeck.map((p, i) => (
                            <div className={"redRow"} key={i}>
                                <span className={"redRowName"}>{p.name}</span>
                                <span className={"redRowMeta"}>{p.programClass}{p.damage ? ` · ${p.damage}d6` : ""}</span>
                            </div>
                        ))}
                </div>
                <div className={"redSection"}>
                    <div className={"redSectionTitle"}>Lifepath</div>
                    <div className={"redRow"}><span className={"redRowMeta"}>Origin</span><span className={"redRowDesc"}>{lp.culturalOrigin}</span></div>
                    <div className={"redRow"}><span className={"redRowMeta"}>Personality</span><span className={"redRowDesc"}>{lp.personality}</span></div>
                    <div className={"redRow"}><span className={"redRowMeta"}>Style</span><span className={"redRowDesc"}>{lp.clothingStyle}</span></div>
                    <div className={"redRow"}><span className={"redRowMeta"}>Values</span><span className={"redRowDesc"}>{lp.valueMost}</span></div>
                    <div className={"redRow"}><span className={"redRowMeta"}>Family</span><span className={"redRowDesc"}>{lp.familyBackground}</span></div>
                    <div className={"redRow"}><span className={"redRowMeta"}>Goal</span><span className={"redRowDesc"}>{lp.lifeGoal}</span></div>
                </div>
            </div>);
    }
}
