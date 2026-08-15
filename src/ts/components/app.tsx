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
import {Battlefield, Point} from "../interact/battlefield";
import {Creator} from "./creation/creator";
import {CharacterCreation, CharacterSpec} from "../actors/resources/CharacterCreation";
import {MobileTab, MobileTabs} from "./mobileTabs";
import {RunNode, RunState} from "../interact/runMap";
import {RunController} from "../interact/runController";
import {RunEndView} from "./run/runEndView";
import {DebriefView} from "./run/debriefView";
import {BattleReport} from "../interact/battleReport";
import {MetaOverlay} from "./run/metaOverlay";
import {Store} from "./storePanel/store";
import {Downtime} from "./downtime/downtime";
import {OrderCtx, PlaybackBundle} from "./combat/battleScene";

/** Which run-loop screen is on top. "combat" falls through to the ops shell. */
export type RunScreen = "map" | "combat" | "debrief" | "merchant" | "rest" | "end";

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
    /** The sealed after-action report while the debrief screen is up. */
    report: BattleReport | null;
    /** Bumped when a new encounter starts — tells the 3D arena to build a fresh street. */
    battleId: number;
    /** The resolved turn currently being animated by the battle scene. */
    playback: PlaybackBundle | null;
    /** Order context while a manual squad member's turn waits for input. */
    orders: OrderCtx | null;
    /** Initiative queue: whose turn it is now ([0]) and who's coming up. */
    turnOrder: Actor[];
}

/**
 * Combat runs on a turn sequencer instead of a wall-clock interval: each unit's
 * turn is resolved by the engine into an event script, animated by the battle
 * scene, and only when the animation reports done does the next unit act.
 * Manual squad members interrupt the flow with an orders phase (XCOM-style);
 * auto mode (global or per-member) hands their turns to the tactical AI.
 */
export class App extends React.Component<{}, InterfaceAppState> {

