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
import {MobileTab, MobileTabs} from "./mobileTabs";
import {MapNode, RunMap, RunState, encounterSpec, spawnEncounter} from "../interact/runMap";
import {MapView} from "./run/mapView";
import {RunEndView} from "./run/runEndView";
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
        // Run-loop takeovers (map / merchant / rest / run-over) sit above combat.
        const run = this.state.run;
        if (run && this.state.screen === "map") {
            return <MapView map={run.map} reachableIds={run.reachableIds} clearedIds={run.clearedIds}
                            party={this.state.party} onPick={this.enterNode} onAbandon={this.openCreator}/>;
        }
        if (run && this.state.screen === "end") {
            const kills = this.state.party.reduce((n, p) => n + p.kills, 0);
            const eddies = this.state.party.reduce((n, p) => n + Math.floor(p.currency), 0);
            return <RunEndView outcome={run.outcome === "won" ? "won" : "lost"}
                               depth={run.depth} kills={kills} eddies={eddies}
                               canRevive={run.outcome === "lost" && !run.reviveUsed}
                               onRevive={this.reviveRun} onNewCrew={this.openCreator}/>;
        }
        if (run && this.state.screen === "merchant") {
            return <div className={"metaOverlay"}>
                <div className={"metaHead"}><span className={"metaTitle"}>▤ Black Market</span>
                    <button className={"metaLeave"} onClick={this.leaveMeta}>Leave ▸</button></div>
                <Store player={this.getCurrentActor()} messages={this.noop}/>
            </div>;
        }
        if (run && this.state.screen === "rest") {
            return <div className={"metaOverlay"}>
                <div className={"metaHead"}><span className={"metaTitle"}>☾ Safehouse</span>
                    <button className={"metaLeave"} onClick={this.leaveMeta}>Leave ▸</button></div>
                <Downtime actor={this.getCurrentActor()}/>
            </div>;
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
                   view={this.state.activeMainPanel} messages={this.combatController}
                   onSelectAlly={this.getCharacter} onSelectEnemy={this.getEnemy}
                   onGotoCombat={this.gotoCombat}/>
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

    /** Build the squad and start a fresh run on the map (not straight into combat). */
    private deploySquad = (specs: CharacterSpec[]) => {
        this.stopAuto();
        const party = specs.map((s) => new Player(s));
        // Seed a placeholder wave so the combat shell never reads an empty array.
        const enemies = ActorController.getEnemies(2, App.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.setState({
            squadSpecs: specs,
            party,
            currentEnemies: enemies,
            activeChar: party[0],
            activeEnemy: enemies[0],
            creating: false,
            run: App.freshRun(party),
            screen: "map",
            activeMainPanel: "Combat",
            mobileTab: "arena",
            mobileMore: false,
            unread: 0,
            messages: [{msg: "— crew hits the street —"} as any],
        });
    };

    /** A brand-new act with the squad parked at the opening choices. */
    private static freshRun(_party: Actor[]): RunState {
        const map = RunMap.generate();
        return {
            map, node: null, clearedIds: [], reachableIds: RunMap.entryIds(map),
            reviveUsed: false, depth: 0, outcome: "active",
        };
    }

    /** Player picked a node on the map: fight it, or open its merchant / rest screen. */
    private enterNode = (node: MapNode) => {
        const run = this.state.run;
        if (!run) { return; }
        if (node.type === "merchant") { this.setState({run: {...run, node}, screen: "merchant"}); return; }
        if (node.type === "rest") { this.setState({run: {...run, node}, screen: "rest"}); return; }
        // combat / elite / boss
        const enemies = spawnEncounter(encounterSpec(node, App.levelOf(this.state.party)));
        Battlefield.deploy(this.state.party, enemies);
        const label = node.type === "boss" ? "BOSS — hold nothing back"
            : node.type === "elite" ? "elite contact" : "firefight";
        this.setState({
            run: {...run, node},
            screen: "combat",
            currentEnemies: enemies,
            activeEnemy: enemies[0],
            activeChar: this.state.party[0],
            activeMainPanel: "Combat",
            mobileTab: "arena",
            messages: [{msg: `— ${label} —`} as any, ...this.state.messages].slice(0, this.logLength),
        }, this.startAuto);
    };

    /** Leave a merchant / rest node and move back to the map. */
    private leaveMeta = () => {
        const run = this.state.run;
        if (run && run.node) { this.advance(run.node, [{msg: "— moving on —"}]); }
    };

    /** Mark a node cleared and either advance the map or end the run (boss = win). */
    private advance = (node: MapNode, extra: any[]) => {
        this.stopAuto();
        const run = this.state.run;
        if (!run) { return; }
        const clearedIds = run.clearedIds.concat(node.id);
        const depth = run.depth + 1;
        const messages = [...extra, ...this.state.messages].slice(0, this.logLength);
        if (node.type === "boss") {
            this.setState({run: {...run, clearedIds, depth, node: null, outcome: "won"}, screen: "end", messages});
        } else {
            this.setState({run: {...run, clearedIds, depth, node: null, reachableIds: node.next}, screen: "map", messages});
        }
    };

    /** Spend the one-per-run Trauma Team revive and resume the current fight. */
    private reviveRun = () => {
        const run = this.state.run;
        if (!run || run.reviveUsed) { return; }
        this.state.party.forEach((p) => p.revive());
        this.setState({
            run: {...run, reviveUsed: true, outcome: "active"},
            screen: "combat",
            messages: [{msg: "— Trauma Team revive (one per run) —"} as any, ...this.state.messages].slice(0, this.logLength),
        }, this.startAuto);
    };

    private startAuto = () => {
        if (this.autoTimer) { return; }
        this.setState({auto: true});
        this.autoTimer = setInterval(this.autoTick, 1200);
    };

    /** Re-open the creator (nav "New Squad" / abandon / new crew). */
    private openCreator = () => { this.stopAuto(); this.setState({creating: true, run: null, screen: "combat"}); };
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
        a.temperament = order[(order.indexOf(a.temperament) + 1) % order.length]!;
        this.forceUpdate();
    };

    private combatController = (...messages: any): void => {
        // In a run, combat is bounded by the current node (win/advance/wipe).
        if (this.state.run && this.state.screen === "combat") {
            this.runCombatStep(messages.flat());
            return;
        }
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

        // How many lines this exchange actually added — badges the Feed tab when
        // the player is looking at something else.
        const added = joined.length - this.state.messages.length;

        // Updates the state with new enemies and messages
        this.setState((s) => ({
                currentEnemies: enemies, activeEnemy: enemies[0], messages: joined,
                unread: s.mobileTab === "feed" ? 0 : s.unread + Math.max(0, added),
            })
        );

    };

    /**
     * One resolved round inside a run's combat node: end the run on a wipe,
     * advance the map when the node's enemies are cleared, otherwise keep fighting.
     */
    private runCombatStep(msgs: any[]): void {
        const party = this.state.party;
        const alive = this.state.currentEnemies.filter((e) => e.health > 0);
        const feed = [...msgs, ...this.state.messages].slice(0, this.logLength);

        if (party.every((p) => !p.canFight())) {          // squad wiped → run over (revive offered)
            this.stopAuto();
            const run = this.state.run!;
            this.setState({run: {...run, outcome: "lost"}, screen: "end", currentEnemies: alive, messages: feed});
            return;
        }
        if (alive.length <= 0) {                           // node cleared → shop + advance
            const shop: any[] = [];
            party.forEach((p) => { if (p.canFight()) { Economy.autoEquip(p).forEach((m) => shop.push({msg: m})); } });
            this.advance(this.state.run!.node!, [...shop, ...msgs]);
            return;
        }
        this.setState((s) => ({                            // ongoing exchange
            currentEnemies: alive, activeEnemy: alive[0], messages: feed,
            unread: s.mobileTab === "feed" ? 0 : s.unread + Math.max(0, msgs.length),
        }));
    }

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
        const enemies = ActorController.getEnemies(2, App.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.setState({
            party,
            currentEnemies: enemies,
            activeChar: party[0],
            activeEnemy: enemies[0],
            run: App.freshRun(party),
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
