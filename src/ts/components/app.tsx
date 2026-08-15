import * as React from "react";
import {Actor} from "../actors/Actor";
import {Player} from "../actors/player";
import {ActionLog} from "./actionLog/actionLog";
import {Message} from "./actionLog/messageComponent";
import {Party} from "./characterPanel/party";
import {Stage} from "./combat/stage";
import {Sidebar} from "./sidebar";
import {Hud} from "./hud";
import {ActorController} from "../actors/actorController";
import {Combat} from "../interact/combat";
import {Battlefield} from "../interact/battlefield";
import {Economy} from "../interact/economy";
import {Utils} from "../utils/utils";
import {Creator} from "./creation/creator";
import {CharacterCreation, CharacterSpec} from "../actors/resources/CharacterCreation";


export interface InterfaceAppState {
    activeMainPanel: string;
    activeChar: Actor | undefined;
    activeEnemy: Actor | undefined;
    party: Actor[];
    currentEnemies: Actor[];
    messages: Message[];
    auto: boolean;
    creating: boolean;
    squadSpecs: CharacterSpec[];
}

export class App extends React.Component<{}, InterfaceAppState> {

    private logLength = 20;
    private autoTimer: any = null;

    constructor(props: any) {
        super(props);
        // Boot into character creation, pre-filled with a two-merc default squad
        // (one-click Deploy still works). The specs also seed a valid party so the
        // game state behind the creator is never empty.
        const squadSpecs = [CharacterCreation.defaultSpec(), CharacterCreation.defaultSpec()];
        const party = squadSpecs.map((s) => new Player(s));
        const enemies = ActorController.getEnemies(2, App.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.state = {
            activeMainPanel: "Character",
            activeChar: undefined,
            activeEnemy: undefined,
            party,
            currentEnemies: enemies,
            messages: [],
            auto: false,
            creating: true,
            squadSpecs,
        };
    }

    public componentWillUnmount() {
        this.stopAuto();
    }

    public render() {
        // Character creation is a full-screen takeover shown before / on demand.
        if (this.state.creating) {
            return <Creator initial={this.state.squadSpecs} canCancel={true}
                            onDeploy={this.deploySquad} onCancel={this.closeCreator}/>;
        }
        // Battle Stage shell: topbar (Hud) / nav rail / feed column (squad + feed) / stage (game).
        return <div id={"app"} className={"ops"}>
            <Hud actor={this.getCurrentActor()}/>
            <Sidebar active={this.state.activeMainPanel}
                     auto={this.state.auto}
                     activeSelection={this.updateSelection}
                     onAuto={this.toggleAuto}
                     onRestart={this.restart}
                     onRespawn={this.respawn}
                     onCreate={this.openCreator}/>
            <section id={"feedcol"}>
                <Party name={"Squad"} party={this.state.party} activeSelection={this.getCharacter} friendly={true}
                       onToggleAuto={this.toggleActorAuto} onCycleTemperament={this.cycleTemperament}/>
                <ActionLog actor={this.getCurrentActor()} messages={this.state.messages}/>
            </section>
            <Stage actor={this.getCurrentActor()} enemy={this.getCurrentEnemy()}
                   party={this.state.party} enemies={this.state.currentEnemies}
                   view={this.state.activeMainPanel} messages={this.combatController}
                   onSelectAlly={this.getCharacter} onSelectEnemy={this.getEnemy}
                   onGotoCombat={this.gotoCombat}/>
        </div>;
    }

    private gotoCombat = () => this.setState({activeMainPanel: "Combat"});

    /** Build the squad from the creation specs and drop into combat. */
    private deploySquad = (specs: CharacterSpec[]) => {
        this.stopAuto();
        const party = specs.map((s) => new Player(s));
        const enemies = ActorController.getEnemies(2, App.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.setState({
            squadSpecs: specs,
            party,
            currentEnemies: enemies,
            activeChar: party[0],
            activeEnemy: enemies[0],
            creating: false,
            activeMainPanel: "Combat",
            messages: [{msg: "— crew deployed to the street —"} as any],
        });
    };

    /** Re-open the creator (nav "New Squad"). */
    private openCreator = () => { this.stopAuto(); this.setState({creating: true}); };
    private closeCreator = () => this.setState({creating: false});

    /** Highest level in a party — the yardstick for scaling enemy waves. */
    private static levelOf(party: Actor[]): number {
        return party.reduce((m, p) => Math.max(m, p.level), 1);
    }

    /** Flip a squad member between manual and AI control. */
    private toggleActorAuto = (a: Actor) => { a.auto = !a.auto; this.forceUpdate(); };

    /** Cycle an auto squad member's AI playstyle. */
    private cycleTemperament = (a: Actor) => {
        const order = ["balanced", "aggressive", "flanker", "camper"];
        a.temperament = order[(order.indexOf(a.temperament) + 1) % order.length];
        this.forceUpdate();
    };

    private combatController = (...messages: any): void => {
        let enemies = this.state.currentEnemies;

        // Removes dead enemies from the array
        enemies = enemies.filter((e: Actor) => e.health > 0);

        // If there are no enemies alive, the wave is clear: auto-shop upgrades, then respawn.
        const shopMsgs: any[] = [];
        if (enemies.length <= 0) {
            this.state.party.forEach((p) => {
                if (p.canFight() && (this.state.auto || p.auto)) {
                    Economy.autoEquip(p).forEach((m) => shopMsgs.push({msg: m}));
                }
            });
            enemies = ActorController.getEnemies(Utils.range(1, 3), App.levelOf(this.state.party));
            Battlefield.deployEnemies(enemies);
        }

        // Joins all the messages together to form a single array
        const joined = [...shopMsgs, ...messages.flat(), ...this.state.messages];

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
        const party = this.state.party;
        const enemies = this.state.currentEnemies;
        if (!party.length || !enemies.length) { return; }
        // Whole squad down? Nothing left to auto-play.
        if (party.every((p) => !p.canFight())) { this.stopAuto(); return; }
        // Full smart round: both sides move + act via the tactical AI.
        const msgs = Combat.autoRound(party, enemies);
        this.combatController(msgs);
    };

    /** Fresh run: new party, new hostiles, cleared feed. */
    private restart = () => {
        this.stopAuto();
        const party = [new Player(), new Player()];
        const enemies = ActorController.getEnemies(2, App.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.setState({
            party,
            currentEnemies: enemies,
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
