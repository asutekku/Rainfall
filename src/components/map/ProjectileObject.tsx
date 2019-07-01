import * as React from 'react';
import {Circle, Line, Text} from "react-konva";
import {ObjectPosition} from "../../ts/utils/ObjectPosition";
import {Utils} from "../../ts/utils/utils";

const ProjectileObject = (props: { start: ObjectPosition, end: ObjectPosition, cellSize: number }) => {
    return (
        <>
            <Line
                x={0}
                y={0}
                points={[props.start.x + (props.cellSize / 2), props.start.y + (props.cellSize / 2), props.end.x + (props.cellSize / 2), props.end.y + (props.cellSize / 2)]}
                tension={0.5}
                stroke="black"
            />
            <Text
                text={Math.floor(Utils.distance(props.start, props.end)) + 'm'}
                x={props.start.x}
                y={props.start.y - 15}/>
            <Circle
                x={props.end.x + (props.cellSize / 2)}
                y={props.end.y + (props.cellSize / 2)}
                radius={5}
                fill={'black'}
            />
        </>
    );
};

export default ProjectileObject;