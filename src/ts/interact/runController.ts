import type {InterfaceAppState} from "../components/app";
import {Actor} from "../actors/Actor";
import {Armor} from "../items/Armor";
import {Weapon} from "../items/Weapon";
import {Merc} from "../actors/Merc";
import {BattleRecorder, BattleReport, GearChange, LootItem} from "./battleReport";
import {Battlefield} from "./battlefield";
import {Crew, Purse} from "./crew";
import {MercMarket} from "./mercMarket";
import {Economy} from "./economy";
import {RunMap, RunNode, RunState, encounterSpec, spawnEncounter} from "./runMap";

type Patch = Partial<InterfaceAppState>;

/**
 * Pure-ish state machine for a run. Movement is dungeon-style: the squad
 * stands on a waypoint and may move to any adjacent one. Entering an uncleared
 * node triggers its encounter/screen; entering a cleared node just relocates
 * (free backtracking). Each method takes the current app state and returns a
 * `setState` patch, so `App` stays a thin React shell owning the auto timer.
 */
export class RunController {
    /** Party yardstick for scaling encounters (highest member level). */
    public static levelOf(party: Actor[]): number {
        return party.reduce((m, p) => Math.max(m, p.level), 1);
    }

    /** Squad size ceiling: you plus three on the payroll. */
    public static readonly SQUAD_CAP: number = 4;

    /** A brand-new sector: fresh city, road-graph waypoints, squad at the entry. */
    public static freshRun(sector: number = 1): RunState {
        BattleRecorder.abort();
        return RunMap.generate(sector);
    }

    /** Move onto an adjacent node: relocate, open its screen, or start its fight. */
    public static enter(state: InterfaceAppState, node: RunNode, log: number): Patch {
        const run = state.run;
        if (!run || run.reachableIds.indexOf(node.id) < 0) { return {}; }
        if (run.clearedIds.indexOf(node.id) >= 0) {
            // already cleared — free movement, no encounter
            return {run: {...run, position: node.id, reachableIds: (run.adj[node.id] || []).slice()}};
        }
        if (node.type === "merchant") { return {run: {...run, node}, screen: "merchant"}; }
        if (node.type === "rest") { return {run: {...run, node}, screen: "rest"}; }
        if (node.type === "event") { return {run: {...run, node}, screen: "event"}; }
        if (node.type === "hire") {
            // A fixer's table mid-sector: short list, and he takes his cut.
            return {run: {...run, node}, screen: "hire", offers: MercMarket.board(run.sector + 1, 3, 1.25)};
        }
        // combat / elite / boss
        const enemies = spawnEncounter(encounterSpec(node, run.sector, RunController.levelOf(state.party)));
        Battlefield.deploy(state.party, enemies);
        const label = node.type === "boss" ? "BOSS — hold nothing back"
            : node.type === "elite" ? "elite contact" : "firefight";
        BattleRecorder.begin(state.party, enemies, node.type, label);
        return {
            run: {...run, node}, screen: "combat",
            currentEnemies: enemies, activeEnemy: enemies[0], activeChar: state.party[0],
            activeMainPanel: "Combat", mobileTab: "arena",
            messages: [{msg: `— ${label} —`} as any, ...state.messages].slice(0, log),
        };
    }

    /** Leave a merchant / rest node (clears it) and stand on it, back on the map. */
    public static leaveMeta(state: InterfaceAppState, log: number): Patch | null {
        const run = state.run;
        return run && run.node ? RunController.advance(state, run.node, [{msg: "— moving on —"}], log) : null;
    }

    /** Mark a node cleared and stand on it; clearing the boss wins the run. */
    public static advance(state: InterfaceAppState, node: RunNode, extra: any[], log: number): Patch {
        const run = state.run;
        if (!run) { return {}; }
        const clearedIds = run.clearedIds.indexOf(node.id) >= 0
            ? run.clearedIds : run.clearedIds.concat(node.id);
        const depth = run.depth + 1;
        const messages = [...extra, ...state.messages].slice(0, log);
        if (node.type === "boss") {
            // Sector cleared — not the end of anything, just the next city over.
            return {
                run: {...run, clearedIds, depth, node: null, position: node.id, outcome: "won"},
                screen: "sector", offers: MercMarket.board(run.sector + 1, 4), messages,
            };
        }
        return {
            run: {
                ...run, clearedIds, depth, node: null,
                position: node.id, reachableIds: (run.adj[node.id] || []).slice(),
            },
            screen: "map", messages,
        };
    }

