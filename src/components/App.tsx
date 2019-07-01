import * as React from "react";
import "../assets/scss/style.scss";
import {ActionLog} from "./actionLog/actionLog";
import {CharacterPanel} from "./characterPanel/characterPanel";
import {MainPanel} from "./mainPanel";
import {Sidebar} from "./sidebar";
import Map from "./map/map";
import {Actor} from "../ts/actors/Actor";
import {Player} from "../ts/actors/player";
import {Goon} from "../ts/actors/Enemies/Goon";
import {Utils} from "../ts/utils/utils";
import {ActorController} from "../ts/actors/actorController";
import {GameObject} from "../ts/items/GameObject";
import {ObjectPosition} from "../ts/utils/ObjectPosition";
import {getRandomPositionOnMap, PositionHolder} from "./map/MapUtils";
import Projectile from "../objects/Projectile";
import {IDefaultMessage} from "../ts/interact/messageSchema";

export interface InterfaceAppState {
    activeMainPanel: string;
    activeChar: Actor | undefined;
    activeEnemy: Actor | undefined;
    party: Actor[];
    currentEnemies: Actor[];
    messages: IDefaultMessage[];
    objects: GameObject[];
    effects: GameObject[];
}

class App extends React.Component<{}, InterfaceAppState> {

    private logLength = 20;
    private mapHeight = 300;
    private mapWidth = 450;
    private cellSize = 30;

    constructor(props: any) {
        super(props);
        this.state = {
            activeMainPanel: "Character",
            activeChar: null,
            activeEnemy: null,
            party: [new Player(new ObjectPosition(150, 150, 1)),
                new Player(new ObjectPosition(60, 150, 1))],
            currentEnemies: [
                new Goon(getRandomPositionOnMap(this.mapHeight, this.mapWidth, this.cellSize)),
                new Goon(getRandomPositionOnMap(this.mapHeight, this.mapWidth, this.cellSize))
            ],
            messages: [],
            objects: [],
            effects: []
        };
    }

    getObjects(): GameObject[] {
        return [...this.state.party, ...this.state.currentEnemies, ...this.state.objects, ...this.state.effects];
    }

    componentDidMount(): void {
        this.getCurrentActor();
        this.getCurrentEnemy();
    }

    addObject(obj: GameObject) {
        if (obj instanceof Projectile) {
            this.setState({effects: [obj]});
        } else {
            this.setState({objects: [...this.state.objects, obj]});
        }
    }

    updatePosition(pos: PositionHolder) {
        let objects = this.getObjects();
        let object = this.findObject(pos.id);
        object.move(pos.position);
    }

    findObject(id: string): GameObject {
        return this.getObjects().find(e => e.identifier === id);
    }

    setActive(identifier: string) {
        let active = (this.findObject(identifier) as Actor);
        if (active instanceof Player) {
            this.getCharacter(active);
        } else {
            this.getEnemy(active);
        }
    }

    render() {
        return <div id={"mainpane"}>
            <Sidebar activeSelection={this.updateSelection}/>
            <MainPanel activeView={this.state.activeMainPanel}
                       currentActor={this.getCurrentActor()}
                       currentEnemy={this.getCurrentEnemy()}
                       messages={this.combatController}
                       addObjectToMap={e => this.addObject(e)}/>
            <div className={'game-action-container'}>
                <Map objects={this.getObjects()}
                     updatePosition={e => this.updatePosition(e)}
                     makeActive={e => this.setActive(e)}
                     width={this.mapWidth}
                     height={this.mapHeight}
                     cellSize={this.cellSize}
                />
                <ActionLog messages={this.state.messages}/>
            </div>
            <CharacterPanel party={this.state.party}
                            enemies={this.state.currentEnemies}
                            activeSelection={this.getCharacter}
                            activeEnemy={this.getEnemy}/>
        </div>;
    }

    getSelection(): Actor {
        return this.state.party.find(e => e.selected);
    }

    private combatController = (...messages: any): void => {
        let enemies = this.state.currentEnemies;

        // Removes dead enemies from the array
        enemies = enemies.filter((e: Actor) => e.health > 0);

        // If there are no Goons alive spawn one to three new goons
        if (enemies.length <= 0) {
            enemies = ActorController.getGoons(Utils.getRandomInt(1, 4), this.mapHeight, this.mapWidth, this.cellSize);
        }

        // Joins all the messages together to form a single array
        const joined = [...messages.flat(), ...this.state.messages];

        // Sets the max amount of messages shown in the view
        if (joined.length >= this.logLength) joined.length = this.logLength;

        // Updates the state with new enemies and messages
        this.setState({
                currentEnemies: enemies, activeEnemy: enemies[0], messages: joined
            }
        );

    };

    private updateSelection = (selection: string) => {
        this.setState({activeMainPanel: selection});
    };

    private getCharacter = (actor: Actor): void => {
        let previousSelection = this.state.activeChar;
        if (previousSelection) previousSelection.selected = false;
        if (!actor) {
            let newSelection = this.state.party[0];
            newSelection.selected = true;
            this.setState({activeChar: newSelection});
        } else {
            actor.selected = true;
            this.setState({activeChar: actor});
        }
    };

    private getEnemy = (actor: Actor): void => {
        let previousSelection = this.state.activeEnemy;
        if (previousSelection) previousSelection.selected = false;
        if (!actor) {
            let newSelection = this.state.currentEnemies[0];
            newSelection.selected = true;
            this.setState({activeEnemy: newSelection});
        } else {
            actor.selected = true;
            this.setState({activeEnemy: actor});
        }
    };

    private getCurrentActor(): Actor {
        return !this.state.activeChar ? this.state.party[0] : this.state.activeChar;
    }

    private getCurrentEnemy(): Actor {
        return !this.state.activeEnemy ? this.state.currentEnemies[0] : this.state.activeEnemy;
    }
}


export default App;