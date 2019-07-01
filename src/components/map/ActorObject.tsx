import * as React from 'react';
import {Rect} from "react-konva";
import {Actor} from "../../ts/actors/Actor";
import {ObjectPosition} from "../../ts/utils/ObjectPosition";
import {getCell, gridify, MapConfig, PositionHolder} from "./MapUtils";
import {MapLayer} from "./MapLayer";
import {Player} from "../../ts/actors/player";
import {GameObject} from "../../ts/items/GameObject";

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

    componentDidMount(): void {
        this.getMoveHelper();
    }

    render() {
        return (<>
            {
                this.props.actor.selected && (this.props.actor instanceof Player) && this.props.actor.alive() ? this.state.helpers : null
            }
            <Rect
                x={this.props.actor.position.x}
                y={this.props.actor.position.y}
                numPoints={4}
                height={this.props.mapConfig.cellSize}
                width={this.props.mapConfig.cellSize}
                fill={this.getColor(this.props.actor)}
                stroke={this.props.actor.role.colorString}
                strokeWidth={3}
                opacity={0.8}
                draggable
                name={this.props.actor.identifier}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onDragMove={this.updateHelper}
                onMouseOver={this.hover}
                onMouseOut={this.hoverEnd}
                onClick={this.handleClick}
                key={this.props.actor.identifier}
            />
        </>);
    }

    getColor(actor): string {
        if (!actor.hostile) {
            if (actor.selected) {
                if (actor.alive()) {
                    return "#4d5eff";
                } else {
                    return "#676868";
                }
            } else {
                if (actor.alive()) {
                    return "#85abff";
                } else {
                    return "#888989";
                }
            }
        } else {
            if (actor.selected) {
                return "#ff2d7e";
            } else {
                return "#ff6686";
            }
        }
    }

    getMoveHelper(event?: any) {
        //this.props.grid.clear();
        let x = event ? event.target.x() : this.props.actor.position.x;
        let y = event ? event.target.y() : this.props.actor.position.y;
        console.log(x, y);
        const cs = this.props.mapConfig.cellSize;
        const playerX = getCell(x, cs);
        const playerY = getCell(y, cs);
        let grid = this.props.grid;
        let cells = [];
        let nth = 0;

        for (let i = playerX; i >= 0; i--) {
            if (this.compareCell(grid.grid[playerY][i], event)) {
                cells.push(<Helper x={i * cs} y={playerY * cs} key={'left' + i + '-' + playerY} opacity={nth * 0.05}/>);
                nth++;
            } else break;
        }
        nth = 0;
        for (let i = playerX; i < grid.width; i++) {
            if (this.compareCell(grid.grid[playerY][i], event)) {
                cells.push(<Helper x={i * cs} y={playerY * cs} key={'right' + i + '-' + playerY} opacity={nth * 0.05}/>);
                nth++;
            } else break;
        }
        nth = 0;
        for (let i = playerY; i >= 0; i--) {
            if (this.compareCell(grid.grid[i][playerX], event)) {
                cells.push(<Helper x={playerX * cs} y={i * cs} key={'above' + playerX + '-' + i} opacity={nth * 0.05}/>);
                nth++;
            } else break;
        }
        nth = 0;
        for (let i = playerY; i < grid.height; i++) {
            if (this.compareCell(grid.grid[i][playerX], event)) {
                cells.push(<Helper x={playerX * cs} y={i * cs} key={'below' + playerX + '-' + i} opacity={nth * 0.05}/>);
                nth++;
            } else break;
        }
        this.setState({helpers: cells});
        return <>
            {cells}
        </>;
    }

    private hover = e => {
        e.target.to({
            duration: 0.05,
            scale: 1.1,
            fill: !this.props.actor.hostile ? '#4d5eff' : '#ff2d7e'
        });
    };

    private hoverEnd = e => {
        e.target.to({
            duration: 0.05,
            scale: 1.1,
            fill: !this.props.actor.hostile ? (this.props.actor.selected ? '#4d5eff' : "#85abff") : (this.props.actor.selected ? '#ff2d7e' : "#ff6686")
        });
    };

    private compareCell(a: GameObject, e: any): boolean {
        return (typeof a === 'undefined') || (a as Actor).identifier === (e ? e.target.name() : this.props.actor.identifier);
    }

    private updateHelper = e => {
        this.getMoveHelper(e);
    };

    private handleDragStart = e => {
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