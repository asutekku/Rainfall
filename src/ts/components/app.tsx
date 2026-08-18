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
import {Battlefield, FIELD_CAP} from "../interact/battlefield";
import {Creator} from "./creation/creator";
import {CharacterCreation, CharacterSpec} from "../actors/resources/CharacterCreation";
import {MobileTab, MobileTabs} from "./mobileTabs";
import {RunNode, RunState, spawnEncounter} from "../interact/runMap";
import {Deployment} from "../interact/loadout";
import {RunController} from "../interact/runController";
import {Events, EventOutcome, makeCtx} from "../interact/events";
import {RunEndView} from "./run/runEndView";
import {DebriefView} from "./run/debriefView";
import {BattleReport} from "../interact/battleReport";
import {EventView} from "./run/eventView";
import {MarketView} from "./run/marketView";
import {SafehouseView} from "./run/safehouseView";
import {NetDiveView} from "./run/netDiveView";
import {Crew} from "../interact/crew";
import {MercOffer} from "../interact/mercMarket";
import {FixerView} from "./run/fixerView";
import {StagingView} from "./run/stagingView";
import {SectorClearView} from "./run/sectorClearView";
import {BattleNotice, PlaybackBundle} from "./combat/battleScene";
import {BattleEvent} from "../interact/battleEvents";
import {FeedLog, missionClock} from "../interact/feedLog";
import {ShownState} from "../interact/shownState";
import {SaveGame, SaveHeader} from "../interact/saveGame";
import {Career, CareerStore} from "../interact/career";
import {TitleView} from "./titleView";
import {AugOffer, Chrome} from "../interact/chrome";
import {AugPickView} from "./run/augPickView";

/** Which run-loop screen is on top. "combat" falls through to the ops shell. */
export type RunScreen = "map" | "staging" | "combat" | "debrief" | "merchant" | "rest" | "hire" | "sector" | "event" | "net" | "end" | "augpick";

/** A rolled wave waiting on the player's orders. */
export interface PendingFight {
    /** what the after-action report files it under */
    kind: string;
    /** the line the feed opens the fight with */
    label: string;
    /** how the staging screen titles it */
    headline: string;
    /** rounds to survive, if this one carries a clock */
    holdout?: number;
}

/**
 * Where the game is, at the coarsest level. This used to be a `creating`
 * boolean, which left no way to express "no run yet" — so the app booted into
 * screen "combat" with a null run and two guards existed purely to stop that
 * impossible state from resolving.
 */
export type GamePhase = "title" | "creator" | "run";

export interface InterfaceAppState {
    activeMainPanel: string;
    /** Your merc — the one who persists across runs. Never a casualty. */
    character: Actor;
    activeChar: Actor | undefined;
    activeEnemy: Actor | undefined;
    /** The payroll — everyone the crew is paying, up to RunController.ROSTER_CAP. */
    party: Actor[];
    /**
     * Who is actually on the street for the fight in progress: a subset of the
     * payroll, at most RunController.SQUAD_CAP, chosen at staging. Off a
     * battlefield it tracks the payroll, so every screen that isn't a fight can
     * keep reading `party` and mean it.
     */
    squad: Actor[];
    currentEnemies: Actor[];
    messages: Message[];
    /** Title screen, character creation, or a live run. */
    phase: GamePhase;
    /** The merc's record across runs — survives death, cleared only by retirement. */
    career: Career | null;
    /** The checkpointed run as the boot screen describes it (null when there's none). */
    saveHeader: SaveHeader | null;
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
    /**
     * The fight waiting behind the staging screen. Both a map node and an
     * encounter that turned ugly end up here, so the two share one path into
     * combat — and an ambush is still a fight you get to pack for.
     */
    pending: PendingFight | null;
    /** Encounters already seen this run (no reruns until the pool dries up). */
    usedEvents: string[];
    /** The crew's shared purse — every payday, hire and store buy runs through it. */
    crew: Crew;
    /** The boss's chrome drop on offer while the augpick screen is up. */
    augOffers: AugOffer[];
    /** Bumped when a new encounter starts — tells the 3D arena to build a fresh street. */
    battleId: number;
    /** The resolved turn currently being animated by the battle scene. */
    playback: PlaybackBundle | null;
    /** Initiative queue: whose turn it is now ([0]) and who's coming up. */
    turnOrder: Actor[];
    /** Which round of the current fight is resolving. */
    round: number;
    /** Rounds still to survive on a holdout node (0 = no clock). */
    holdLeft: number;
    /** The unit whose card is open over the arena. */
    inspecting: Actor | null;
    /** Something the fight needs to announce over the street. */
    notice: BattleNotice | null;
}

