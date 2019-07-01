import * as React from 'react';
import {PrimaryTitle} from "../general/primaryTitle";
import {Layer, Rect, Stage} from "react-konva";
import {GameObject} from "../../ts/items/GameObject";
import {Actor} from "../../ts/actors/Actor";
import ActorComponent from "./ActorObject";
import ProjectileObject from "./ProjectileObject";
import Projectile from "../../objects/Projectile";
import MapGrid from "./MapGrid";
import {MapLayer} from "./MapLayer";
import {MapConfig} from "./MapUtils";


interface MapProps {
    width: number;
    height: number;
    cellSize: number;
    objects: GameObject[];
    updatePosition: any;
    makeActive: any;
}

interface MapState {
    objects: any[];
    actorLayer: MapLayer;
    mapConfig: MapConfig;
}

class Map extends React.Component<MapProps, MapState> {

    constructor(props: MapProps) {
        super(props);
        this.state = {
            actorLayer: new MapLayer(this.props.height / this.props.cellSize, this.props.width / this.props.cellSize),
            objects: [],
            mapConfig: new MapConfig(this.props.width, this.props.height, this.props.cellSize)
        };
    }

    public addObject(object: any) {
        this.state.objects;
    }

    drawObjects() {
        this.state.actorLayer.clear();
        let objects = this.props.objects.map((o: GameObject, i: number) => {
            let x = o.position.x / this.state.mapConfig.cellSize;
            let y = o.position.y / this.state.mapConfig.cellSize;
            if (o instanceof Actor) {
                this.state.actorLayer.addObject(o, x, y);
                return <ActorComponent actor={o}
                                       mapConfig={this.state.mapConfig}
                                       grid={this.state.actorLayer}
                                       updatePosition={e => this.props.updatePosition(e)}
                                       makeActive={e => this.props.makeActive(e)}
                                       key={'act' + i}/>;
            } else if (o instanceof Projectile) {
                return <ProjectileObject start={o.start} end={o.end} cellSize={this.props.cellSize}
                                         key={'proj' + i}/>;
            }
        });
        return objects;
    }

    render() {
        return (<div className={'game-action-container'}>
                <PrimaryTitle title={"Map"} noMenus={true}/>
                <Stage width={450} height={300}>
                    <Layer>
                        <Rect height={this.props.height} width={this.props.width} fill={'#dddddd'}/>
                        <MapGrid height={this.props.height} width={this.props.width} cellSize={this.props.cellSize} color={'#b1b1b1'}/>
                        {this.drawObjects()}
                    </Layer>
                </Stage>
            </div>
        );
    }
}

export default Map;