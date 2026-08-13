import * as React from "react";
import {Actor} from "../actors/Actor";
import {Goon} from "../actors/Enemies/Goon";
import {Player} from "../actors/player";
import {ActionLog} from "./actionLog/actionLog";
import {Message} from "./actionLog/messageComponent";
import {CharacterPanel} from "./characterPanel/characterPanel";
import {MainPanel} from "./mainPanel";
import {Sidebar} from "./sidebar";
import {Hud} from "./hud";
import {ActorController} from "../actors/actorController";
import {Combat} from "../interact/combat";
import {Utils} from "../utils/utils";


export interface InterfaceAppState {
    activeMainPanel: string;
    activeChar: Actor | undefined;
    activeEnemy: Actor | undefined;
    party: Actor[];
    currentEnemies: Actor[];
    messages: Message[];
    auto: boolean;
}

export class App extends React.Component<{}, InterfaceAppState> {

    private logLength = 20;
    private autoTimer: any = null;

    constructor(props: any) {
        super(props);
        this.state = {
            activeMainPanel: "Character",
            activeChar: undefined,
            activeEnemy: undefined,
            party: [new Player(), new Player()],
            currentEnemies: [new Goon(), new Goon()],
            messages: [],
            auto: false,
        };
    }

    public componentWillUnmount() {
        this.stopAuto();
    }

    public render() {
        // Ops Console shell: topbar (Hud) / nav rail (Sidebar) / center (MainPanel) / side rail.
        return <div id={"app"} className={"ops"}>
            <Hud actor={this.getCurrentActor()}/>
            <Sidebar active={this.state.activeMainPanel}
                     auto={this.state.auto}
                     activeSelection={this.updateSelection}
                     onAuto={this.toggleAuto}
                     onRestart={this.restart}
                     onRespawn={this.respawn}/>
            <MainPanel activeView={this.state.activeMainPanel} currentActor={this.getCurrentActor()}
                       currentEnemy={this.getCurrentEnemy()} party={this.state.party}
                       messages={this.combatController}/>
            <aside id={"rail"}>
                <CharacterPanel party={this.state.party}
                                enemies={this.state.currentEnemies}
                                activeSelection={this.getCharacter}
                                activeEnemy={this.getEnemy}/>
                <ActionLog actor={this.getCurrentActor()} messages={this.state.messages}/>
            </aside>
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

    /** Auto-combat: repeatedly resolve a full exchange between the active pair. */
    private toggleAuto = () => {
        if (this.state.auto) { this.stopAuto(); return; }
        this.setState({auto: true, activeMainPanel: "Combat"});
        this.autoTimer = setInterval(this.autoTick, 1200);
    };

    private stopAuto = () => {
        if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null; }
        if (this.state.auto) { this.setState({auto: false}); }
    };

    private autoTick = () => {
        const player = this.getCurrentActor();
        const enemy = this.getCurrentEnemy();
        if (!player || !enemy) { return; }
        // A downed player auto-stabilises the run instead of trading blows.
        if (!player.canFight() && !player.mortallyWounded) { this.stopAuto(); return; }
        const msgs = Combat.basicAction(player, enemy, null as any);
        this.combatController(msgs);
    };

    /** Fresh run: new party, new hostiles, cleared feed. */
    private restart = () => {
        this.stopAuto();
        this.setState({
            party: [new Player(), new Player()],
            currentEnemies: [new Goon(), new Goon()],
            activeChar: undefined,
            activeEnemy: undefined,
            messages: [{msg: "— run restarted —"} as any, ...this.state.messages].slice(0, this.logLength),
        });
    };

    /** Trauma Team pickup: fully revive and heal every squad member. */
    private respawn = () => {
        this.state.party.forEach((p) => p.revive());
        this.setState({
            messages: [{msg: "— squad revived (Trauma Team) —"} as any, ...this.state.messages].slice(0, this.logLength),
        });
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
