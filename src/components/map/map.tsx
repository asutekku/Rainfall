import * as React from 'react';
import {PrimaryTitle} from "../general/primaryTitle";
import {Layer, Rect, Stage} from "react-konva";
import {GameObject} from "../../ts/items/GameObject";
import {Actor} from "../../ts/actors/Actor";
import ActorComponent from "./ActorObject";
import ProjectileObject from "./ProjectileObject";
import Projectile from "../../objects/Projectile";
import MapGrid from "./MapGrid";


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
}

class Map extends React.Component<MapProps, MapState> {

    public addObject(object: any) {
        this.state.objects;
    }

    drawObjects() {
        let objects = this.props.objects.map((o: GameObject, i: number) => {
            if (o instanceof Actor) {
                return <ActorComponent actor={o} cellSize={this.props.cellSize} updatePosition={e => this.props.updatePosition(e)}
                                       makeActive={e => this.props.makeActive(e)}/>;
            } else if (o instanceof Projectile) {
                return <ProjectileObject start={o.start} end={o.end} cellSize={this.props.cellSize}/>;
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