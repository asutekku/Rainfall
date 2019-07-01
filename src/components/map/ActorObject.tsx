import * as React from 'react';
import {Rect} from "react-konva";
import {Actor} from "../../ts/actors/Actor";
import {ObjectPosition} from "../../ts/utils/ObjectPosition";
import {getCell, gridify, MapConfig, PositionHolder} from "./MapUtils";
import {MapLayer} from "./MapLayer";
import {Player} from "../../ts/actors/player";

interface ActorComponentProps {
    actor: Actor;
    updatePosition: any;
    makeActive: any;
    mapConfig: MapConfig;
    grid: MapLayer;
}

interface ActorComponentState {
    helpers: any[];
}

class ActorComponent extends React.Component<ActorComponentProps, ActorComponentState> {
    constructor(props: ActorComponentProps) {
        super(props);
        this.state = {helpers: []};
    }

    render() {
        return (<>
            {
                this.props.actor.selected && (this.props.actor instanceof Player) ? this.state.helpers : null
            }
            <Rect
                x={this.props.actor.position.x}
                y={this.props.actor.position.y}
                numPoints={4}
                height={this.props.mapConfig.cellSize}
                width={this.props.mapConfig.cellSize}
                fill={!this.props.actor.hostile ? (this.props.actor.selected ? "#4d5eff" : "#85abff") : (this.props.actor.selected ? "#ff2d7e" : "#ff6686")}
                stroke={this.props.actor.role.colorString}
                strokeWidth={3}
                opacity={0.8}
                draggable
                name={this.props.actor.identifier}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onDragMove={this.updateHelper}
                onClick={this.handleClick}
                key={this.props.actor.identifier}
            />
        </>);
    }

    //TODO: Make check so the helpers don't go through walls and enemies
    getMoveHelper(baseX: number, baseY: number) {
        //this.props.grid.clear();
        const cs = this.props.mapConfig.cellSize;
        const playerX = getCell(baseX, cs);
        const playerY = getCell(baseY, cs);
        let width = this.props.grid.grid.length;
        let height = this.props.grid.grid[0].length;
        //console.log(hoverX, hoverY);
        let cells = [];
        let grid = this.props.grid.grid;
        let nth = 0;

        for (let i = playerX; i >= 0; i--) {
            if (typeof grid[playerY][i] == 'undefined') {
                cells.push(<Helper x={i * cs} y={playerY * cs} key={'left' + i + '-' + playerY} opacity={nth * 0.05}/>);
                nth++;
            } else {
                break;
            }
        }
        nth = 0;
        for (let i = playerX; i < width; i++) {
            if (typeof grid[playerY][i] == 'undefined' || (grid[playerY][i] as Actor).hostile == false) {
                cells.push(<Helper x={i * cs} y={playerY * cs} key={'right' + i + '-' + playerY} opacity={nth * 0.05}/>);
                nth++;
            } else {
                break;
            }
        }
        nth = 0;
        for (let i = playerY; i >= 0; i--) {
            if (typeof grid[i][playerX] == 'undefined') {
                cells.push(<Helper x={playerX * cs} y={i * cs} key={'above' + playerX + '-' + i} opacity={nth * 0.05}/>);
                nth++;
            } else {
                break;
            }
        }
        nth = 0;
        for (let i = playerY; i < height; i++) {
            if (typeof grid[i][playerX] == 'undefined') {
                cells.push(<Helper x={playerX * cs} y={i * cs} key={'below' + playerX + '-' + i} opacity={nth * 0.05}/>);
                nth++;
            } else {
                break;
            }
        }
        nth = 0;
        this.setState({helpers: cells});
        return <>
            {cells}
        </>;
    }

    getGridPosition(x: number, y: number, cellSize: number): ObjectPosition {
        let newX = Math.floor(x / cellSize) * cellSize;
        let newY = Math.floor(y / cellSize) * cellSize;
        return new ObjectPosition(newX, newY);
    }

    private updateHelper = e => {
        this.getMoveHelper(e.target.x(), e.target.y());
    };

    private handleDragStart = e => {
        let startX = getCell(e.target.x(), this.props.mapConfig.cellSize);
        let startY = getCell(e.target.y(), this.props.mapConfig.cellSize);
        this.props.grid.remove(startX, startY);
        e.target.setAttrs({
            scaleX: 1.1,
            scaleY: 1.1
        });
        this.props.makeActive(e.target.name());
    };

    private handleDragEnd = e => {
        let x = gridify(e.target.x(), this.props.mapConfig.cellSize);
        let y = gridify(e.target.y(), this.props.mapConfig.cellSize);
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
        this.updateHelper(e);
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

const Helper = (props: { x: number, y: number, opacity: number }) =>
    <Rect
        x={gridify(props.x, 30)}
        y={gridify(props.y, 30)}
        height={30}
        width={30}
        opacity={1 - props.opacity}
        fill={'#7ddd9e'}
    />;

export default ActorComponent;