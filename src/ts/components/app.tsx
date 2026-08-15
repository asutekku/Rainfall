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
import {Creator} from "./creation/creator";
import {CharacterCreation, CharacterSpec} from "../actors/resources/CharacterCreation";
import {MobileTab, MobileTabs} from "./mobileTabs";
import {MapNode, RunState} from "../interact/runMap";
import {RunController} from "../interact/runController";
import {RunEndView} from "./run/runEndView";
import {MetaOverlay} from "./run/metaOverlay";
import {Store} from "./storePanel/store";
import {Downtime} from "./downtime/downtime";

/** Which run-loop screen is on top. "combat" falls through to the ops shell. */
export type RunScreen = "map" | "combat" | "merchant" | "rest" | "end";

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
    /** Which mobile destination is on screen. Ignored above the breakpoint. */
    mobileTab: MobileTab;
    /** More sheet open (mobile only). */
    mobileMore: boolean;
    /** Feed lines that arrived while the Feed tab was off screen. */
    unread: number;
    /** The Slay-the-Spire run in progress (null before a crew deploys). */
    run: RunState | null;
    /** Which run-loop screen is on top. */
    screen: RunScreen;
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
        const enemies = ActorController.getEnemies(2, RunController.levelOf(party));
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
            mobileTab: "arena",
            mobileMore: false,
            unread: 0,
            run: null,
            screen: "combat",
        };
    }

    public override componentWillUnmount() {
        this.stopAuto();
    }

    public override render() {
        // Character creation is a full-screen takeover shown before / on demand.
        if (this.state.creating) {
            return <Creator initial={this.state.squadSpecs} canCancel={this.state.run !== null}
                            onDeploy={this.deploySquad} onCancel={this.closeCreator}/>;
        }
        // Run-loop takeovers that sit ABOVE the shell. The city map and combat
        // both render inside the shell (via Stage) so the nav / bottom bar stay.
        const run = this.state.run;
        if (run && this.state.screen === "end") {
            const kills = this.state.party.reduce((n, p) => n + p.kills, 0);
            const eddies = this.state.party.reduce((n, p) => n + Math.floor(p.currency), 0);
            return <RunEndView outcome={run.outcome === "won" ? "won" : "lost"}
                               depth={run.depth} kills={kills} eddies={eddies}
                               canRevive={run.outcome === "lost" && !run.reviveUsed}
                               onRevive={this.reviveRun} onNewCrew={this.openCreator}/>;
        }
        if (run && this.state.screen === "merchant") {
            return <MetaOverlay title={"▤ Black Market"} onLeave={this.leaveMeta}>
                <Store player={this.getCurrentActor()} messages={this.noop}/>
            </MetaOverlay>;
        }
        if (run && this.state.screen === "rest") {
            return <MetaOverlay title={"☾ Safehouse"} onLeave={this.leaveMeta}>
                <Downtime actor={this.getCurrentActor()}/>
            </MetaOverlay>;
        }
        // Battle Stage shell: topbar (Hud) / nav rail / feed column (squad + feed) / stage (game).
        // On phones the same DOM re-flows into a tab console — see the mobile block
        // in style.css, which drives everything off data-mtab / data-more.
        return <div id={"app"} className={"ops"}
                    data-mtab={this.state.mobileTab}
                    data-more={this.state.mobileMore ? "1" : "0"}
                    data-view={this.state.activeMainPanel}>
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
                   view={this.state.activeMainPanel} screen={this.state.screen} run={this.state.run}
                   messages={this.combatController}
                   onSelectAlly={this.getCharacter} onSelectEnemy={this.getEnemy}
                   onGotoCombat={this.gotoCombat} onPickNode={this.enterNode}/>
            <MobileTabs tab={this.state.mobileTab} more={this.state.mobileMore}
                        unread={this.state.unread}
                        onTab={this.selectMobileTab} onMore={this.toggleMore}/>
            <button className={"mScrim"} tabIndex={-1} aria-hidden={true} onClick={this.closeMore}/>
        </div>;
    }

    private gotoCombat = () => this.setState({activeMainPanel: "Combat", mobileTab: "arena"});

    /**
     * Mobile destination switch. Arena and Gear also drive the desktop panel
     * state, so the Stage renders the right thing; Squad and Feed only surface
     * panels that are always mounted in the feed column.
     */
    private selectMobileTab = (tab: MobileTab) => {
        const next: any = {mobileTab: tab, mobileMore: false};
        if (tab === "arena") { next.activeMainPanel = "Combat"; }
        if (tab === "gear") { next.activeMainPanel = "Inventory"; }
        if (tab === "feed") { next.unread = 0; }
        this.setState(next);
    };

    private toggleMore = () => this.setState((s) => ({mobileMore: !s.mobileMore}));

    private closeMore = () => this.setState({mobileMore: false});

    private noop = () => { /* placeholder callback for reused panels */ };

    /** Build the squad and start a fresh run on the map. Run logic lives in RunController. */
    private deploySquad = (specs: CharacterSpec[]) => {
        this.stopAuto();
        const party = specs.map((s) => new Player(s));
        // Seed a placeholder wave so the combat shell never reads an empty array.
        const enemies = ActorController.getEnemies(2, RunController.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.setState({
            squadSpecs: specs, party, currentEnemies: enemies,
            activeChar: party[0], activeEnemy: enemies[0],
            creating: false, run: RunController.freshRun(), screen: "map",
            activeMainPanel: "Combat", mobileTab: "arena", mobileMore: false, unread: 0,
            messages: [{msg: "— crew hits the street —"} as any],
        });
    };

    /** Player picked a node: fight it, or open its merchant / rest screen. */
    private enterNode = (node: MapNode) => {
        this.setState(RunController.enter(this.state, node, this.logLength) as any,
            () => { if (this.state.screen === "combat") { this.startAuto(); } });
    };

    /** Leave a merchant / rest node and advance the map. */
    private leaveMeta = () => {
        const patch = RunController.leaveMeta(this.state, this.logLength);
        if (patch) { this.setState(patch as any); }
    };

    /** Spend the one-per-run revive and resume the current fight. */
    private reviveRun = () => {
        const patch = RunController.revive(this.state, this.logLength);
        if (patch) { this.setState(patch as any, this.startAuto); }
    };

    private startAuto = () => {
        if (this.autoTimer) { return; }
        this.setState({auto: true});
        this.autoTimer = setInterval(this.autoTick, 1200);
    };

    /** Re-open the creator (nav "New Squad" / abandon / new crew). */
    private openCreator = () => { this.stopAuto(); this.setState({creating: true, run: null, screen: "combat"}); };
    private closeCreator = () => this.setState({creating: false});

    /** Flip a squad member between manual and AI control. */
    private toggleActorAuto = (a: Actor) => { a.auto = !a.auto; this.forceUpdate(); };

    /** Cycle an auto squad member's AI playstyle. */
    private cycleTemperament = (a: Actor) => {
        const order = ["balanced", "aggressive", "flanker", "camper"];
        a.temperament = order[(order.indexOf(a.temperament) + 1) % order.length]!;
        this.forceUpdate();
    };

    /**
     * A resolved combat round (from auto-play or a manual action) — hand it to
     * RunController, which advances the map, ends the run, or keeps the fight
     * going, then pause auto once the fight leaves the combat screen.
     */
    private combatController = (...messages: any): void => {
        if (!this.state.run) { return; }
        this.setState(RunController.step(this.state, messages.flat(), this.logLength) as any,
            () => { if (this.state.screen !== "combat") { this.stopAuto(); } });
    };

    /**
     * A view was picked from the nav rail — on desktop that is the whole story;
     * on mobile the rail is the More sheet, so also close it and move to the
     * destination that actually shows the chosen view.
     */
    private updateSelection = (selection: string) => {
        this.setState({
            activeMainPanel: selection,
            mobileMore: false,
            mobileTab: selection === "Combat" ? "arena" : selection === "Inventory" ? "gear" : "panel",
        });
    };

    /** Auto-combat: repeatedly resolve a full exchange between the active pair. */
    private toggleAuto = () => {
        if (this.state.auto) { this.stopAuto(); return; }
        this.setState({auto: true, activeMainPanel: "Combat", mobileTab: "arena", mobileMore: false});
        this.autoTimer = setInterval(this.autoTick, 1200);
    };

    private stopAuto = () => {
        if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null; }
        if (this.state.auto) { this.setState({auto: false}); }
    };

    private autoTick = () => {
        // Auto only runs on the combat screen; a map/merchant/rest takeover pauses it.
        if (this.state.run && this.state.screen !== "combat") { this.stopAuto(); return; }
        const party = this.state.party;
        const enemies = this.state.currentEnemies;
        if (!party.length || !enemies.length) { return; }
        // Whole squad down? In a run, resolve one more round so the run-over screen
        // shows; in legacy endless mode there's nothing left to play.
        if (party.every((p) => !p.canFight()) && !this.state.run) { this.stopAuto(); return; }
        // Full smart round: both sides move + act via the tactical AI.
        const msgs = Combat.autoRound(party, enemies);
        this.combatController(msgs);
    };

    /** Fresh run — a new act with the same crew, back on the map. */
    private restart = () => {
        this.stopAuto();
        const specs = this.state.squadSpecs.length ? this.state.squadSpecs
            : [CharacterCreation.defaultSpec(), CharacterCreation.defaultSpec()];
        const party = specs.map((s) => new Player(s));
        const enemies = ActorController.getEnemies(2, RunController.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.setState({
            party,
            currentEnemies: enemies,
            activeChar: party[0],
            activeEnemy: enemies[0],
            run: RunController.freshRun(),
            screen: "map",
            messages: [{msg: "— new job, same crew —"} as any],
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
        return !this.state.activeChar ? this.state.party[0]! : this.state.activeChar;
    }

    private getCurrentEnemy(): Actor {
        return !this.state.activeEnemy ? this.state.currentEnemies[0]! : this.state.activeEnemy;
    }
}
