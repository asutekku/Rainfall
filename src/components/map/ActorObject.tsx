import * as React from 'react';
import {Rect} from "react-konva";
import {Actor} from "../../ts/actors/Actor";
import {ObjectPosition} from "../../ts/utils/ObjectPosition";
import {PositionHolder} from "./MapUtils";

interface ActorComponentProps {
    actor: Actor;
    updatePosition: any;
    makeActive: any;
    cellSize: number;
}

class ActorComponent extends React.Component<ActorComponentProps> {

    render() {
        return (<>
            <Rect
                x={this.props.actor.position.x}
                y={this.props.actor.position.y}
                numPoints={4}
                height={30}
                width={30}
                fill={!this.props.actor.hostile ? (this.props.actor.selected ? "#4d5eff" : "#85abff") : (this.props.actor.selected ? "#ff2d7e" : "#ff6686")}
                stroke={this.props.actor.role.colorString}
                strokeWidth={3}
                opacity={0.8}
                draggable
                name={this.props.actor.identifier}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onClick={this.handleClick}
                key={this.props.actor.identifier}
            />
        </>);
    }

    getGridPosition(x: number, y: number, cellSize: number): ObjectPosition {
        let newX = Math.floor(x / cellSize) * cellSize;
        let newY = Math.floor(y / cellSize) * cellSize;
        return new ObjectPosition(newX, newY);
    }

    private handleDragStart = e => {
        e.target.setAttrs({
            scaleX: 1.1,
            scaleY: 1.1
        });
        this.props.makeActive(e.target.name());
    };

    private handleDragEnd = e => {
        let x = Math.floor(e.evt.layerX / this.props.cellSize) * this.props.cellSize;
        let y = Math.floor(e.evt.layerY / this.props.cellSize) * this.props.cellSize;
        e.target.to({
            duration: 0.05,
            scaleX: 1,
            scaleY: 1,
            x: x,
            y: y
        });
        this.updatePosition(e.target, x, y);
    };

    private handleClick = e => {
        this.props.makeActive(e.target.name());
    };

    private updatePosition(target: any, x: number, y: number) {

        let position: ObjectPosition = new ObjectPosition(x, y);
        let positionHolder: PositionHolder = {
            id: target.name(),
            position: position
        };
        this.props.updatePosition(positionHolder);
    }
}

export default ActorComponent;