/**
 * Combat runs on a turn sequencer instead of a wall-clock interval: each unit's
 * turn is resolved by the engine into an event script, animated by the battle
 * scene, and only when the animation reports done does the next unit act.
 * Every turn is played by the tactical AI: Rainfall is an auto battler, so the
 * fight is something the player reads and prepares for, never something they
 * steer mid-street.
 */
export class App extends React.Component<{}, InterfaceAppState> {

    private logLength = 30;
    private saveTimer: number | null = null;
    private queue: Actor[] = [];             // initiative order, minus the acting unit
    private pendingMsgs: any[] = [];         // engine messages held back until the animation lands
    private pendingEvents: BattleEvent[] = [];   // the animated turn's events, for the feed summary
    private playId = 0;
    private turnTimer: number | null = null;
    private viewPaused = false;              // combat hidden behind another panel — resume on return
    private battleStart = 0;                 // mission-clock zero for the current fight
    private roundNo = 0;
    private markRound = 0;                   // round separator waiting to land in the feed
    private markHoldLeft = -1;               // holdout rounds left, shown on the separator
    private reinforced = false;              // the once-per-battle reinforcement wave arrived
    /** Health as the board is drawing it — walked forward by the playback, not by the engine. */
    private shown = new ShownState();

    constructor(props: any) {
        super(props);
        // Boot builds nothing it will throw away: no squad, no enemies, no
        // battlefield, and crucially no active Crew — `Crew.activate()` sets a
        // global every purse operation reads, and a run is where that belongs.
        // The one object made here is the merc themselves, restored from the
        // career if there is one, because the title screen is about them.
        const career = CareerStore.load();
        const characterSpec = career ? career.spec : CharacterCreation.defaultSpec();
        const character = career ? CareerStore.restore(career) : new Player(characterSpec);
        this.state = {
            activeMainPanel: "Character",
            character,
            activeChar: undefined,
            activeEnemy: undefined,
            party: [],
            squad: [],
            currentEnemies: [],
            messages: [],
            phase: "title",
            career,
            saveHeader: SaveGame.peek(),
            characterSpec,
            offers: [],
            mobileTab: "arena",
            mobileMore: false,
            unread: 0,
            run: null,
            screen: "map",
            report: null,
            eventId: null,
            pending: null,
            usedEvents: [],
            crew: new Crew(),
            augOffers: [],
            battleId: 1,
            playback: null,
            turnOrder: [],
            round: 0,
            holdLeft: 0,
            inspecting: null,
            notice: null,
        };
    }

    public override componentWillUnmount() {
        this.clearTurnTimer();
        if (this.saveTimer !== null) { window.clearTimeout(this.saveTimer); }
    }

    /**
     * Checkpointing: whenever the squad stands on the map, the run is written
     * to localStorage (debounced — state settles in bursts) and the career
     * snapshot is refreshed alongside it, so levels and chrome earned mid-run
     * outlive a closed tab even though the run itself may not.
     *
     * Death spends the save. It used to be deleted only once the revive had
     * been spent, which meant dying with it unspent left a pre-death checkpoint
     * on disk: close the tab, come back, and the boot screen offered to undo
     * the wipe. The run-over screen only ever appears for a lost run, so its
     * arrival is the condition.
     */
    public override componentDidUpdate() {
        const s = this.state;
        if (s.phase !== "run") { return; }
        if (s.run && s.screen === "map") {
            if (this.saveTimer !== null) { window.clearTimeout(this.saveTimer); }
            this.saveTimer = window.setTimeout(this.checkpoint, 500) as any;
        }
        if (s.run && s.screen === "end") { SaveGame.clear(); }
    }

