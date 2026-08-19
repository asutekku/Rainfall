import type {InterfaceAppState, PendingFight} from "../components/app";
import {Actor} from "../actors/Actor";
import {ActorController} from "../actors/actorController";
import {Armor} from "../items/Armor";
import {Weapon} from "../items/Weapon";
import {Merc} from "../actors/Merc";
import {BattleRecorder, BattleReport, GearChange, LootItem} from "./battleReport";
import {Battlefield} from "./battlefield";
import {FeedLog} from "./feedLog";
import {Crew, Purse, Stash} from "./crew";
import {MercMarket} from "./mercMarket";
import {Economy} from "./economy";
import {RunMap, RunNode, RunState, encounterSpec, fightsCleared, spawnEncounter} from "./runMap";
import {Chrome} from "./chrome";
import {Deployment, Kit, ROSTER_CAP, SQUAD_CAP, issue, startingKit, stow} from "./loadout";

type Patch = Partial<InterfaceAppState>;

/**
 * Pure-ish state machine for a run. Movement is dungeon-style: the squad
 * stands on a waypoint and may move to any adjacent one. Entering an uncleared
 * node triggers its encounter/screen; entering a cleared node just relocates
 * (free backtracking). Each method takes the current app state and returns a
 * `setState` patch, so `App` stays a thin React shell owning the turn timer.
 */
export class RunController {
    /** Party yardstick for scaling encounters (highest member level). */
    public static levelOf(party: Actor[]): number {
        return party.reduce((m, p) => Math.max(m, p.level), 1);
    }

    /**
     * Re-exported from `loadout`, which owns them: the staging screen needs the
     * same two numbers and cannot import this class without closing a cycle.
     */
    public static readonly SQUAD_CAP: number = SQUAD_CAP;
    public static readonly ROSTER_CAP: number = ROSTER_CAP;

    /** A brand-new sector: fresh city, road-graph waypoints, squad at the entry. */
    public static freshRun(sector: number = 1): RunState {
        BattleRecorder.abort();
        return RunMap.generate(sector);
    }

    /**
     * Put a character on the street at the top of sector 1 — the one way a run
     * ever begins. First deploy, a veteran sent back out from the boot screen,
     * and the run after a wipe all land here, so a run always opens in exactly
     * the same shape (this used to live in two places and had already drifted:
     * one seeded the combat shell, the other leaned on stale state from the run
     * that had just ended).
     *
     * Every run starts on the same footing: patched up, Luck restored, basic
     * kit, and a crate with a couple of frags and a smoke in it. What the character keeps is what the character *is* —
     * levels, training, reputation, and the chrome they paid Humanity for.
     * Trauma Team resets the body and doesn't touch the wiring.
     */
    public static beginRun(character: Actor, opening: string, log: number, prevFunds: number = 0): Patch {
        character.revive();
        character.health = character.maxHealth;
        character.refreshLuck();
        Economy.stripToBasics(character);
        // Cryptobank Cortex: a slice of the previous pot survives into this run.
        const banked = Math.floor(prevFunds * character.chromeNum("deathBank"));
        // Never start alone: the fixer throws in a rookie with the job —
        // or, on a Command Uplink Mk.III, a Veteran already waiting at the corner.
        const crew = new Crew(Crew.STARTING_FUNDS + banked, startingKit()).activate();
        const starter = new Merc(character.chromeHas("freeVeteranStarter")
            ? MercMarket.starterVeteran(1) : MercMarket.starter(1));
        RunController.outfitHire(character, starter, crew.kit);
        const party: Actor[] = [character, starter];
        Chrome.armRun(party);        // fresh run, fresh Self-ICE / biomonitor charges
        // Seed a placeholder wave so the combat shell never reads an empty array.
        const enemies = ActorController.getEnemies(2, RunController.levelOf(party));
        Battlefield.deploy(party, enemies);
        const lines: any[] = [{msg: opening}];
        if (banked > 0) { lines.push({msg: `— the Cryptobank Cortex releases ${banked}¥ from cold storage —`}); }
        return {
            character, party, squad: party.slice(), crew,
            run: RunController.scout(RunController.freshRun(1), party),
            screen: "map", report: null, offers: [],
            eventId: null, pending: null, usedEvents: [],
            currentEnemies: enemies, activeChar: character, activeEnemy: enemies[0],
            activeMainPanel: "Combat", mobileTab: "arena", mobileMore: false, unread: 0,
            messages: lines.slice(0, log),
            playback: null, turnOrder: [], round: 0, holdLeft: 0, inspecting: null,
        };
    }

