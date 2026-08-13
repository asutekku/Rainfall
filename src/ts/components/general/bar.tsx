import * as React from "react";

export interface BarProps {
    value: number;
    max: number;
    label?: string;
    kind?: string;       // hp | hum | xp | rep | rez | generic
    showText?: boolean;
}

export class Bar extends React.Component<BarProps, {}> {
    public render() {
        const max = Math.max(1, this.props.max);
        const pct = Math.max(0, Math.min(100, (this.props.value / max) * 100));
        const kind = this.props.kind || "generic";
        // HP shifts colour by remaining fraction.
        const fillClass = kind === "hp"
            ? (pct > 50 ? "bar-good" : pct > 25 ? "bar-warn" : "bar-crit")
            : "bar-" + kind;
        return (
            <div className={"barWrap"}>
                {this.props.label && <span className={"barLabel"}>{this.props.label}</span>}
                <div className={"barTrack"}>
                    <div className={"barFill " + fillClass} style={{width: pct + "%"}}/>
                </div>
                {this.props.showText !== false &&
                    <span className={"barText"}>{Math.round(this.props.value)}/{this.props.max}</span>}
            </div>);
    }
}
