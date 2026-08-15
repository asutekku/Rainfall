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
import {RunNode, RunState, spawnEncounter} from "../interact/runMap";
import {RunController} from "../interact/runController";
import {Events, EventOutcome, makeCtx} from "../interact/events";
import {RunEndView} from "./run/runEndView";
import {DebriefView} from "./run/debriefView";
import {BattleRecorder, BattleReport} from "../interact/battleReport";
import {EventView} from "./run/eventView";
import {MarketView} from "./run/marketView";
import {SafehouseView} from "./run/safehouseView";
import {Crew} from "../interact/crew";
import {MercMarket, MercOffer} from "../interact/mercMarket";
import {Merc} from "../actors/Merc";
import {HireBoard} from "./run/hireBoard";
import {SectorClearView} from "./run/sectorClearView";
import {MetaOverlay} from "./run/metaOverlay";
import {OrderCtx, PlaybackBundle} from "./combat/battleScene";

/** Which run-loop screen is on top. "combat" falls through to the ops shell. */
export type RunScreen = "map" | "combat" | "debrief" | "merchant" | "rest" | "hire" | "sector" | "event" | "end";

export interface InterfaceAppState {
    activeMainPanel: string;
    /** Your merc — the one who persists across runs. Never a casualty. */
    character: Actor;
    activeChar: Actor | undefined;
    activeEnemy: Actor | undefined;
    party: Actor[];
    currentEnemies: Actor[];
    messages: Message[];
    auto: boolean;
    creating: boolean;
    /** The spec your character was built from, so "new character" opens where you left it. */
    characterSpec: CharacterSpec;
    /** Candidates on the board while a hire screen is up. */
    offers: MercOffer[];
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
    /** The street encounter being resolved (screen === "event"). */
    eventId: string | null;
    /** Encounters already seen this run (no reruns until the pool dries up). */
    usedEvents: string[];
    /** The crew's shared purse — every payday, hire and store buy runs through it. */
    crew: Crew;
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
        // Boot into character creation, pre-filled with a ready-to-run merc
        // (one-click Deploy still works). The spec also seeds a valid party so
        // the game state behind the creator is never empty.
        const characterSpec = CharacterCreation.defaultSpec();
        const character = new Player(characterSpec);
        const party = [character];
        const enemies = ActorController.getEnemies(2, RunController.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.state = {
            activeMainPanel: "Character",
            character,
            activeChar: undefined,
            activeEnemy: undefined,
            party,
            currentEnemies: enemies,
            messages: [],
            auto: false,
            creating: true,
            characterSpec,
            offers: [],
            mobileTab: "arena",
            mobileMore: false,
            unread: 0,
            run: null,
            screen: "combat",
            report: null,
            eventId: null,
            usedEvents: [],
            crew: new Crew().activate(),
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
            return <Creator initial={this.state.characterSpec} canCancel={this.state.run !== null}
                            onDeploy={this.deployCharacter} onCancel={this.closeCreator}/>;
        }
        // Run-loop takeovers that sit ABOVE the shell. The city map and combat
        // both render inside the shell (via Stage) so the nav / bottom bar stay.
        const run = this.state.run;
        if (run && this.state.screen === "debrief" && this.state.report) {
            return <DebriefView report={this.state.report} sector={run.sector}
                                canRevive={run.outcome === "lost" && !run.reviveUsed}
                                canAct={run.outcome !== "lost" || !run.reviveUsed}
                                funds={this.state.crew.funds}
                                onClaim={this.claimLoot} onSell={this.sellLoot} onAutoKit={this.autoKit}
                                onBuyout={this.buyoutMerc}
                                onContinue={this.leaveDebrief} onRevive={this.reviveRun}/>;
        }
        if (run && this.state.screen === "sector") {
            return <SectorClearView sector={run.sector} funds={this.state.crew.funds}
                                    party={this.state.party} offers={this.state.offers}
                                    cap={RunController.SQUAD_CAP}
                                    onHire={this.hireMerc} onContinue={this.nextSector}/>;
        }
        if (run && this.state.screen === "end") {
            return <RunEndView character={this.state.character} sector={run.sector}
                               depth={run.depth} kills={this.state.character.kills}
                               canRevive={!run.reviveUsed}
                               onRevive={this.reviveRun} onNextRun={this.nextRun}
                               onNewCharacter={this.openCreator}/>;
        }
        if (run && this.state.screen === "hire") {
            return <MetaOverlay title={"☰ Fixer’s Table"} onLeave={this.leaveMeta}>
                <HireBoard offers={this.state.offers} party={this.state.party}
                           funds={this.state.crew.funds} cap={RunController.SQUAD_CAP}
                           onHire={this.hireMerc}/>
            </MetaOverlay>;
        }
        if (run && this.state.screen === "merchant") {
            return <MarketView party={this.state.party} onLeave={this.leaveMeta}/>;
        }
        if (run && this.state.screen === "rest") {
            return <SafehouseView party={this.state.party} onLeave={this.leaveSafehouse}/>;
        }
        if (run && this.state.screen === "event" && this.state.eventId) {
            const ev = Events.byId(this.state.eventId);
            if (ev) { return <EventView event={ev} party={this.state.party} onDone={this.finishEvent}/>; }
        }
        // Battle Stage shell: topbar (Hud) / nav rail / feed column (squad + feed) / stage (game).
        // On phones the same DOM re-flows into a tab console — see the mobile block
        // in style.css, which drives everything off data-mtab / data-more.
        return <div id={"app"} className={"ops"}
                    data-mtab={this.state.mobileTab}
                    data-more={this.state.mobileMore ? "1" : "0"}
                    data-view={this.state.activeMainPanel}>
            <Hud actor={this.getCurrentActor()} crew={this.state.crew}/>
            <Sidebar active={this.state.activeMainPanel}
                     auto={this.state.auto}
                     inRun={this.state.run !== null}
                     activeSelection={this.updateSelection}
                     onAuto={this.toggleAuto}
                     onCreate={this.openCreator}/>
            <section id={"feedcol"}>
                <Party name={"Squad"} party={this.state.party} activeSelection={this.getCharacter} friendly={true}
                       onToggleAuto={this.toggleActorAuto} onCycleTemperament={this.cycleTemperament}/>
                <ActionLog actor={this.getCurrentActor()} messages={this.state.messages}/>
            </section>
            <Stage actor={this.getCurrentActor()} enemy={this.getCurrentEnemy()}
                   party={this.state.party} enemies={this.state.currentEnemies}
                   view={this.state.activeMainPanel} screen={this.state.screen} run={this.state.run}
                   messages={this.combatController} onNotice={this.pushNotice}
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

    /** A panel wants a line in the feed — never a combat round. */
    private pushNotice = (msg: any) => this.setState((st) => ({
        messages: [msg, ...st.messages].slice(0, this.logLength),
    }));

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

    /** Build your character and hit the street. The crew gets hired on the way. */
    private deployCharacter = (spec: CharacterSpec) => {
        this.resetSequencer();
        const character = new Player(spec);
        // Never start alone: the fixer throws in a rookie with the job.
        const party = [character, new Merc(MercMarket.starter(1))];
        // Seed a placeholder wave so the combat shell never reads an empty array.
        const enemies = ActorController.getEnemies(2, RunController.levelOf(party));
        Battlefield.deploy(party, enemies);
        this.setState({
            characterSpec: spec, character, party, currentEnemies: enemies,
            activeChar: character, activeEnemy: enemies[0],
            creating: false, run: RunController.freshRun(1), screen: "map", report: null,
            crew: new Crew().activate(), offers: [],
            eventId: null, usedEvents: [],
            activeMainPanel: "Combat", mobileTab: "arena", mobileMore: false, unread: 0,
            messages: [{msg: `— ${character.name} hits the street with a rookie in tow —`} as any],
            playback: null, orders: null, turnOrder: [],
        });
    };

    /** Player picked a node: fight it, or open its merchant / rest / event screen. */
    private enterNode = (node: RunNode) => {
        const patch: any = RunController.enter(this.state, node, this.logLength);
        if (patch.screen === "event") {
            const ev = Events.pick(this.state.usedEvents, makeCtx(this.state.party));
            patch.eventId = ev.id;
            patch.usedEvents = this.state.usedEvents.concat(ev.id);
        }
        this.setState(patch,
            () => { if (this.state.screen === "combat") { this.beginBattle(); } });
    };

    /** A street encounter resolved: apply its fallout, then advance — or fight. */
    private finishEvent = (outcome: EventOutcome) => {
        const state = this.state;
        const run = state.run;
        if (!run || !run.node) { return; }
        const lines: any[] = outcome.lines.map((l) => ({msg: l}));
        let nextRun = run;
        if (outcome.restoreRevive) { nextRun = {...nextRun, reviveUsed: false}; }
        if (outcome.reveal) {
            // intel: uncover N random still-hidden waypoints on the holo-map
            const known = new Set([...nextRun.clearedIds, ...nextRun.reachableIds, ...nextRun.revealedIds]);
            const hidden = nextRun.nodes.filter((n) => !known.has(n.id) && n.type !== "boss");
            const picked: string[] = [];
            for (let i = 0; i < outcome.reveal && hidden.length > 0; i++) {
                picked.push(hidden.splice((Math.random() * hidden.length) << 0, 1)[0]!.id);
            }
            if (picked.length) {
                lines.push({msg: `— intel: ${picked.length} waypoint${picked.length > 1 ? "s" : ""} lit up on the map —`});
                nextRun = {...nextRun, revealedIds: nextRun.revealedIds.concat(picked)};
            }
        }
        if (outcome.combat) {
            // the encounter turned violent — run.node stays set, so clearing the
            // fight advances the map exactly like a normal combat node. The
            // authored level is an offset on the sector curve (1 = baseline).
            const base = Math.max(1, run.sector + Math.floor(RunController.levelOf(state.party) / 4));
            const enemies = spawnEncounter({...outcome.combat, level: base + outcome.combat.level - 1});
            Battlefield.deploy(state.party, enemies);
            BattleRecorder.begin(state.party, enemies, "event", "it turned ugly");
            this.setState({
                run: nextRun, eventId: null, screen: "combat",
                currentEnemies: enemies, activeEnemy: enemies[0], activeChar: state.party[0],
                activeMainPanel: "Combat", mobileTab: "arena",
                messages: [...lines, ...state.messages].slice(0, this.logLength),
            } as any, this.beginBattle);
            return;
        }
        const midState = {...state, run: nextRun} as InterfaceAppState;
        this.setState({...RunController.advance(midState, run.node, lines, this.logLength), eventId: null} as any);
    };

    /** Leave the safehouse with the night's outcome in the feed. */
    private leaveSafehouse = (lines: string[]) => {
        const run = this.state.run;
        if (!run || !run.node) { return; }
        this.setState(RunController.advance(this.state, run.node,
            lines.map((l) => ({msg: l})), this.logLength) as any);
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

    /** Re-open the creator (nav "New Character" / abandon). */
    private openCreator = () => {
        this.resetSequencer();
        this.setState({creating: true, report: null, playback: null, orders: null, turnOrder: []});
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
        // Only a resolved combat turn may drive the run machine. Panels (Quests,
        // Store) share this callback through Stage → MainPanel, and letting one of
        // their notices through after a fight was cleared sealed an already-sealed
        // ledger and stranded the run on an unrenderable "debrief" with no report.
        if (!this.state.run || this.state.screen !== "combat") { return; }
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
        if (this.state.run && this.state.screen === "combat") {
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

    /** Sign a candidate off the board. */
    private hireMerc = (id: string) => {
        const patch = RunController.hire(this.state, id, this.logLength);
        if (patch) { this.setState(patch as any); }
    };

    /** Move the crew on to the next, harder sector. */
    private nextSector = () => {
        this.resetSequencer();
        this.setState(RunController.nextSector(this.state, this.logLength) as any);
    };

    /** Trauma Team for a downed merc, out of the crew purse. */
    private buyoutMerc = (id: string) => {
        const report = this.state.report && RunController.buyout(this.state, this.state.report, id);
        if (report) { this.setState({report}); }
    };

    /** A wipe is not the end of the character — start the next run with them. */
    private nextRun = () => {
        this.resetSequencer();
        this.setState(RunController.nextRun(this.state, this.logLength) as any);
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

    /**
     * Always someone actually on the crew. A merc can leave the party between
     * renders (bled out on the debrief), and the stale reference used to keep
     * feeding the HUD, the store and the safehouse — so eddies were spent
     * kitting out a corpse that had already been struck off.
     */
    private getCurrentActor(): Actor {
        const a = this.state.activeChar;
        return a && this.state.party.indexOf(a) >= 0 ? a : this.state.party[0]!;
    }

    private getCurrentEnemy(): Actor {
        return !this.state.activeEnemy ? this.state.currentEnemies[0]! : this.state.activeEnemy;
    }
}