    /** Move onto an adjacent node: relocate, open its screen, or start its fight. */
    public static enter(state: InterfaceAppState, node: RunNode, log: number): Patch {
        const run = state.run;
        if (!run || run.reachableIds.indexOf(node.id) < 0) { return {}; }
        if (run.clearedIds.indexOf(node.id) >= 0) {
            // already cleared — free movement, no encounter
            return {run: RunController.scout(
                {...run, position: node.id, reachableIds: (run.adj[node.id] || []).slice()}, state.party)};
        }
        if (node.type === "merchant") { return {run: {...run, node}, screen: "merchant"}; }
        if (node.type === "rest") { return {run: {...run, node}, screen: "rest"}; }
        if (node.type === "event") { return {run: {...run, node}, screen: "event"}; }
        if (node.type === "net") { return {run: {...run, node}, screen: "net"}; }
        if (node.type === "hire") {
            // A fixer's table mid-sector: short list, and he takes his cut.
            return {run: {...run, node}, screen: "hire",
                offers: MercMarket.board(run.sector + 1, 3, 1.25 * RunController.hireMarkup(state))};
        }
        // combat / elite / boss
        if (node.type === "combat") {
            // Enforcer "Bad Reputation": street crews sometimes read the cyberlimbs
            // and stand down — the fight is won before it starts (no
            // loot, no XP: not getting shot at is the payout).
            const face = state.party.filter((p) => p.canFight() && p.standDownChance() > 0)
                .sort((a, b) => b.standDownChance() - a.standDownChance())[0];
            if (face && Math.random() < face.standDownChance()) {
                face.gainReputation(1);
                return RunController.advance(state, node,
                    [{msg: `— they make ${face.name.split(" ")[0]} — weapons drop, and the crew walks through —`}], log);
            }
        }
        // The wave is rolled HERE, one screen before the shooting, so staging
        // can show the player the actual bodies they are about to meet rather
        // than a plausible sample of them. Nothing is committed until they
        // deploy — see `deploy` below and staging.tsx.
        const spec = encounterSpec(node, run.sector, RunController.levelOf(state.party), fightsCleared(run));
        const enemies = spawnEncounter(spec);
        // holdout fights carry their clock on the node so the sequencer sees it
        if (spec.holdout) { node.holdout = spec.holdout; } else { delete node.holdout; }
        return {
            run: {...run, node}, screen: "staging",
            pending: RunController.fightOf(node),
            currentEnemies: enemies, activeEnemy: enemies[0], activeChar: state.party[0],
        };
    }

    /** How a node's fight files itself: in the report, in the feed, on the screen. */
    private static fightOf(node: RunNode): PendingFight {
        const label = node.type === "boss" ? "BOSS — hold nothing back"
            : node.type === "elite" ? "elite contact"
            : node.holdout ? `holdout — survive ${node.holdout} rounds` : "firefight";
        const headline = node.type === "boss" ? "BOSS CONTACT"
            : node.type === "elite" ? "ELITE CONTACT" : "FIREFIGHT";
        return {kind: node.type, label, headline, ...(node.holdout ? {holdout: node.holdout} : {})};
    }

    /**
     * Orders given, hands off the wheel. Stances go onto the AI profiles and
     * the chosen ordnance comes out of the crate onto belts; only then does the
     * street load and the recorder start.
     *
     * From here to the debrief the fight is about `squad`, not `party`: the
     * benched are on the payroll but not on the street, so they cannot shoot,
     * cannot be shot, and cannot be a casualty.
     */
    public static deploy(state: InterfaceAppState, plan: Deployment, log: number): Patch {
        const fight = state.pending;
        if (!fight) { return {}; }
        const enemies = state.currentEnemies;
        const squad = RunController.fieldable(plan.squad, state.party);
        issue(plan, state.crew.kit);
        Battlefield.deploy(squad, enemies);
        BattleRecorder.begin(squad, enemies, fight.kind, fight.label);
        const benched = state.party.length - squad.length;
        return {
            screen: "combat", pending: null, currentEnemies: enemies, squad,
            activeEnemy: enemies[0], activeChar: squad[0],
            activeMainPanel: "Combat", mobileTab: "arena",
            messages: [
                FeedLog.sys(`— ${fight.label} —`) as any,
                ...(benched > 0 ? [FeedLog.sys(`— ${benched} left holding the van —`) as any] : []),
                ...state.messages].slice(0, log),
        };
    }