    /** Write the run checkpoint and refresh the career snapshot from the live merc. */
    private checkpoint = () => {
        const st = this.state;
        if (st.phase !== "run" || !st.run || st.screen !== "map") { return; }
        SaveGame.save(st.characterSpec, st.party, st.crew, st.run, st.usedEvents);
        // A run checkpointed before careers existed has no record behind it —
        // adopt the merc who is out there rather than leaving them unrecorded.
        if (!st.career) {
            const started = CareerStore.start(st.characterSpec, st.character);
            CareerStore.save(started);
            this.setState({career: started});
            return;
        }
        const career = CareerStore.sync(st.career, st.characterSpec, st.character, st.run);
        CareerStore.save(career);
        // Only re-render when a *displayed* number moved — the snapshot itself
        // is a fresh object every time and would loop this forever.
        if (career.bestSector !== st.career.bestSector || career.bestDepth !== st.career.bestDepth
            || career.kills !== st.career.kills) {
            this.setState({career});
        }
    };

    public override render() {
        // The front door. Two ways in and no more: pick up the checkpointed run,
        // or start a new one — and the creator is where "same merc or someone
        // new" gets decided, so it stays one door instead of two look-alikes.
        if (this.state.phase === "title") {
            return <TitleView save={this.state.saveHeader} career={this.state.career}
                              onContinue={this.continueRun} onNewRun={this.openCreator}/>;
        }
        // Character creation is a full-screen takeover reached from the title.
        if (this.state.phase === "creator") {
            return <Creator initial={this.state.characterSpec} career={this.state.career}
                            onDeploy={this.deployCharacter} onCancel={this.gotoTitle}/>;
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
        if (run && this.state.screen === "augpick") {
            return <AugPickView character={this.state.character} offers={this.state.augOffers}
                                onPick={this.takeAug}/>;
        }
        if (run && this.state.screen === "sector") {
            return <SectorClearView sector={run.sector} funds={this.state.crew.funds}
                                    party={this.state.party} offers={this.state.offers}
                                    cap={RunController.ROSTER_CAP}
                                    onHire={this.hireMerc} onContinue={this.nextSector}/>;
        }
        if (run && this.state.screen === "end") {
            const career = this.state.career;
            return <RunEndView character={this.state.character} sector={run.sector}
                               depth={run.depth} kills={this.state.character.kills}
                               runNo={career ? career.runs : 1}
                               bestSector={career ? career.bestSector : run.sector}
                               bestDepth={career ? career.bestDepth : run.depth}
                               crewLeft={this.state.party.filter((p) => p.hireable).length}
                               canRevive={!run.reviveUsed}
                               onRevive={this.reviveRun} onNextRun={this.nextRun}
                               onQuit={this.gotoTitle}/>;
        }
        if (run && this.state.screen === "hire") {
            return <FixerView offers={this.state.offers} party={this.state.party}
                              funds={this.state.crew.funds} cap={RunController.ROSTER_CAP}
                              onHire={this.hireMerc} onLeave={this.leaveMeta}/>;
        }
        if (run && this.state.screen === "merchant") {
            return <MarketView party={this.state.party} onLeave={this.leaveMeta}/>;
        }
        if (run && this.state.screen === "rest") {
            return <SafehouseView party={this.state.party} onLeave={this.leaveSafehouse}/>;
        }
        if (run && this.state.screen === "net") {
            return <NetDiveView party={this.state.party} onLeave={this.leaveSafehouse}/>;
        }
        if (run && this.state.screen === "staging" && this.state.pending) {
            return <StagingView pending={this.state.pending}
                                party={this.state.party} enemies={this.state.currentEnemies}
                                kit={this.state.crew.kit} onDeploy={this.deploySquad}/>;
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
                     canQuit={this.state.screen === "map"}
                     activeSelection={this.updateSelection}
                     onQuit={this.gotoTitle}/>
            <section id={"feedcol"}>
                <Party name={this.state.screen === "combat" ? "On the street" : "Crew"}
                       party={this.state.screen === "combat" ? this.state.squad : this.state.party}
                       activeSelection={this.getCharacter} friendly={true}
                       onCycleTemperament={this.cycleTemperament}
                       onOpenSheet={this.openSheet}/>
                <ActionLog actor={this.getCurrentActor()} messages={this.state.messages}/>
            </section>
            <Stage actor={this.getCurrentActor()}
                   party={this.state.party} squad={this.state.squad}
                   enemies={this.state.currentEnemies}
                   view={this.state.activeMainPanel} screen={this.state.screen} run={this.state.run}
                   messages={this.combatController} onNotice={this.pushNotice}
                   battleId={this.state.battleId}
                   playback={this.state.playback}
                   turnOrder={this.state.turnOrder}
                   round={this.state.round} holdLeft={this.state.holdLeft}
                   inspecting={this.state.inspecting}
                   shown={this.shown}
                   notice={this.state.notice}
                   onInspect={this.inspectUnit}
                   onImpact={this.onImpact}
                   onMend={this.onMend}
                   onPickNode={this.enterNode}
                   onPlaybackDone={this.onPlaybackDone}/>
            <MobileTabs tab={this.state.mobileTab} more={this.state.mobileMore}
                        unread={this.state.unread}
                        onTab={this.selectMobileTab} onMore={this.toggleMore}/>
            <button className={"mScrim"} tabIndex={-1} aria-hidden={true} onClick={this.closeMore}/>
        </div>;
    }

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

    /**
     * Hit the street. `veteran` is the creator's answer to the one question it
     * exists to ask: send the merc on file back out, or retire them and run
     * with someone new. Either way a new run ends whatever run was checkpointed
     * — and that happens *here*, at the commit, not when the creator opened.
     */
    private deployCharacter = (spec: CharacterSpec, veteran: boolean) => {
        this.resetSequencer();
        SaveGame.clear();
        const prior = veteran ? this.state.career : null;
        if (!prior) { CareerStore.clear(); }     // retiring: the old record goes with the old merc
        const character = prior ? CareerStore.restore(prior) : new Player(spec);
        // The Cryptobank pot recorded at death rides in, then the slate wipes.
        const career = prior ? {...CareerStore.countRun(prior), bank: 0} : CareerStore.start(spec, character);
        CareerStore.save(career);
        const opening = prior
            ? `— ${character.name} takes another job — run ${career.runs} —`
            : `— ${character.name} hits the street with a rookie in tow —`;
        this.setState({
            ...RunController.beginRun(character, opening, this.logLength, prior ? prior.bank || 0 : 0),
            phase: "run", characterSpec: spec, career, saveHeader: null,
        } as any);
    };

    /** Resume the checkpointed run: same character, same crew, same streets. */
    private continueRun = () => {
        const g = SaveGame.load();
        if (!g) { this.setState({saveHeader: null}); return; }
        this.resetSequencer();
        Chrome.armRun(g.party);
        // Seed a placeholder wave so the combat shell never reads an empty array.
        const enemies = ActorController.getEnemies(2, RunController.levelOf(g.party));
        Battlefield.deploy(g.party, enemies);
        this.setState({
            phase: "run", characterSpec: g.spec, character: g.character, party: g.party,
            squad: g.party.slice(),
            crew: g.crew.activate(), run: RunController.scout(g.run, g.party),
            usedEvents: g.usedEvents, screen: "map",
            currentEnemies: enemies, activeChar: g.character, activeEnemy: enemies[0],
            report: null, eventId: null, offers: [],
            activeMainPanel: "Combat", mobileTab: "arena", mobileMore: false, unread: 0,
            messages: [{msg: "— back on the street, right where you left it —"} as any],
            playback: null, turnOrder: [], round: 0, holdLeft: 0, inspecting: null,
        });
    };

    /**
     * Back to the front door. The checkpoint is written first when the squad is
     * standing on the map (the rail only offers this there), so quitting is a
     * pause, not an abandon — and it can't be used to walk out of a losing fight.
     */
    private gotoTitle = () => {
        if (this.saveTimer !== null) { window.clearTimeout(this.saveTimer); this.saveTimer = null; }
        this.checkpoint();          // no-ops off the map, so a dead run leaves nothing behind
        this.resetSequencer();
        this.setState({
            phase: "title", saveHeader: SaveGame.peek(), career: CareerStore.load(),
            report: null, playback: null, turnOrder: [], round: 0, holdLeft: 0, inspecting: null,
        });
    };

    /** The boss's chrome drop resolved (or skipped) — on to the sector screen. */
    private takeAug = (lineId: string | null) => {
        this.setState(RunController.takeAug(this.state, lineId, this.logLength) as any);
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

    /** Staging is done: apply the orders and load the street. */
    private deploySquad = (plan: Deployment) => {
        this.setState(RunController.deploy(this.state, plan, this.logLength) as any,
            () => { if (this.state.screen === "combat") { this.beginBattle(); } });
    };

    /** A street encounter resolved: apply its fallout, then advance — or fight. */
    private finishEvent = (outcome: EventOutcome) => {
        const state = this.state;
        const run = state.run;
        if (!run || !run.node) { return; }
        const lines: any[] = outcome.lines.map((l) => ({msg: l}));
        let nextRun = run;
        if (outcome.restoreRevive) { nextRun = {...nextRun, reviveUsed: false, revivesUsed: 0}; }
        if (outcome.reveal) {
            // intel: uncover N random still-hidden waypoints on the holo-map.
            // A Media in the crew works their sources: one extra waypoint.
            const mediaBonus = state.party.some((p) => p.isMedia() && p.canFight()) ? 1 : 0;
            const known = new Set([...nextRun.clearedIds, ...nextRun.reachableIds, ...nextRun.revealedIds]);
            const hidden = nextRun.nodes.filter((n) => !known.has(n.id) && n.type !== "boss");
            const picked: string[] = [];
            for (let i = 0; i < outcome.reveal + mediaBonus && hidden.length > 0; i++) {
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
            // An ambush is still a fight you get to pack for: it goes through
            // staging like any other, so there is exactly one road into combat.
            this.setState({
                run: nextRun, eventId: null, screen: "staging",
                pending: {kind: "event", label: "it turned ugly", headline: "IT TURNED UGLY"},
                currentEnemies: enemies, activeEnemy: enemies[0], activeChar: state.party[0],
                messages: [...lines, ...state.messages].slice(0, this.logLength),
            } as any);
            return;
        }
        const midState = {...state, run: nextRun} as InterfaceAppState;
        this.setState({...RunController.advance(midState, run.node, lines, this.logLength), eventId: null} as any);
    };

    /** Leave a safehouse / NET node, its outcome lines landing in the feed. */
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
        const patch = RunController.continueFromDebrief(this.state, this.logLength) as any;
        // The run died here — write how far it got into the career before the
        // run-over screen reads it back out. The snapshot is refreshed too
        // (chrome and levels earned since the last checkpoint survive a closed
        // tab), and the dead pot is recorded for the Cryptobank Cortex.
        if (patch.screen === "end" && this.state.career) {
            const synced = CareerStore.sync(this.state.career, this.state.characterSpec,
                this.state.character, this.state.run);
            patch.career = {...CareerStore.endRun(synced, this.state.run), bank: this.state.crew.funds};
            CareerStore.save(patch.career);
        }
        this.setState(patch);
    };

    /** Spend the one-per-run revive and resume the current fight. */
    /**
     * Trauma Team drags the squad back up mid-fight.
     *
     * This used to run `beginBattle`, which bumps `battleId` — the arena's
     * signal for "new encounter". So a revive regenerated the street, rebuilt
     * every unit, replayed the opening dolly and announced the contact again:
     * mechanically a resume, visually a completely fresh fight. It resumes now,
     * on the same street, and says what actually happened.
     */
    private reviveRun = () => {
        const patch = RunController.revive(this.state, this.logLength);
        if (!patch) { return; }
        this.resumeSequencer();
        this.setState({...(patch as any),
            playback: null, turnOrder: [], inspecting: null,
            notice: {id: Date.now(), tone: "good", title: "✚ BACK UP",
                     sub: "TRAUMA TEAM — THE SQUAD IS ON ITS FEET"},
            activeMainPanel: "Combat", mobileTab: "arena",
        }, () => { this.syncShown(); this.scheduleAdvance(1400); });
    };

    /**
     * Open the creator from the title. Nothing is destroyed on the way in — the
     * checkpoint and the career both survive until a deploy actually commits,
     * so backing out of here costs the player nothing.
     */
    private openCreator = () => {
        this.resetSequencer();
        this.setState({phase: "creator", report: null, playback: null, turnOrder: [],
            round: 0, holdLeft: 0, inspecting: null});
    };

    /** Cycle a squad member's AI playstyle — the one tactical lever left. */
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
        this.resumeSequencer();
        this.roundNo = 0;
        this.markRound = 0;
        this.markHoldLeft = -1;
        this.reinforced = false;
    }

    /**
     * Drop the in-flight turn without forgetting the fight.
     *
     * A revive picks up an engagement already in progress, so the round counter
     * and the spent reinforcement wave have to survive it — otherwise coming
     * back up rewinds a holdout clock you were about to beat, and calls in
     * backup that already arrived.
     */
    private resumeSequencer() {
        this.clearTurnTimer();
        this.queue = [];
        this.pendingMsgs = [];
        this.pendingEvents = [];
        this.viewPaused = false;
    }

    /** A combat node just opened: fresh street, fresh initiative, first turn. */
    private beginBattle = () => {
        this.resetSequencer();
        this.battleStart = Date.now();
        const foes = this.state.currentEnemies;
        const boss = foes.some((e) => (e.rank || 0) >= 5);
        this.setState({
            battleId: this.state.battleId + 1,
            // The board's announcements are per-fight. Left in state they replay
            // on the next one: the arena unmounts between fights, so its
            // already-shown guard resets and the last wave's REINFORCEMENTS
            // banner lands on top of the new contact.
            notice: null,
            playback: null, turnOrder: [], round: 0, holdLeft: 0, inspecting: null,
            activeMainPanel: "Combat", mobileTab: "arena",
            messages: [FeedLog.contact(foes), ...this.state.messages].slice(0, this.logLength) as any,
            // a boss entrance holds the camera on the heavy before the fight starts
        }, () => { this.syncShown(); this.scheduleAdvance(boss ? 2100 : 500); });
    };

    private scheduleAdvance(ms: number) {
        this.clearTurnTimer();
        this.turnTimer = window.setTimeout(this.advanceTurn, ms) as any;
    }

    private fightOver(): boolean {
        return this.state.squad.every((p) => !p.canFight())
            || this.state.currentEnemies.every((e) => !e.canFight() && !e.mortallyWounded);
    }

    /** Hand the next unit its turn — always to the tactical AI. */
    private advanceTurn = () => {
        if (this.state.phase !== "run" || this.state.screen !== "combat") { return; }
        if (this.state.playback) { return; }
        if (!this.state.squad.length || !this.state.currentEnemies.length) { return; }
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
                this.queue = Combat.beginRound(this.state.squad, this.state.currentEnemies);
                if (!this.queue.length) { return; }
                this.roundNo += 1;
                const hold = this.holdoutRounds();
                if (this.roundNo > 1) {
                    this.markRound = this.roundNo;
                    this.markHoldLeft = hold > 0 ? Math.max(0, hold - this.roundNo + 1) : -1;
                }
                // survived the clock: the hostiles disengage and the street is held
                if (this.maybeEndHoldout(hold)) { return; }
                this.maybeReinforce();
            }
        }
        if (!unit) { return; }
        const hold = this.holdoutRounds();
        this.setState({
            turnOrder: [unit, ...this.queue],
            round: Math.max(1, this.roundNo),
            holdLeft: hold > 0 ? Math.max(0, hold - this.roundNo + 1) : 0,
        });
        this.resolveTurn(unit);
    };