    /** One resolved round in a combat node: wipe or clear → debrief, else continue. */
    public static step(state: InterfaceAppState, msgs: any[], log: number): Patch {
        const party = state.party;
        const run = state.run;
        if (!run) { return {}; }
        const alive = state.currentEnemies.filter((e) => e.health > 0);
        const feed = [...msgs, ...state.messages].slice(0, log);

        if (party.every((p) => !p.canFight())) {          // squad wiped → debrief, then run over
            return {
                run: {...run, outcome: "lost"}, screen: "debrief",
                report: BattleRecorder.finish("defeat"),
                currentEnemies: alive, messages: feed,
            };
        }
        if (alive.length <= 0) {                           // node cleared → after-action report
            return {
                screen: "debrief", report: BattleRecorder.finish("victory"),
                currentEnemies: alive, messages: feed,
            };
        }
        return {                                           // ongoing exchange
            currentEnemies: alive, activeEnemy: alive[0], messages: feed,
            unread: state.mobileTab === "feed" ? 0 : state.unread + Math.max(0, msgs.length),
        };
    }

    // =====================================================================
    // Debrief: the after-action screen between a finished fight and the map.
    // Salvage is claimed here; whatever the player skips the fixer auto-kits.
    // =====================================================================

    /** Pull a salvaged piece out of its finder's pack (it may have been pruned). */
    private static takeFromPack(loot: LootItem): void {
        const bag: Array<Weapon | Armor> = loot.kind === "weapon"
            ? loot.owner.inventory.weapons : loot.owner.inventory.armor;
        const idx = bag.indexOf(loot.item);
        if (idx >= 0) { bag.splice(idx, 1); }
    }

    private static heldLoot(report: BattleReport, id: string): LootItem | null {
        const loot = report.loot.find((l) => l.id === id);
        return loot && loot.fate === "held" ? loot : null;
    }

    /** Equip a scavenged piece on the squad member who found it. */
    public static claimLoot(report: BattleReport, id: string): BattleReport | null {
        const loot = RunController.heldLoot(report, id);
        if (!loot) { return null; }
        RunController.takeFromPack(loot);
        const change = loot.kind === "weapon"
            ? Economy.equipWeapon(loot.owner, loot.item as Weapon, "salvage", 0)
            : Economy.equipArmor(loot.owner, loot.item as Armor, "salvage", 0);
        loot.fate = "equipped";
        return {...report, loot: report.loot.slice(), gear: [...report.gear, change]};
    }

    /** Fence a scavenged piece for eddies instead of carrying it. */
    public static sellLoot(report: BattleReport, id: string): BattleReport | null {
        const loot = RunController.heldLoot(report, id);
        if (!loot) { return null; }
        RunController.takeFromPack(loot);
        const paid = Purse.earn(loot.owner, Economy.sellValue(loot.item.cost));
        loot.fate = "sold";
        return {...report, loot: report.loot.slice(), fenced: report.fenced + paid};
    }

    /**
     * The fixer's pass: every survivor equips the best remaining salvage and
     * spends eddies on tier-appropriate upgrades. Runs once per debrief, either
     * on demand or automatically when the player moves on.
     */
    public static autoKit(state: InterfaceAppState, report: BattleReport): BattleReport {
        if (report.kitted || report.outcome === "defeat") { return {...report, kitted: true}; }
        const changes: GearChange[] = [];
        // Half the pot, tops. Unbounded auto-kit spent every payday down to zero,
        // which made every merc tier above Rookie permanently unaffordable.
        const budget = Math.floor(state.crew.funds / 2);
        state.party.forEach((p) => { if (p.canFight()) { changes.push(...Economy.autoEquip(p, budget)); } });
        // Anything the fixer pulled out of a pack is no longer on offer.
        report.loot.forEach((l) => {
            if (l.fate !== "held") { return; }
            const bag: Array<Weapon | Armor> = l.kind === "weapon"
                ? l.owner.inventory.weapons : l.owner.inventory.armor;
            if (bag.indexOf(l.item) < 0) { l.fate = "equipped"; }
        });
        return {...report, loot: report.loot.slice(), gear: [...report.gear, ...changes], kitted: true};
    }

    /** Trauma Team for a merc the crew wants back — paid for out of the purse. */
    public static buyout(state: InterfaceAppState, report: BattleReport, id: string): BattleReport | null {
        const merc = report.casualties.find((c) => c instanceof Merc && c.offerId === id);
        if (!merc) { return null; }
        const cost = merc instanceof Merc ? merc.buyoutCost() : 400;
        if (!state.crew.spend(cost)) { return null; }
        merc.revive();
        return {...report, casualties: report.casualties.filter((c) => c !== merc)};
    }