    /**
     * The squad as the engine is allowed to see it: on the payroll, able to
     * fight, your character always in, and never more than there are seats.
     *
     * The staging screen enforces all of this already; this is the seam that
     * stops a stale selection (a merc who bled out on the previous node, a save
     * restored mid-run) from putting a body on the street that shouldn't be there.
     */
    public static fieldable(picked: Actor[] | undefined, party: Actor[]): Actor[] {
        const you = party.find((p) => !p.hireable);
        const chosen = (picked || party).filter((p) => party.indexOf(p) >= 0 && p.canFight());
        const hires = chosen.filter((p) => p !== you);
        const ordered = you && you.canFight() ? [you, ...hires] : hires;
        return ordered.slice(0, RunController.SQUAD_CAP);
    }

    /** Leave a merchant / rest node (clears it) and stand on it, back on the map. */
    public static leaveMeta(state: InterfaceAppState, log: number): Patch | null {
        const run = state.run;
        return run && run.node ? RunController.advance(state, run.node, [{msg: "— moving on —"}], log) : null;
    }

    /** Mark a node cleared and stand on it; clearing the boss wins the run. */
    /**
     * Trauma Team always comes for your character — in a firefight the pickup
     * happens on the way out of the debrief, but the street has other ways to
     * put them down (black ICE, for one). Whoever calls this on the way back
     * to the map gets the same deal: revived, and billed for it. Returns the
     * feed line, or null if they were fine.
     */
    public static traumaPickup(you: Actor, sector: number): string | null {
        if (you.canFight()) { return null; }
        // Trauma Platinum: priority biotelemetry shaves (or waives) the bill.
        const rate = Math.max(0, 1 - you.chromeNum("traumaDiscount"));
        const bill = Purse.garnish(you, Math.round((400 + sector * 200) * rate));
        you.revive();
        return bill > 0
            ? `Trauma Team stabilises ${you.name} — billed ${bill}¥.`
            : `Trauma Team stabilises ${you.name} — Platinum coverage, no bill.`;
    }

    public static advance(state: InterfaceAppState, node: RunNode, extra: any[], log: number): Patch {
        const run = state.run;
        if (!run) { return {}; }
        const you = state.character;
        // Nobody walks the map dying. A netrun (or anything else off the street)
        // that leaves your character flatlined gets the same forced pickup a
        // firefight does — otherwise the run drifts on around a downed leader,
        // staging merc-only squads that make no sense.
        const pickup = RunController.traumaPickup(you, run.sector);
        if (pickup) { extra = [...extra, {msg: `— ${pickup} —`}]; }
        const fresh = run.clearedIds.indexOf(node.id) < 0;
        const clearedIds = fresh ? run.clearedIds.concat(node.id) : run.clearedIds;
        const depth = run.depth + 1;
        if (fresh) {
            // Every node survived steadies the nerves: +1 Luck across the squad.
            state.party.forEach((p) => { p.luck = Math.min(p.maxLuck, p.luck + 1); });
            // Word travels. Boss and elite scalps build the character's name.
            if (node.type === "boss") {
                you.gainReputation(2);
                // Sector cleared: the crew stands down and puts itself back
                // together, here, the moment the boss goes cold.
                //
                // This used to happen one screen later, on the way *into* the
                // next sector. So the sector-clear screen drew the squad's HP
                // bars at whatever the boss had left them, told the player "the
                // crew is patched up" in the copy underneath, and then healed
                // them silently once they pressed on. The cheapest hiring board
                // in the game is on that screen: reading a half-dead roster
                // there is how you pay for a replacement you never needed.
                RunController.patchUp(state.party);
                extra = [...extra, {msg: "— sector clear: the crew stands down, patched up and re-plated —"}];
            }
            if (node.type === "elite") { you.gainReputation(1); }
            // Rigger "Maker": between stops they service the crew's armour.
            const patched = RunController.makerPass(state.party);
            if (patched > 0) { extra = [...extra, {msg: `— the Rigger patches ${patched} SP back into the squad's armour —`}]; }
            const combatNode = node.type === "combat" || node.type === "elite" || node.type === "boss";
            if (combatNode) {
                // Nanosurgeons: the swarm closes the wearer's wounds after a fight.
                const nano = you.chromeNum("healAfterCombat");
                const nanoHealed = nano > 0 && you.canFight() ? you.heal(nano) : 0;
                if (nanoHealed > 0) { extra = [...extra, {msg: `— nanosurgeons knit ${nanoHealed} HP back into ${you.name.split(" ")[0]} —`}]; }
                // Squad Biomonitor Mk.III: the link drip-feeds the hired help too.
                const drip = you.chromeNum("mercHealAfter");
                if (drip > 0) { state.party.forEach((p, i) => { if (i > 0 && p.canFight()) { p.heal(drip); } }); }
            }
            // Probability Co-Processor Mk.III: hard scalps reset the odds.
            if ((node.type === "elite" || node.type === "boss") && you.chromeHas("luckOnElite")) {
                you.refreshLuck();
                extra = [...extra, {msg: "— the co-processor recalibrates: Luck restored —"}];
            }
        }
        const messages = [...extra, ...state.messages].slice(0, log);
        if (node.type === "boss") {
            // Sector cleared — and the scalp pays in chrome: pick one of two, free.
            const augOffers = Chrome.bossOffers(you, run.sector);
            return {
                run: {...run, clearedIds, depth, node: null, position: node.id, outcome: "won"},
                screen: augOffers.length ? "augpick" : "sector", augOffers,
                offers: MercMarket.board(run.sector + 1, 4, RunController.hireMarkup(state)), messages,
            };
        }
        return {
            run: RunController.scout({
                ...run, clearedIds, depth, node: null,
                position: node.id, reachableIds: (run.adj[node.id] || []).slice(),
            }, state.party),
            screen: "map", messages,
        };
    }

