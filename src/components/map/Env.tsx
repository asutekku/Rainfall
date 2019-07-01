import * as React from 'react';
import {Rect} from "react-konva";
import {Environmental} from "../../ts/items/environmental";
import {MapConfig} from "./MapUtils";

interface ActorComponentProps {
    object: Environmental;
    mapConfig: MapConfig;
}


class Env extends React.Component<ActorComponentProps> {
    render() {
        return (<>
            <Rect
                x={this.props.object.position.x}
                y={this.props.object.position.y}
                numPoints={4}
                height={this.props.mapConfig.cellSize}
                width={this.props.mapConfig.cellSize}
                fill={'#272727'}
                strokeWidth={3}
                opacity={1}
                draggable
                name={this.props.object.identifier}
                key={this.props.object.identifier}
            />
        </>);
    }

}


export default Env;