    /** The holdout clock on the current combat node (0 = plain firefight). */
    private holdoutRounds(): number {
        const node = this.state.run && this.state.run.node;
        return node && node.holdout ? node.holdout : 0;
    }

    /** Holdout survived: the hostiles disengage, the squad keeps the street. */
    private maybeEndHoldout(hold: number): boolean {
        if (hold <= 0 || this.roundNo <= hold) { return false; }
        if (!this.state.squad.some((p) => p.canFight())) { return false; }
        this.state.currentEnemies.forEach((e) => { if (e.canFight()) { e.routed = true; } });
        const lines = [FeedLog.sys("— clock beaten: hostiles disengage — street held —")];
        const patch = RunController.step(this.state, lines, this.logLength);
        this.setState({...patch, playback: null, turnOrder: [], inspecting: null} as any);
        return true;
    }

    /**
     * Elite and boss fights call for backup once, at the top of round 2: one or
     * two low-rank guns from the same faction jog in from the far end of the
     * street. Kept modest on purpose — pressure, not a second army.
     *
     * Hard-capped at FIELD_CAP hostiles standing. The phone HUD's hostile
     * column is a fixed 172px with its scrollbar hidden, so a fifth body did
     * not crowd the list — it fell off the bottom of it with nothing to say it
     * was there. Topping up to the cap also makes backup read the way it
     * should: replacements for the ones you dropped, not a headcount you can
     * never get ahead of.
     */
    private maybeReinforce(): void {
        const node = this.state.run && this.state.run.node;
        // Bosses no longer call anyone. Two extra bodies on top of a heavy took
        // the squad's odds from 66% to 23% in the sim — the fight stopped being
        // hard and started being arithmetic you cannot win.
        if (!node || node.type !== "elite") { return; }
        if (this.reinforced || this.roundNo < 3) { return; }
        const foes = this.state.currentEnemies;
        const living = foes.filter((e) => e.canFight()).length;
        // Only once you are actually winning, and only ever one. Topping the
        // street back up to the cap meant every kill was undone as it happened,
        // which is the whole of "reinforcements make it unbeatable".
        if (living > 2 || living >= FIELD_CAP) { return; }
        const lead = foes.find((e) => e.canFight());
        if (!lead) { return; }
        this.reinforced = true;
        const n = 1;
        const rank = 1;
        const fresh = ActorController.getReinforcements(lead.faction, n, RunController.levelOf(this.state.squad), rank);
        fresh.forEach((a, i) => {
            a.position.x = (i - (n - 1) / 2) * 6 + (Math.random() - 0.5) * 3;
            a.position.y = 41 + Math.random() * 2;
            a.position.z = 0;
            a.grenades = 0;
            a.resetBattleState();
        });
        this.queue.push(...fresh);
        Battlefield.WAVE += fresh.length;   // morale counts the latecomers too
        const faction = (lead.faction || "hostile").toUpperCase();
        this.setState({
            currentEnemies: [...foes, ...fresh],
            // the feed alone was not enough: more bodies simply appeared on the
            // street with nothing on screen to say where they came from
            notice: {id: Date.now(), tone: "warn", title: "⚠ REINFORCEMENTS",
                     sub: `ONE MORE ${faction} INBOUND`},
            messages: [FeedLog.sys(`⚠ REINFORCEMENTS — one more ${faction} inbound`),
                ...this.state.messages].slice(0, this.logLength) as any,
        });
    }

