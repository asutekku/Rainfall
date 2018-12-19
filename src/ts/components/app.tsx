import * as React from "react";
import {Actor} from "../actors/Actor";
import {Goon} from "../actors/Enemies/Goon";
import {Player} from "../actors/player";
import {MessageCombat} from "../interact/messageSchema";
import {ActionLog} from "./actionLog/actionLog";
import {Message} from "./actionLog/messageComponent";
import {CharacterPanel} from "./characterPanel/characterPanel";
import {MainPanel} from "./mainPanel";
import {Sidebar} from "./sidebar";


export interface InterfaceAppState {
    activeMainPanel: string;
    activeChar: Actor | undefined;
    activeEnemy: Actor | undefined;
    party: Actor[];
    currentEnemies: Actor[];
    messages: Message[];
}

export class App extends React.Component<{}, InterfaceAppState> {
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

    public getMessage = (...messages: any) => {
        messages.flat().forEach((message: Message) => {
            console.log(message);
            if (message instanceof MessageCombat) {
                if (message.defender.health <= 0) {
                    const index: number = this.state.currentEnemies.findIndex((g) => g.name === message.defender.name);
                    const newArr = this.state.currentEnemies;
                    newArr[index] = new Goon();
                    this.setState({currentEnemies: newArr, activeEnemy: newArr[index]});
                }
            }
            // const joined = [message, ...this.state.messages];
            // if (joined.length >= 20) joined.pop();
            // this.setState({messages: joined})
        });
        const joined = [...messages.flat(), ...this.state.messages];
        if (joined.length >= 20) {
            joined.length = 20;
        }
        console.log(joined);
        this.setState({messages: joined});
    };

    public updateSelection = (selection: string) => {
        this.setState({activeMainPanel: selection});
    };

    public getCharacter = (actor: Actor) => {
        if (!actor) {
            this.setState({activeChar: this.state.party[0]});
        } else {
            this.setState({activeChar: actor});
        }
    };

    public render() {
        // @ts-ignore
        return <div id={"mainpane"}>
            <Sidebar activeSelection={this.updateSelection}/>
            <MainPanel activeView={this.state.activeMainPanel} currentActor={this.getCurrentActor()}
                       currentEnemy={this.getCurrentEnemy()} messages={this.getMessage}/>
            <ActionLog actor={this.getCurrentActor()} messages={this.state.messages}/>
            <CharacterPanel party={this.state.party}
                            enemies={this.state.currentEnemies}
                            activeSelection={this.getCharacter}
                            activeEnemy={this.getEnemy}/>
        </div>;
    }

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