    /**
     * Rigger "Maker": between stops they patch up HALF of each piece's lost SP.
     * A second Rigger doesn't stack — one pair of hands on the workbench.
     */
    private static makerPass(party: Actor[]): number {
        if (!party.some((t) => t.isClass("rigger") && t.canFight())) { return 0; }
        let total = 0;
        party.forEach((m) => {
            [m.equipment.upper, m.equipment.headgear].forEach((a: any) => {
                if (a && a.stoppingPower < a.maxStoppingPower) {
                    const d = Math.ceil((a.maxStoppingPower - a.stoppingPower) / 2);
                    a.stoppingPower += d;
                    total += d;
                }
            });
        });
        return total;
    }

    /**
     * Media "Credibility": their sources see one street further than the crew's
     * own eyes — every waypoint within intel range of where the squad stands is
     * uncovered on the holo-map. Knowledge, once bought, doesn't fade.
     */
    public static scout(run: RunState, party: Actor[]): RunState {
        const range = party.reduce((m, p) => Math.max(m, p.canFight() ? p.intelRange() : 1), 1);
        if (range <= 1) { return run; }
        const revealed = new Set(run.revealedIds);
        let frontier: string[] = [run.position];
        const visited = new Set(frontier);
        for (let hop = 1; hop <= range; hop++) {
            const next: string[] = [];
            frontier.forEach((id) => (run.adj[id] || []).forEach((n) => {
                if (!visited.has(n)) { visited.add(n); next.push(n); }
            }));
            // hop 1 is plain adjacency (already visible to everyone) — the
            // Media's edge starts one street beyond that
            if (hop >= 2) { next.forEach((n) => revealed.add(n)); }
            frontier = next;
        }
        return revealed.size === run.revealedIds.length ? run
            : {...run, revealedIds: Array.from(revealed)};
    }

