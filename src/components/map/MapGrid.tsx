import * as React from "react";
import {Line} from "react-konva";

interface MapGridProps {
    height: number;
    width: number;
    cellSize: number;
    color: string;
}

class MapGrid extends React.Component<MapGridProps> {

    getVertical() {
        let vertical = this.props.width / this.props.cellSize;
        let lines = [];
        for (let i = 0; i < vertical; i++) {
            lines.push(<Line
                x={0}
                y={0}
                points={[i * this.props.cellSize, 0, i * this.props.cellSize, this.props.height]}
                tension={0.5}
                stroke={this.props.color}
            />);
        }
        return lines;
    }

    getHorizontal() {
        let horizontal = this.props.height / this.props.cellSize;
        let lines = [];
        for (let i = 0; i < horizontal; i++) {
            lines.push(<Line
                x={0}
                y={0}
                points={[0, i * this.props.cellSize, this.props.width, i * this.props.cellSize]}
                tension={0.5}
                stroke={this.props.color}
            />);
        }
        return lines;
    }

    render() {
        return (<>
            {this.getVertical()}
            {this.getHorizontal()}
        </>);
    }
}

export default MapGrid;