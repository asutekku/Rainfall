import * as React from 'react';
import {Circle, Line} from "react-konva";
import {ObjectPosition} from "../../ts/utils/ObjectPosition";

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