    private logLength = 20;
    private queue: Actor[] = [];             // initiative order, minus the acting unit
    private pendingMsgs: any[] = [];         // feed lines held back until the animation lands
    private playId = 0;
    private turnTimer: number | null = null;
    private viewPaused = false;              // combat hidden behind another panel — resume on return

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
            report: null,
            battleId: 1,
            playback: null,
            orders: null,
            turnOrder: [],
        };
    }

    public override componentWillUnmount() {
        this.clearTurnTimer();
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
        if (run && this.state.screen === "debrief" && this.state.report) {
            return <DebriefView report={this.state.report} depth={run.depth}
                                canRevive={run.outcome === "lost" && !run.reviveUsed}
                                onClaim={this.claimLoot} onSell={this.sellLoot} onAutoKit={this.autoKit}
                                onContinue={this.leaveDebrief} onRevive={this.reviveRun}/>;
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
                   auto={this.state.auto}
                   battleId={this.state.battleId}
                   playback={this.state.playback}
                   orders={this.state.orders}
                   turnOrder={this.state.turnOrder}
                   onSelectAlly={this.getCharacter} onSelectEnemy={this.getEnemy}
                   onGotoCombat={this.gotoCombat} onPickNode={this.enterNode}
                   onPlaybackDone={this.onPlaybackDone}
                   onPickMove={this.onPickMove} onClearMove={this.onClearMove}
                   onPickTarget={this.onPickTarget}
                   onToggleAim={this.onToggleAim}
                   onExecute={this.executeOrders} onPass={this.passTurn}
                   onToggleAuto={this.toggleAuto}/>
            <MobileTabs tab={this.state.mobileTab} more={this.state.mobileMore}
                        unread={this.state.unread}
                        onTab={this.selectMobileTab} onMore={this.toggleMore}/>
            <button className={"mScrim"} tabIndex={-1} aria-hidden={true} onClick={this.closeMore}/>
        </div>;
    }

    private gotoCombat = () => {
        this.setState({activeMainPanel: "Combat", mobileTab: "arena"}, this.resumeIfPaused);
    };

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
        this.setState(next, this.resumeIfPaused);
    };

    private toggleMore = () => this.setState((s) => ({mobileMore: !s.mobileMore}));

    private closeMore = () => this.setState({mobileMore: false});

    private noop = () => { /* placeholder callback for reused panels */ };

    /** Build the squad and start a fresh run on the map. Run logic lives in RunController. */
    private deploySquad = (specs: CharacterSpec[]) => {
        this.resetSequencer();
        const party = specs.map((s) => new Player(s));
        // Seed a placeholder wave so the combat shell never reads an empty array.
        const enemies = ActorController.getEnemies(2, RunController.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.setState({
            squadSpecs: specs, party, currentEnemies: enemies,
            activeChar: party[0], activeEnemy: enemies[0],
            creating: false, run: RunController.freshRun(), screen: "map", report: null,
            activeMainPanel: "Combat", mobileTab: "arena", mobileMore: false, unread: 0,
            messages: [{msg: "— crew hits the street —"} as any],
            playback: null, orders: null, turnOrder: [],
        });
    };

    /** Player picked a node: fight it, or open its merchant / rest screen. */
    private enterNode = (node: RunNode) => {
        this.setState(RunController.enter(this.state, node, this.logLength) as any,
            () => { if (this.state.screen === "combat") { this.beginBattle(); } });
    };

    /** Leave a merchant / rest node and advance the map. */
    private leaveMeta = () => {
        const patch = RunController.leaveMeta(this.state, this.logLength);
        if (patch) { this.setState(patch as any); }
    };

    /** Debrief: equip a scavenged piece on the member who found it. */
    private claimLoot = (id: string) => {
        const report = this.state.report && RunController.claimLoot(this.state.report, id);
        if (report) { this.setState({report}); }
    };

    /** Debrief: fence a scavenged piece for eddies. */
    private sellLoot = (id: string) => {
        const report = this.state.report && RunController.sellLoot(this.state.report, id);
        if (report) { this.setState({report}); }
    };

    /** Debrief: let the fixer spend the payday on upgrades, on demand. */
    private autoKit = () => {
        if (this.state.report) { this.setState({report: RunController.autoKit(this.state, this.state.report)}); }
    };

    /** Leave the debrief: auto-kit whatever is left, then map / run-over screen. */
    private leaveDebrief = () => {
        this.setState(RunController.continueFromDebrief(this.state, this.logLength) as any);
    };

    /** Spend the one-per-run revive and resume the current fight. */
    private reviveRun = () => {
        const patch = RunController.revive(this.state, this.logLength);
        if (patch) { this.setState(patch as any, this.beginBattle); }
    };

    /** Re-open the creator (nav "New Squad" / abandon / new crew). */
    private openCreator = () => {
        this.resetSequencer();
        this.setState({creating: true, run: null, screen: "combat", report: null,
            playback: null, orders: null, turnOrder: []});
    };
    private closeCreator = () => this.setState({creating: false});

    /** Flip a squad member between manual and AI control. */
    private toggleActorAuto = (a: Actor) => {
        a.auto = !a.auto;
        // if that member was standing at the orders prompt, the AI takes over now
        const o = this.state.orders;
        if (a.auto && o && o.actor === a) {
            this.setState({orders: null}, () => this.resolveTurn(a));
        } else {
            this.forceUpdate();
        }
    };

    /** Cycle an auto squad member's AI playstyle. */
    private cycleTemperament = (a: Actor) => {
        const order = ["balanced", "aggressive", "flanker", "camper"];
        a.temperament = order[(order.indexOf(a.temperament) + 1) % order.length]!;
        this.forceUpdate();
    };

    /**
     * A resolved combat turn — hand its feed lines to RunController, which
     * advances the map, ends the run, or keeps the fight going.
     */
    private combatController = (...messages: any): void => {
        if (!this.state.run) { return; }
        this.setState(RunController.step(this.state, messages.flat(), this.logLength) as any);
    };

    // =====================================================================
    // Turn sequencer
    // =====================================================================

    private clearTurnTimer() {
        if (this.turnTimer !== null) { window.clearTimeout(this.turnTimer); this.turnTimer = null; }
    }

    private resetSequencer() {
        this.clearTurnTimer();
        this.queue = [];
        this.pendingMsgs = [];
        this.viewPaused = false;
    }

    /** A combat node just opened: fresh street, fresh initiative, first turn. */
    private beginBattle = () => {
        this.resetSequencer();
        this.setState({
            battleId: this.state.battleId + 1,
            playback: null, orders: null, turnOrder: [],
            activeMainPanel: "Combat", mobileTab: "arena",
        }, () => this.scheduleAdvance(500));
    };

    private scheduleAdvance(ms: number) {
        this.clearTurnTimer();
        this.turnTimer = window.setTimeout(this.advanceTurn, ms) as any;
    }

    private fightOver(): boolean {
        return this.state.party.every((p) => !p.canFight())
            || this.state.currentEnemies.every((e) => !e.canFight() && !e.mortallyWounded);
    }

    /** Hand the next unit its turn: orders prompt for manual members, AI otherwise. */
    private advanceTurn = () => {
        if (this.state.creating || this.state.screen !== "combat") { return; }
        if (this.state.playback || this.state.orders) { return; }
        if (!this.state.party.length || !this.state.currentEnemies.length) { return; }
        if (this.fightOver()) { return; }
        // combat is behind another panel — hold the fight until the player returns
        if (this.state.activeMainPanel !== "Combat") { this.viewPaused = true; return; }

        let unit: Actor | undefined;
        for (let round = 0; round < 2 && !unit; round++) {
            while (this.queue.length) {
                const n = this.queue.shift()!;
                if (n.alive && (n.canFight() || n.mortallyWounded)) { unit = n; break; }
            }
            if (!unit) {
                this.queue = Combat.beginRound(this.state.party, this.state.currentEnemies);
                if (!this.queue.length) { return; }
            }
        }
        if (!unit) { return; }
        this.setState({turnOrder: [unit, ...this.queue]});

        const manual = this.state.party.indexOf(unit) >= 0 && !unit.auto && !this.state.auto && unit.canFight();
        if (manual) {
            const foes = this.state.currentEnemies.filter((e) => e.canFight());
            const target = foes.length ? foes.reduce((a, b) =>
                Battlefield.distance(unit!, a) <= Battlefield.distance(unit!, b) ? a : b) : null;
            this.setState({
                orders: {actor: unit, pendingMove: null, target, aimed: false},
                activeChar: unit, activeEnemy: target || this.state.activeEnemy,
            });
        } else {
            this.resolveTurn(unit);
        }
    };

    /** Resolve one unit's turn through the engine and ship it to the animator. */
    private resolveTurn = (unit: Actor, order?: {moveTo?: Point | undefined; target?: Actor | undefined; aimed?: boolean | undefined}) => {
        const res = Combat.takeTurn(unit, this.state.party, this.state.currentEnemies, order);
        this.pendingMsgs = res.messages;
        this.playId += 1;
        this.setState({playback: {id: this.playId, events: res.events}, orders: null});
    };

    /** The scene finished animating a turn: commit its feed lines, move on. */
    private onPlaybackDone = (id: number) => {
        if (id !== this.playId || !this.state.playback) { return; }
        const msgs = this.pendingMsgs;
        this.pendingMsgs = [];
        const done = () => {
            if (this.state.screen === "combat") {
                this.scheduleAdvance(this.state.auto ? 160 : 300);
            }
        };
        if (this.state.run) {
            const patch = RunController.step(this.state, msgs, this.logLength);
            this.setState({...patch, playback: null} as any, done);
        } else {
            this.setState({
                playback: null,
                messages: [...msgs, ...this.state.messages].slice(0, this.logLength) as any,
            }, done);
        }
    };

    /** Combat resumes when the player returns to the arena panel. */
    private resumeIfPaused = () => {
        if (this.viewPaused && this.state.activeMainPanel === "Combat" && this.state.screen === "combat") {
            this.viewPaused = false;
            this.scheduleAdvance(250);
        }
    };

    // ------------------------------------------------------------- orders --

    private onPickMove = (p: Point) => {
        const o = this.state.orders;
        if (o) { this.setState({orders: {...o, pendingMove: p}}); }
    };

    private onClearMove = () => {
        const o = this.state.orders;
        if (o) { this.setState({orders: {...o, pendingMove: null}}); }
    };

    private onPickTarget = (a: Actor) => {
        const o = this.state.orders;
        if (o) { this.setState({orders: {...o, target: a}, activeEnemy: a}); }
    };

    private onToggleAim = () => {
        const o = this.state.orders;
        if (o) { this.setState({orders: {...o, aimed: !o.aimed}}); }
    };

    private executeOrders = () => {
        const o = this.state.orders;
        if (!o) { return; }
        this.resolveTurn(o.actor, {
            moveTo: o.pendingMove || undefined,
            target: o.target && o.target.canFight() ? o.target : undefined,
            aimed: o.aimed,
        });
    };

    private passTurn = () => {
        const o = this.state.orders;
        if (!o) { return; }
        this.resolveTurn(o.actor, {});
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
        }, this.resumeIfPaused);
    };

    /** Auto mode: the tactical AI plays the whole squad, back-to-back turns. */
    private toggleAuto = () => {
        const auto = !this.state.auto;
        const o = this.state.orders;
        this.setState({auto, activeMainPanel: "Combat", mobileTab: "arena", mobileMore: false,
            orders: auto ? null : o}, () => {
            if (auto && o) { this.resolveTurn(o.actor); }       // the prompt-holder acts now
            else if (auto) { this.resumeIfPaused(); }
        });
    };

    /** Fresh run — a new act with the same crew, back on the map. */
    private restart = () => {
        this.resetSequencer();
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
            report: null,
            playback: null, orders: null, turnOrder: [],
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
        const chosen = actor || this.state.currentEnemies[0];
        // during an orders phase, tapping a hostile anywhere retargets the order
        const o = this.state.orders;
        if (o && chosen && chosen.canFight()) {
            this.setState({activeEnemy: chosen, orders: {...o, target: chosen}});
            return;
        }
        this.setState({activeEnemy: chosen});
    };

    private getCurrentActor(): Actor {
        return !this.state.activeChar ? this.state.party[0]! : this.state.activeChar;
    }

    private getCurrentEnemy(): Actor {
        return !this.state.activeEnemy ? this.state.currentEnemies[0]! : this.state.activeEnemy;
    }
}
