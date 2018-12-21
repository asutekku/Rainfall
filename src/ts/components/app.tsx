import * as React from "react";
import {Actor} from "../actors/Actor";
import {Goon} from "../actors/Enemies/Goon";
import {Player} from "../actors/player";
import {ActionLog} from "./actionLog/actionLog";
import {Message} from "./actionLog/messageComponent";
import {CharacterPanel} from "./characterPanel/characterPanel";
import {MainPanel} from "./mainPanel";
import {Sidebar} from "./sidebar";
import {ActorController} from "../actors/actorController";
import {Utils} from "../utils/utils";


export interface InterfaceAppState {
    activeMainPanel: string;
    activeChar: Actor | undefined;
    activeEnemy: Actor | undefined;
    party: Actor[];
    currentEnemies: Actor[];
    messages: Message[];
}

export class App extends React.Component<{}, InterfaceAppState> {

    private logLength = 20;

    constructor(props: any) {
        super(props);
        this.state = {
            activeMainPanel: "Character",
            activeChar: undefined,
            activeEnemy: undefined,
            party: [new Player(), new Player()],
            currentEnemies: [new Goon(), new Goon()],
            messages: [],
        };
    }

    public render() {
        // @ts-ignore
        return <div id={"mainpane"}>
            <Sidebar activeSelection={this.updateSelection}/>
            <MainPanel activeView={this.state.activeMainPanel} currentActor={this.getCurrentActor()}
                       currentEnemy={this.getCurrentEnemy()} messages={this.combatController}/>
            <ActionLog actor={this.getCurrentActor()} messages={this.state.messages}/>
            <CharacterPanel party={this.state.party}
                            enemies={this.state.currentEnemies}
                            activeSelection={this.getCharacter}
                            activeEnemy={this.getEnemy}/>
        </div>;
    }

    private combatController = (...messages: any): void => {
        let enemies = this.state.currentEnemies;

        // Removes dead enemies from the array
        enemies = enemies.filter((e: Actor) => e.health > 0);

        // If there are no Goons alive spawn one to three new goons
        if (enemies.length <= 0) {
            enemies = ActorController.getGoons(Utils.range(1, 3));
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

    private getCharacter = (actor: Actor) => {
        if (!actor) {
            this.setState({activeChar: this.state.party[0]});
        } else {
            this.setState({activeChar: actor});
        }
    };

    private getEnemy = (actor: Actor) => {
        if (!actor) {
            this.setState({activeEnemy: this.state.currentEnemies[0]});
        } else {
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
