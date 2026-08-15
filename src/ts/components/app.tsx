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
import {RunNode, RunState} from "../interact/runMap";
import {RunController} from "../interact/runController";
import {RunEndView} from "./run/runEndView";
import {DebriefView} from "./run/debriefView";
import {BattleReport} from "../interact/battleReport";
import {Crew} from "../interact/crew";
import {MercMarket, MercOffer} from "../interact/mercMarket";
import {Merc} from "../actors/Merc";
import {HireBoard} from "./run/hireBoard";
import {SectorClearView} from "./run/sectorClearView";
import {MetaOverlay} from "./run/metaOverlay";
import {Store} from "./storePanel/store";
import {Downtime} from "./downtime/downtime";

/** Which run-loop screen is on top. "combat" falls through to the ops shell. */
export type RunScreen = "map" | "combat" | "debrief" | "merchant" | "rest" | "hire" | "sector" | "end";

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
    /** The crew's shared purse — every payday, hire and store buy runs through it. */
    crew: Crew;
}

export class App extends React.Component<{}, InterfaceAppState> {

    private logLength = 20;
    private autoTimer: any = null;

    constructor(props: any) {
        super(props);
        // Boot into character creation, pre-filled with a two-merc default squad
        // (one-click Deploy still works). The specs also seed a valid party so the
        // game state behind the creator is never empty.
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
            crew: new Crew().activate(),
        };
    }

    public override componentWillUnmount() {
        this.stopAuto();
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
            return <MetaOverlay title={"☰ Fixer\u2019s Table"} onLeave={this.leaveMeta}>
                <HireBoard offers={this.state.offers} party={this.state.party}
                           funds={this.state.crew.funds} cap={RunController.SQUAD_CAP}
                           onHire={this.hireMerc}/>
            </MetaOverlay>;
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
            <Hud actor={this.getCurrentActor()} crew={this.state.crew}/>
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

    /** Build your character and hit the street. The crew gets hired on the way. */
    private deployCharacter = (spec: CharacterSpec) => {
        this.stopAuto();
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
            activeMainPanel: "Combat", mobileTab: "arena", mobileMore: false, unread: 0,
            messages: [{msg: `— ${character.name} hits the street with a rookie in tow —`} as any],
        });
    };

    /** Player picked a node: fight it, or open its merchant / rest screen. */
    private enterNode = (node: RunNode) => {
        this.setState(RunController.enter(this.state, node, this.logLength) as any,
            () => { if (this.state.screen === "combat") { this.startAuto(); } });
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
        if (patch) { this.setState(patch as any, this.startAuto); }
    };

    private startAuto = () => {
        if (this.autoTimer) { return; }
        this.setState({auto: true});
        this.autoTimer = setInterval(this.autoTick, 1200);
    };

    /** Re-open the creator (nav "New Squad" / abandon / new crew). */
    private openCreator = () => { this.stopAuto(); this.setState({creating: true, run: null, screen: "combat", report: null}); };
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
        this.setState(RunController.nextRun(this.state, this.logLength) as any);
    };

    /** Sign a candidate off the board. */
    private hireMerc = (id: string) => {
        const patch = RunController.hire(this.state, id, this.logLength);
        if (patch) { this.setState(patch as any); }
    };

    /** Move the crew on to the next, harder sector. */
    private nextSector = () => {
        this.stopAuto();
        this.setState(RunController.nextSector(this.state, this.logLength) as any);
    };

    /** Trauma Team for a downed merc, out of the crew purse. */
    private buyoutMerc = (name: string) => {
        const report = this.state.report && RunController.buyout(this.state, this.state.report, name);
        if (report) { this.setState({report}); }
    };

    /** A wipe is not the end of the character — start the next run with them. */
    private nextRun = () => {
        this.stopAuto();
        this.setState(RunController.nextRun(this.state, this.logLength) as any);
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