    /** Resolve one unit's turn through the engine and ship it to the animator. */
    /**
     * A round landed in the arena — walk the shown health down to match.
     *
     * The engine already applied this damage when the turn resolved; this is
     * the board catching up at the moment the player can see why.
     */
    private onImpact = (target: Actor, damage: number) => {
        this.shown.hit(target, damage);
        this.forceUpdate();
    };

    /** A medic patched someone up — the board follows health up as well as down. */
    private onMend = (target: Actor, hp: number) => {
        this.shown.mend(target, hp);
        this.forceUpdate();
    };

    /** Bring the board level with the engine (fight start, and after every playback). */
    private syncShown(): void {
        this.shown.sync([...this.state.squad, ...this.state.currentEnemies]);
    }

    private resolveTurn = (unit: Actor) => {
        const res = Combat.takeTurn(unit, this.state.squad, this.state.currentEnemies);
        this.pendingMsgs = res.messages;
        this.pendingEvents = res.events;
        this.playId += 1;
        this.setState({playback: {id: this.playId, events: res.events}});
    };

    /** The scene finished animating a turn: commit its surveillance line, move on. */
    private onPlaybackDone = (id: number) => {
        if (id !== this.playId || !this.state.playback) { return; }
        // whatever the animation did not account for, the truth wins here
        this.syncShown();
        // one overwatch line per turn (plus loot/level lines the summary can't carry)
        const time = missionClock(this.battleStart);
        const lines: any[] = [
            ...FeedLog.keepLegacy(this.pendingMsgs, time),
            ...FeedLog.fromTurn(this.pendingEvents, time),
        ];
        if (this.markRound) {
            lines.push(FeedLog.round(this.markRound, this.markHoldLeft));
            this.markRound = 0;
            this.markHoldLeft = -1;
        }
        this.pendingMsgs = [];
        this.pendingEvents = [];
        const done = () => {
            if (this.state.screen === "combat") {
                this.scheduleAdvance(160);
            }
        };
        if (this.state.run && this.state.screen === "combat") {
            const patch = RunController.step(this.state, lines, this.logLength);
            this.setState({...patch, playback: null} as any, done);
        } else {
            this.setState({
                playback: null,
                messages: [...lines, ...this.state.messages].slice(0, this.logLength) as any,
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

    /**
     * A wipe is not the end of the character — start the next run with them.
     * The tail of the dead run's feed comes along, so the street picks up where
     * it left off instead of opening on a blank slate every time.
     */
    private nextRun = () => {
        this.resetSequencer();
        const tail = this.state.messages.slice(0, 3);
        const patch = RunController.nextRun(this.state, this.logLength, tail) as any;
        if (this.state.career) {
            // the Cryptobank slice was just paid into the new pot — the record clears
            patch.career = {...CareerStore.countRun(this.state.career), bank: 0};
            CareerStore.save(patch.career);
        }
        this.setState(patch);
    };

    /** Open a squad member's full character sheet (from the roster's ›). */
    private openSheet = (actor: Actor) => {
        this.setState({activeChar: actor, activeMainPanel: "Character", mobileTab: "panel", mobileMore: false});
    };

    private getCharacter = (actor: Actor) => {
        if (!actor) {
            this.setState({activeChar: this.state.party[0]});
        } else {
            this.setState({activeChar: actor});
        }
    };

    /**
     * A battle HUD row (or a desktop strip) was tapped. Combat takes no orders,
     * so a tap means "tell me about this one": it opens the unit card and, so
     * the rest of the console follows along, makes that unit the selected ally
     * or hostile. Tapping the open unit again closes the card.
     */
    private inspectUnit = (actor: Actor | null) => {
        if (!actor || actor === this.state.inspecting) { this.setState({inspecting: null}); return; }
        const foe = this.state.currentEnemies.indexOf(actor) >= 0;
        this.setState({
            inspecting: actor,
            activeEnemy: foe ? actor : this.state.activeEnemy,
            activeChar: foe ? this.state.activeChar : actor,
        });
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

}