    /** One resolved round in a combat node: wipe or clear → debrief, else continue. */
    public static step(state: InterfaceAppState, msgs: any[], log: number): Patch {
        // Only the deployed are in this fight — the benched are on the payroll,
        // not on the street, so they neither lose it nor stow anything from it.
        const party = RunController.fieldable(state.squad, state.party);
        const run = state.run;
        if (!run) { return {}; }
        // Squad Biomonitor: a dropping merc gets pulled back before the ledger closes.
        Chrome.biomonitorPass(party).forEach((name) => {
            // a feed line, not a legacy message: this one lands mid-fight, where
            // the "> ..." grammar sits among surveillance lines and reads as a
            // different log spliced into this one
            msgs = [FeedLog.sys(`— biomonitor override: ${name} is stabilised on their feet —`), ...msgs];
        });
        // routed enemies ran off the field — the fight is over without their bodies
        const alive = state.currentEnemies.filter((e) => e.health > 0 && !e.routed);
        const feed = [...msgs, ...state.messages].slice(0, log);

        if (party.every((p) => !p.canFight())) {          // squad wiped → debrief, then run over
            // Belts are left alone here on purpose: a Trauma Team revive resumes
            // *this* fight, and a second wind with nothing left to throw would
            // be a second punishment for going down.
            return {
                run: {...run, outcome: "lost"}, screen: "debrief",
                report: BattleRecorder.finish("defeat"),
                currentEnemies: alive, messages: feed,
            };
        }
        if (alive.length <= 0) {                           // node cleared → after-action report
            stow(party, state.crew.kit);   // unthrown ordnance goes back in the crate
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
            ? Stash.of(loot.owner).weapons : Stash.of(loot.owner).armor;
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
                ? Stash.of(l.owner).weapons : Stash.of(l.owner).armor;
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
        if (you && report && report.outcome === "victory") {
            const pickup = RunController.traumaPickup(you, run ? run.sector : 1);
            if (pickup) { notes.push({msg: pickup}); }
        }
        const lost = report ? report.casualties : [];
        lost.forEach((c) => notes.unshift({msg: `${c.name} didn't make it off the street.`}));
        const party = lost.length ? state.party.filter((p) => lost.indexOf(p) < 0) : state.party;
        const squad = lost.length ? state.squad.filter((p) => lost.indexOf(p) < 0) : state.squad;
        if (!run) { return {screen: "map", report: null, party, squad}; }
        if (report && report.outcome === "defeat") {
            return {screen: "end", report: null, party, squad, messages: [...notes, ...state.messages].slice(0, log)};
        }
        return {...RunController.advance(state, run.node!, notes, log), report: null, party, squad};
    }

    // =====================================================================
    // Hiring and sectors
    // =====================================================================

    /** Reputation Cortex: mercs sign on cheaper — folded into board prices. */
    public static hireMarkup(state: InterfaceAppState): number {
        return Math.max(0.1, 1 - state.character.chromeNum("hireDiscount"));
    }

    /**
     * Kit a new signing out.
     *
     * A hire turns up with a frag on their belt, which now goes straight into
     * the crew crate: belts are packed at staging, so anything sitting on one
     * outside a fight would be ordnance nobody chose to bring.
     *
     * On a Command Uplink the hire also draws on the wearer's requisition codes.
     */
    private static outfitHire(character: Actor, merc: Merc, crate: Kit): void {
        crate.frag += merc.grenades;
        merc.grenades = 0;
        if (character.chromeNum("mercGearTier") <= 0) { return; }
        const worn = merc.equipment.upper;
        const better = Economy.nextArmorTier(worn ? worn.maxStoppingPower : 0);
        if (better) {
            merc.equipment.upper = new Armor("upper", better.name, "", 1, better.sp, better.cost, "");
        }
    }

    /** Put a candidate on the payroll if the purse and the roster cap allow it. */
    public static hire(state: InterfaceAppState, id: string, log: number): Patch | null {
        const offer = state.offers.find((o) => o.id === id);
        if (!offer || state.party.length >= RunController.ROSTER_CAP) { return null; }
        if (!state.crew.spend(offer.price)) { return null; }
        const merc = new Merc(offer);
        RunController.outfitHire(state.character, merc, state.crew.kit);
        return {
            party: [...state.party, merc],
            messages: [{msg: `${merc.name} (${merc.tier} ${merc.role.name}) signs on for ${offer.price}¥.`} as any,
                ...state.messages].slice(0, log),
        };
    }

    /**
     * The whole squad recovers: back on their feet, back to full, luck pool
     * reset and the plate hammered back out. What clearing a sector buys.
     */
    private static patchUp(party: Actor[]): void {
        party.forEach((p) => {
            if (!p.canFight()) { p.revive(); }
            p.health = p.maxHealth;
            p.refreshLuck();
            Economy.repairArmor(p);
        });
    }

    /** Next sector: a new city, a harder one, with the crew you walked out with. */
    public static nextSector(state: InterfaceAppState, log: number): Patch {
        const sector = (state.run ? state.run.sector : 0) + 1;
        // No patch-up here — clearing the sector already did it, and anyone
        // signed on the board since arrived fresh.
        Chrome.armRun(state.party);        // fresh sector, fresh Self-ICE / biomonitor charges
        return {
            run: RunController.scout(RunController.freshRun(sector), state.party),
            screen: "map", report: null, offers: [], squad: state.party.slice(),
            eventId: null, usedEvents: [],       // new streets, fresh encounter pool
            activeMainPanel: "Combat", mobileTab: "arena",
            messages: [
                {msg: `— sector ${sector}: new streets, worse people —`} as any,
                ...state.messages].slice(0, log),
        };
    }

    /**
     * A wipe ends the run, not the character. Trauma Team pulls them out with
     * their levels and training intact; the gear, the crew and the eddies stay
     * on the pavement. Next run starts at sector 1 with a stronger merc in
     * basic kit — which is why encounters scale off the sector, not the party.
     *
     * `tail` is the last few lines of the run that just died: the feed used to
     * be wiped clean here, which made the fourth run read exactly like the
     * first. The street remembers what happened twenty minutes ago.
     */
    public static nextRun(state: InterfaceAppState, log: number, tail: any[] = []): Patch {
        const run = state.run;
        const reached = run ? `— last job died in sector ${run.sector}, ${run.depth} waypoints deep —` : "";
        // Cryptobank Cortex: a slice of the dead run's pot rides the shadow account out.
        const patch = RunController.beginRun(state.character,
            "— Trauma Team drops you back on the street. New crew, old scars. —", log, state.crew.funds);
        const opening = (patch.messages || []) as any[];
        return {
            ...patch,
            messages: [...opening, ...(reached ? [{msg: reached} as any] : []), ...tail].slice(0, log),
        };
    }

    /**
     * Resolve the boss's chrome drop: install / upgrade the picked line (the
     * metal is free — the Humanity bill isn't), or skip it. Either way the
     * sector-clear screen is next.
     */
    public static takeAug(state: InterfaceAppState, lineId: string | null, log: number): Patch {
        const you = state.character;
        const lines: any[] = [];
        if (lineId) {
            const offer = state.augOffers.find((o) => o.line.id === lineId);
            const cw = offer ? (offer.isUpgrade ? Chrome.upgrade(you, lineId) : Chrome.install(you, lineId)) : null;
            if (cw) {
                lines.push({msg: `— ${cw.name} ${offer!.isUpgrade ? "upgraded" : "installed"} (−${offer!.hl} Humanity) —`});
                if (you.cyberpsychosis) { lines.push({msg: `— ${you.name} feels nothing about that at all. CYBERPSYCHOSIS. —`}); }
            }
        }
        return {screen: "sector", augOffers: [],
            messages: [...lines, ...state.messages].slice(0, log)};
    }

    /** Revives the character's chrome entitles them to per sector (base 1). */
    public static reviveAllowance(state: InterfaceAppState): number {
        return 1 + state.character.chromeNum("extraRevives");
    }

    /** Spend a Trauma Team revive and resume the current fight. */
    public static revive(state: InterfaceAppState, log: number): Patch | null {
        const run = state.run;
        const allowance = RunController.reviveAllowance(state);
        if (!run || run.revivesUsed >= allowance) { return null; }
        const squad = RunController.fieldable(state.squad, state.party);
        squad.forEach((p) => p.revive());
        // Trauma Platinum Mk.II: the extraction crew patches armour on the way up.
        if (state.character.chromeHas("reviveRepairs")) {
            squad.forEach((p) => Economy.repairArmor(p));
        }
        // The ledger was sealed when the squad went down — open a fresh one so the
        // resumed fight gets its own debrief.
        BattleRecorder.begin(squad, state.currentEnemies,
            run.node ? run.node.type : "combat", "second wind");
        const used = run.revivesUsed + 1;
        return {
            run: {...run, revivesUsed: used, reviveUsed: used >= allowance, outcome: "active"},
            screen: "combat", report: null,
            messages: [FeedLog.sys(`— Trauma Team revive (${allowance - used} left this run) —`) as any,
                ...state.messages].slice(0, log),
        };
    }

    /** Convenience for callers that only have an id. */
    public static nodeById(run: RunState, id: string): RunNode | null {
        return RunMap.find(run, id);
    }
}