    /**
     * Leave the debrief: auto-kit the leftovers, strike off anyone nobody paid
     * for, then hit the map (or the run-over screen).
     */
    public static continueFromDebrief(state: InterfaceAppState, log: number): Patch {
        const run = state.run;
        const report = state.report ? RunController.autoKit(state, state.report) : null;
        const notes: any[] = report ? report.gear.map((c) => ({msg: Economy.describe(c)})) : [];
        // Trauma Team always comes for your character — the run-over screen says
        // so, and without this they could be left mortally wounded for the rest of
        // the run, rolling a death save every round until they were gone for good.
        // The pickup isn't optional and it isn't free.
        const you = state.party.find((p) => !p.hireable);
        if (you && !you.canFight() && report && report.outcome === "victory") {
            const bill = Purse.garnish(you, 400 + (run ? run.sector : 1) * 200);
            you.revive();
            notes.push({msg: `Trauma Team stabilises ${you.name} — billed ${bill}¥.`});
        }
        const lost = report ? report.casualties : [];
        lost.forEach((c) => notes.unshift({msg: `${c.name} didn't make it off the street.`}));
        const party = lost.length ? state.party.filter((p) => lost.indexOf(p) < 0) : state.party;
        if (!run) { return {screen: "map", report: null, party}; }
        if (report && report.outcome === "defeat") {
            return {screen: "end", report: null, party, messages: [...notes, ...state.messages].slice(0, log)};
        }
        return {...RunController.advance(state, run.node!, notes, log), report: null, party};
    }

    // =====================================================================
    // Hiring and sectors
    // =====================================================================

    /** Put a candidate on the payroll if the purse and the squad cap allow it. */
    public static hire(state: InterfaceAppState, id: string, log: number): Patch | null {
        const offer = state.offers.find((o) => o.id === id);
        if (!offer || state.party.length >= RunController.SQUAD_CAP) { return null; }
        if (!state.crew.spend(offer.price)) { return null; }
        const merc = new Merc(offer);
        return {
            party: [...state.party, merc],
            messages: [{msg: `${merc.name} (${merc.tier} ${merc.role.name}) signs on for ${offer.price}¥.`} as any,
                ...state.messages].slice(0, log),
        };
    }

    /** Next sector: a new city, a harder one, with the crew you walked out with. */
    public static nextSector(state: InterfaceAppState, log: number): Patch {
        const sector = (state.run ? state.run.sector : 0) + 1;
        state.party.forEach((p) => {
            if (!p.canFight()) { p.revive(); }
            p.health = p.maxHealth;
            Economy.repairArmor(p);
        });
        return {
            run: RunController.freshRun(sector), screen: "map", report: null, offers: [],
            eventId: null, usedEvents: [],       // new streets, fresh encounter pool
            activeMainPanel: "Combat", mobileTab: "arena",
            messages: [{msg: `— sector ${sector}: new streets, worse people —`} as any,
                ...state.messages].slice(0, log),
        };
    }

    /**
     * A wipe ends the run, not the character. Trauma Team pulls them out with
     * their levels and training intact; the gear, the crew and the eddies stay
     * on the pavement. Next run starts at sector 1 with a stronger merc in
     * basic kit — which is why encounters scale off the sector, not the party.
     */
    public static nextRun(state: InterfaceAppState, log: number): Patch {
        const character = state.character;
        character.revive();
        Economy.stripToBasics(character);
        const crew = new Crew().activate();
        return {
            character, party: [character, new Merc(MercMarket.starter(1))], crew,
            run: RunController.freshRun(1), screen: "map", report: null, offers: [],
            eventId: null, usedEvents: [],
            activeChar: character, activeMainPanel: "Combat", mobileTab: "arena",
            messages: [{msg: "— Trauma Team drops you back on the street. New crew, old scars. —"} as any].slice(0, log),
        };
    }

    /** Spend the one-per-run Trauma Team revive and resume the current fight. */
    public static revive(state: InterfaceAppState, log: number): Patch | null {
        const run = state.run;
        if (!run || run.reviveUsed) { return null; }
        state.party.forEach((p) => p.revive());
        // The ledger was sealed when the squad went down — open a fresh one so the
        // resumed fight gets its own debrief.
        BattleRecorder.begin(state.party, state.currentEnemies,
            run.node ? run.node.type : "combat", "second wind");
        return {
            run: {...run, reviveUsed: true, outcome: "active"}, screen: "combat", report: null,
            messages: [{msg: "— Trauma Team revive (one per run) —"} as any, ...state.messages].slice(0, log),
        };
    }

    /** Convenience for callers that only have an id. */
    public static nodeById(run: RunState, id: string): RunNode | null {
        return RunMap.find(run, id);
    }
}
