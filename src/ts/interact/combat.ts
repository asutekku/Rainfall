import {Actor} from "../actors/Actor";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {GetItem} from "./getItem";
import {Messages} from "./messages";
import {DeathMessage, DodgeMessage, IDefaultMessage, MessageStr} from "./messageSchema";
import {Skill} from "../items/Skill";
import {Check} from "./check";
import {HitQuality, QUALITY_MULT, AIMED_EDGE, coverEdge, outOfRange, rangeEdge, rollQuality} from "./damageModel";
import {STATUS, StatusKey, applyStatus, clearRoundStatuses, hasStatus, incomingMult,
    outgoingMult, stacksOf, statusEdge, tickStatuses} from "./statuses";
import {stanceIn, stanceOut} from "./loadout";
import {BLAST_RADIUS, Battlefield, EMP_RADIUS, FLASH_RADIUS, GRENADE_RANGE, Point} from "./battlefield";
import {TacticalAI, Plan} from "./tacticalAI";
import {Economy} from "./economy";
import {BattleRecorder} from "./battleReport";
import {BattleEvent, BlastType, BlastVictim, TurnResult} from "./battleEvents";

const Log = en_US.Log;

/** Baseline edge for a melee swing before the target's evasion is taken off. */
const MELEE_BASE = 12;

export class Combat {
    private static messages: any = [];
    /** Play-by-play of the turn being resolved, for the battle scene to animate. */
    private static events: BattleEvent[] = [];

    /**
     * One exchange between two combatants, resolved by Cyberpunk RED order:
     * Initiative decides who acts first; a Mortally Wounded combatant makes a
     * Death Save instead of acting; otherwise it attacks its foe.
     */
    public static basicAction(actor: Actor, target: Actor, _skill: Skill): any {
        this.messages = [];
        this.events = [];
        if (!actor.canFight() && !actor.mortallyWounded) {
            this.messages.unshift(new MessageStr('That character is out of the fight.'));
            return this.messages.flat().reverse();
        }
        // Reset the per-round Combat Awareness tracker (first hit of the round).
        actor.firstHitDone = false;
        target.firstHitDone = false;
        const order: Actor[] = actor.rollInitiative() >= target.rollInitiative()
            ? [actor, target] : [target, actor];
        for (const combatant of order) {
            const foe: Actor = combatant === actor ? target : actor;
            if (combatant.mortallyWounded) {
                this.resolveDeathSave(combatant);
                continue;
            }
            if (combatant.canFight() && foe.canFight()) {
                this.attack(combatant, foe);
            }
        }
        return this.messages.flat().reverse();
    }

    /** Lightweight telemetry for balancing (read + reset by the headless sim). */
    public static stats = {shots: 0, hits: 0, aimed: 0, dmg: 0};

    /**
     * The accuracy `edge` behind a shot: the shooter's attack bonus, what the
     * range costs, and what cover costs. Melee trades the range term for the
     * target's evasion. Feeds qualityOdds — see damageModel.ts.
     */
    public static shotEdge(actor: Actor, target: Actor, distance: number,
                           aimed: boolean = false, bonus: number = 0): number {
        const weapon = actor.weapon;
        const base: number = actor.attackBonus(weapon) + bonus + (aimed ? AIMED_EDGE : 0)
            + statusEdge(actor);
        if (weapon.weaponClass === "melee") {
            return base + MELEE_BASE - target.evasion();
        }
        return base + rangeEdge(weapon.weaponClass, distance)
            + coverEdge(Battlefield.coverPenaltyAt(target.position, actor.position));
    }

    /**
     * Raw damage into damage on the way to armour, in a fixed order.
     *
     *   raw dice -> + flat adds -> x quality -> x outgoing -> x incoming
     *
     * Flat before multiplicative, which is the rule Slay the Spire specifies
     * and the one that keeps the numbers predictable: a +2 support bonus
     * against a marked target is (raw + 2) x 1.4, not (raw x 1.4) + 2. Armour
     * comes after, inside receiveDamage. Damage over time never comes through
     * here at all — it is the answer to plate, so plate does not answer it.
     */
    private static pipeline(actor: Actor, target: Actor, raw: number, quality: HitQuality): number {
        if (raw <= 0) { return 0; }
        let d = raw;
        d += this.alphaStrike(actor);    // Solo: the round's opening hit lands harder
        d += actor.backupDamage();       // Cop "Backup" support fire
        d *= QUALITY_MULT[quality];
        d *= outgoingMult(actor);
        d *= incomingMult(target);
        // standing orders, set at staging — see loadout.ts for the trade
        d *= stanceOut(actor);
        d *= stanceIn(target);
        return Math.max(1, Math.round(d));
    }

    /**
     * Draw the shot's quality, letting Luck rescue a fumble.
     *
     * Luck used to convert a miss into a hit inside Check.resolve, and the
     * obvious translation — let it promote a graze into a hit — turned out to
     * be far too strong: a Luck 6 merc fires about five times a fight, so it
     * upgraded nearly every graze it drew. The bands collapsed to 90% "hit",
     * and worse, the odds the unit card quotes would have been a lie.
     *
     * So it keeps its original, narrower job: the shot that would have been
     * wasted isn't. Everything else Luck is for lives outside the firefight,
     * on the street checks that events roll.
     */
    private static drawQuality(actor: Actor, edge: number): HitQuality {
        const q: HitQuality = rollQuality(edge);
        if (q === "miss" && actor.luck > 0 && actor.spendLuck(1) > 0) { return "graze"; }
        return q;
    }

    public static attack(actor: Actor, target: Actor, aimed: boolean = false, bonus: number = 0): any {
        const weapon = actor.weapon;
        const distance: number = Utils.distance(actor.position, target.position);
        if (weapon.autofire && weapon.weaponClass !== "melee") {
            this.autofireAttack(actor, target, distance);   // RED: autofire can't make an Aimed Shot
            return;
        }
        const melee: boolean = weapon.weaponClass === "melee";
        const covered: boolean = !melee && Battlefield.coverPenaltyAt(target.position, actor.position) > 0;
        // rounds leaving the barrel, for the tracer animation (aimed shots are single, careful rounds)
        const rounds: number = melee || aimed ? 1 : Math.max(1, Math.min(weapon.rateOfFire || 1, 3));
        if (!melee && outOfRange(weapon.weaponClass, distance)) {
            this.events.push({kind: "noshot", actor});
            this.messages.push(new MessageStr(`${actor.name}: no shot — out of range.`));
            return;
        }
        this.stats.shots += 1; if (aimed) { this.stats.aimed += 1; }
        const targetOldHP: number = target.health;
        let quality: HitQuality = this.drawQuality(actor, this.shotEdge(actor, target, distance, aimed, bonus));
        // Smartgun Array: the first fumble each fight is salvaged into a graze.
        if (quality === "miss" && !melee && actor.chromeHas("grazeOnMiss") && !actor.grazeUsed) {
            actor.grazeUsed = true;
            quality = "graze";
            this.messages.push(new MessageStr(`${actor.name}'s smartgun array salvages the shot.`));
        }
        if (quality === "miss") {
            BattleRecorder.countShot(actor, false);
            this.events.push({kind: "shot", actor, target, hit: false, quality, damage: 0, aimed,
                autofire: false, melee, covered, dropped: false, rounds});
            this.messages.push(new MessageStr(aimed ? 'MISS! (aimed)' : 'MISS!'));
            return;
        }
        this.stats.hits += 1;
        BattleRecorder.countShot(actor, true);
        const damage: number = this.pipeline(actor, target, weapon.getDamage(), quality);
        const dealt: number = target.receiveDamage(damage, weapon.ap, aimed);
        this.stats.dmg += dealt;
        BattleRecorder.countDamage(actor, target, dealt);
        this.events.push({kind: "shot", actor, target, hit: true, quality, damage: dealt, aimed,
            autofire: false, melee, covered, dropped: !target.canFight(), rounds});
        this.messages.push(Messages.getCombatMessage(actor, target, targetOldHP, dealt));
        if (aimed && dealt > 0) { this.messages.push(new MessageStr(`${actor.name} lands a head shot!`)); }
        this.afterHit(actor, target, dealt, quality);
        this.registerIfDefeated(actor, target);
    }

    /**
     * Put a status on someone, through their Ward if they have one.
     *
     * Ward eats a whole application, not a stack — that is what stops a stacking
     * debuff from being an inevitability and makes it a decision instead.
     * Everything that inflicts anything goes through here so the board hears
     * about it exactly once.
     */
    private static afflict(_source: Actor | null, target: Actor, key: StatusKey, n: number = 1): boolean {
        if (!target.alive) { return false; }
        const landed: number = applyStatus(target, key, n);
        const def = STATUS[key];
        this.events.push({kind: "status", actor: target, status: key,
            stacks: stacksOf(target, key), warded: landed === 0 && def.debuff});
        if (landed === 0 && def.debuff) {
            this.messages.push(new MessageStr(`${target.name}'s ward eats it — no ${def.label.toLowerCase()}.`));
            return false;
        }
        if (landed > 0) {
            this.messages.push(new MessageStr(
                `${target.name}: ${def.label.toLowerCase()} — ${def.explain(stacksOf(target, key))}.`));
        }
        return landed > 0;
    }

    /**
     * What a landed hit leaves behind: focus-fire stagger, whatever the weapon
     * type does to people, spikes coming back the other way, and the old
     * critical-injury roll.
     */
    private static afterHit(actor: Actor, target: Actor, dealt: number, quality: HitQuality): void {
        if (dealt <= 0) { return; }
        // concentrating fire is worth something: each hit this round softens the next
        applyStatus(target, "staggered", 1);
        this.weaponProc(actor, target, quality);
        this.spikesBack(actor, target);
        this.rollCrit(target, dealt, quality);
    }

    /**
     * Weapons leave their signature. A crit always procs; an ordinary hit
     * sometimes does. This is what finally makes the sixteen catalogue weapons
     * with a non-kinetic damage type do something — they dealt literally no
     * damage before, tasers and needleguns and net launchers alike, and sat in
     * shops as loot that could not affect a fight.
     */
    private static weaponProc(actor: Actor, target: Actor, quality: HitQuality): void {
        const w = actor.weapon;
        const sure: boolean = quality === "crit" || w.diceThrows <= 0;   // the no-damage kit always procs
        const proc = (key: StatusKey, n: number, chance: number) => {
            if (sure || Math.random() < chance) { this.afflict(actor, target, key, n); }
        };
        switch (w.damageType) {
            case "stun":     proc("stunned", 1, 0.35); return;
            case "emp":      proc("fried", 2, 0.5); return;
            case "drugs":    proc("toxin", 2, 0.5); return;
            case "entangle": proc("suppressed", 2, 0.5); return;
            case "special":  proc("blinded", 2, 0.5); return;
            case "varies":   proc("burn", 2, 0.4); return;
            default: break;
        }
        // kinetic: the shape of the weapon decides what it leaves
        if (w.weaponClass === "shotgun" || w.weaponClass === "melee") { proc("bleed", 2, 0.18); }
        else if (w.ap) { proc("shred", 1, 0.25); }
    }

    /** Reactive plating: whoever lands a hit wears some of it. */
    private static spikesBack(actor: Actor, target: Actor): void {
        const spikes: number = stacksOf(target, "thorns");
        if (spikes <= 0 || !actor.canFight()) { return; }
        const back: number = actor.directDamage(spikes);
        if (back > 0) {
            this.messages.push(new MessageStr(`${target.name}'s plating bites back — ${back} to ${actor.name}.`));
            this.registerIfDefeated(target, actor);
        }
    }

    /**
     * Battle-scoped critical injuries (house rule): a hit that drives 12+ HP
     * through armour risks leaving a mark — an open bleed, a torn-up leg, or
     * a stunned turn. Everything here heals the moment the fight ends.
     */
    private static rollCrit(target: Actor, dealt: number, quality: HitQuality = "hit"): void {
        // A critical band is the other way in: a clean hit that lands somewhere
        // soft leaves a mark even when the number itself was modest.
        if ((dealt < 12 && !(quality === "crit" && dealt >= 6)) || !target.canFight()) { return; }
        const roll: number = Math.floor(Math.random() * 6) + 1;
        if (roll <= 2) {
            // bleed stacks now — three wounds are three wounds, not one
            this.afflict(null, target, "bleed", 3);
        } else if (roll === 3 && !target.crippled) {
            this.afflict(null, target, "crippled", 1);
            this.events.push({kind: "crit", actor: target, effect: "crippled"});
        } else if (roll === 4) {
            this.afflict(null, target, "stunned", 1);
            this.events.push({kind: "crit", actor: target, effect: "stunned"});
        }
    }

    /**
     * Elites and bosses button up once when they are hurt: a ward that eats the
     * next two things thrown at them, and plate to go with it. Once per fight,
     * and it costs them the turn they spend doing it.
     */
    private static lockdown(self: Actor): boolean {
        if ((self.rank || 0) < 4 || self.lockedDown) { return false; }
        if (self.health > self.maxHealth * 0.55) { return false; }
        self.lockedDown = true;
        this.messages.push(new MessageStr(`${self.name} buttons up — systems locked down.`));
        this.afflict(self, self, "ward", 2);
        this.afflict(self, self, "hardened", 4);
        return true;
    }

    /** Solo "Combat Awareness": bonus damage on the round's first landed hit. */
    private static alphaStrike(actor: Actor): number {
        if (actor.firstHitDone) {
            return 0;
        }
        actor.firstHitDone = true;
        return actor.alphaStrikeBonus();
    }

    /**
     * Autofire: a burst of 2d6, multiplied by how much of it stayed on target.
     *
     * The multiplier used to be the margin by which the to-hit check beat the
     * DV, which made autofire the swingiest thing in the game *and* tied it to
     * the roll that no longer exists. It now reads off the same quality band as
     * every other shot — a graze walks one burst across them, a crit puts the
     * whole magazine in — capped by the weapon's rating (x3 SMG, x4 rifle).
     */
    private static autofireAttack(actor: Actor, target: Actor, distance: number): void {
        if (outOfRange(actor.weapon.weaponClass, distance)) {
            this.events.push({kind: "noshot", actor});
            this.messages.push(new MessageStr('OUT OF RANGE'));
            return;
        }
        const cover: number = Battlefield.coverPenaltyAt(target.position, actor.position);
        this.stats.shots += 1;
        const quality: HitQuality = this.drawQuality(actor, this.shotEdge(actor, target, distance));
        if (quality === "miss") {
            BattleRecorder.countShot(actor, false);
            this.events.push({kind: "shot", actor, target, hit: false, quality, damage: 0, aimed: false,
                autofire: true, melee: false, covered: cover > 0, dropped: false, rounds: 5});
            this.messages.push(new MessageStr('MISS!'));
            return;
        }
        this.stats.hits += 1;
        BattleRecorder.countShot(actor, true);
        const maxMultiplier: number = actor.weapon.weaponClass === "rifle" ? 4 : 3;
        const band: number = quality === "graze" ? 1 : quality === "hit" ? 2 : maxMultiplier;
        const multiplier: number = Math.min(band, maxMultiplier);
        const d1: number = Math.floor(Math.random() * 6) + 1;
        const d2: number = Math.floor(Math.random() * 6) + 1;
        const damage: number = this.pipeline(actor, target, (d1 + d2) * multiplier, "hit");
        const targetOldHP: number = target.health;
        const dealt: number = target.receiveDamage(damage, actor.weapon.ap);
        this.stats.dmg += dealt;
        BattleRecorder.countDamage(actor, target, dealt);
        this.events.push({kind: "shot", actor, target, hit: true, quality, damage: dealt, aimed: false,
            autofire: true, melee: false, covered: cover > 0, dropped: !target.canFight(), rounds: 5});
        this.messages.push(Messages.getCombatMessage(actor, target, targetOldHP, dealt));
        this.afterHit(actor, target, dealt, quality);
        this.registerIfDefeated(actor, target);
    }

    /**
     * RED Suppressive Fire: spend an action and 10 rounds; every target rolls
     * WILL + Concentration against the shooter's REF + Autofire. Failures are
     * pinned (must take cover). Returns the pinned targets. Provided for the
     * action system; the 1v1 auto-battle doesn't use it (needs positioning).
     */
    public static suppressiveFire(actor: Actor, targets: Actor[]): Actor[] {
        const atkMod: number = actor.stats.ref + actor.skillFor(actor.weapon);
        return targets.filter((t) => Check.opposed(actor, atkMod, t.stats.will).success);
    }

    public static dodgeAttack(actor: Actor, target: Actor): IDefaultMessage {
        return new DodgeMessage(actor, target);
    }

    // Melee only!
    public static parryAttack(_actor: Actor, _target: Actor) {
    }

    public static escapeFight(_actor: Actor, _target: Actor) {
    }

    public static mountVehicle(_actor: Actor, _target: Actor) {
    }

    public static reloadWeapon(_actor: Actor, _target: Actor) {
    }

    public static aidActor(actor: Actor, amount: number) {
        actor.health = Math.min(actor.maxHealth, actor.health + amount);
    }

    public static gainLevel(actor: Actor, _target: Actor) {
        actor.gainLevel();
        // Push straight to the combat feed. The legacy Messages.logMessage path
        // reads global State.player/currentEnemy singletons that the React app
        // never sets, so calling it mid-round would throw.
        this.events.push({kind: "level", actor});
        this.messages.push(new MessageStr(`${actor.name} reaches level ${actor.level}.`));
    }

    public static lootEnemy(actor: Actor, target: Actor) {
        Messages.logMessage(Log.loot.search1, actor);
        Messages.logMessage(Log.loot.find, actor);
        GetItem.addItemToInventory(target.item, actor);
        GetItem.updateCurrency(target.currency, actor);
    }

    /** Award the kill/XP/loot when an attack takes the target out of the fight. */
    private static registerIfDefeated(actor: Actor, target: Actor): void {
        // Once, on the way down. This fired on *every* hit that found someone
        // already out, so a second shot into a body paid a second kill, a
        // second helping of XP and a second round of loot.
        if (!target.canFight() && !target.creditedTo) {
            target.creditedTo = actor;
            actor.kills += 1;
            actor.experience += target.experience;
            BattleRecorder.countXp(actor, target.experience);
            const eddies: number = Economy.loot(actor, target);   // eddies fund the gear economy
            if (actor.experience >= actor.maxExperience) {
                Combat.gainLevel(actor, target);
            }
            this.messages.push(new DeathMessage(target, actor));
            if (eddies > 0) { this.messages.push(new MessageStr(`${actor.name} loots ${eddies}¥.`)); }
            Economy.scavenge(actor, target).forEach((m) => this.messages.push(new MessageStr(m)));
        }
    }

    private static resolveDeathSave(actor: Actor): void {
        const survived: boolean = actor.deathSave();
        this.events.push({kind: "save", actor, survived});
        if (survived) {
            this.messages.push(new MessageStr(`${actor.name} clings to life.`));
        } else {
            this.messages.push(new MessageStr(`${actor.name} flatlines.`));
        }
    }

    // =====================================================================
    // Turn engine: movement + AI. A round advances every combatant in
    // initiative order, ONE unit at a time so the battle scene can animate
    // each turn as it resolves.
    // =====================================================================

    /**
     * Start a fresh round: reset per-round trackers and roll initiative.
     * Returns the acting order; feed each unit to takeTurn() in sequence.
     */
    public static beginRound(party: Actor[], enemies: Actor[]): Actor[] {
        BattleRecorder.countRound();
        Battlefield.tickSmoke();   // clouds thin between rounds
        const all: Actor[] = [...party, ...enemies].filter((a) => a.canFight() || a.mortallyWounded);
        all.forEach((a) => {
            a.firstHitDone = false;
            clearRoundStatuses(a);   // focus fire only counts inside a round
            // a target that slipped into smoke breaks the sniper's paint
            if (a.marking && Battlefield.inSmoke({x: a.marking.position.x, y: a.marking.position.y})) {
                a.marking = null;
            }
        });
        // Sandevistan Overclock: the fight's opening round is always theirs.
        // The flag is armed at deploy and burned here, so only round 1 is skewed.
        const order = all
            .map((a) => ({a, init: a.rollInitiative() + (a.actFirstPending ? 1000 : 0)}))
            .sort((x, y) => y.init - x.init)
            .map((o) => o.a);
        all.forEach((a) => { a.actFirstPending = false; });
        return order;
    }

    /**
     * Resolve one unit's turn. With an `order` the unit follows the player's
     * move/target; otherwise the tactical AI plans it. Returns the events (for
     * the battle scene) and the feed messages this turn produced.
     */
    public static takeTurn(c: Actor, party: Actor[], enemies: Actor[],
                           order?: {moveTo?: Point | undefined; target?: Actor | undefined;
                                    aimed?: boolean | undefined; grenadeAt?: Point | undefined}): TurnResult {
        this.messages = [];
        this.events = [];
        const side: "party" | "enemy" = party.indexOf(c) >= 0 ? "party" : "enemy";
        this.events.push({kind: "turn", actor: c, side});
        if (c.alive && c.mortallyWounded) {
            this.resolveDeathSave(c);
            return this.finishTurn();
        }
        if (!c.canFight()) { return this.finishTurn(); }

        // Bleeding, fire and toxins land at the top of the turn, all of them
        // through armour, and every timed effect sheds a stack afterwards.
        const stunnedComingIn: boolean = hasStatus(c, "stunned");
        const tick = tickStatuses(c);
        if (tick.damage > 0) {
            const dealt: number = c.directDamage(tick.damage);
            const dropped: boolean = !c.canFight();
            this.events.push({kind: "bleed", actor: c, damage: dealt, dropped, sources: tick.sources});
            const what = tick.sources.map((k) => STATUS[k].label.toLowerCase()).join(" and ");
            this.messages.push(new MessageStr(`${c.name} is ${what} — ${dealt} damage.`));
            if (dropped) { return this.finishTurn(); }
        }
        // The one status that costs a turn. Everything else is a penalty.
        if (stunnedComingIn) {
            this.events.push({kind: "skip", actor: c, reason: "stunned"});
            this.messages.push(new MessageStr(`${c.name} reels — stunned.`));
            return this.finishTurn();
        }
        if (c.hackCooldown > 0) { c.hackCooldown -= 1; }

        // Reflex chrome running hot: the wearer takes the turn twice. Spent here
        // rather than in the initiative queue so the second action reads on the
        // board as its own beat instead of a mysteriously large one.
        const doubled: boolean = hasStatus(c, "overclock");

        // Berserkers find another gear once they are hurt — the temperament
        // finally means something mechanical and not just a set of AI weights.
        if (c.temperament === "berserker" && c.isSeriouslyWounded()
            && !hasStatus(c, "adrenaline") && !c.adrenalineSpent) {
            c.adrenalineSpent = true;
            this.afflict(c, c, "adrenaline", 3);
        }

        const foes: Actor[] = side === "party" ? enemies : party;
        const allies: Actor[] = side === "party" ? party : enemies;
        const others: Actor[] = [...party, ...enemies].filter((a) => a !== c);

        // Suppression used to eat the whole turn. It gets you low and spoils
        // your aim now — the unit still acts, which is the entire point.
        if (hasStatus(c, "suppressed")) { this.duckIntoCover(c, foes, others); }
        // hostiles check their nerve once the wave is bleeding bodies
        if (side === "enemy" && this.moraleBreaks(c, enemies)) {
            const exit: Point = Battlefield.routExit({x: c.position.x, y: c.position.y});
            c.routed = true;
            this.events.push({kind: "rout", actor: c, to: exit});
            c.position.x = exit.x;   // they're gone — the scene animates the sprint out
            c.position.y = exit.y;
            this.messages.push(new MessageStr(`${c.name} breaks and runs.`));
            return this.finishTurn();
        }
        // A heavy under real pressure locks itself down. This is the counterplay
        // demonstration: Ward eats the next two things thrown at it, so a squad
        // built entirely on stacking debuffs needs a second answer. Deliberately
        // not behind the rank-5 signature move — that one may never trigger, and
        // an unreachable counter is the same as no counter.
        if (!order && this.lockdown(c)) { return this.finishTurn(); }
        // rank-5 signature move fires once, when its trigger lines up
        if (!order && this.bossAbility(c, foes, others)) { return this.finishTurn(); }

        const plan: Plan = order
            ? {moveTo: order.moveTo, target: order.target, aimed: order.aimed,
               grenadeAt: order.grenadeAt, label: "manual"}
            : TacticalAI.plan(c, allies, foes);
        this.applyPlan(c, plan, foes, allies, others);
        if (doubled && c.canFight() && foes.some((f) => f.canFight())) {
            this.applyPlan(c, TacticalAI.plan(c, allies, foes), foes, allies, others);
        }
        return this.finishTurn();
    }

    private static finishTurn(): TurnResult {
        return {events: this.events, messages: this.messages.flat().reverse()};
    }

    /** A pinned unit's whole action: scramble to the nearest cover face. */
    private static duckIntoCover(c: Actor, foes: Actor[], others: Actor[]): void {
        if (Battlefield.nearCover(c.position)) { return; }
        const here: Point = {x: c.position.x, y: c.position.y};
        const near = Battlefield.COVER.slice()
            .sort((a, b) => Battlefield.gap(here, a) - Battlefield.gap(here, b))[0];
        if (!near || Battlefield.gap(here, near) > c.runMeters() + 2) { return; }
        const from: Point = {x: here.x, y: here.y};
        const foe = foes.filter((f) => f.canFight())[0];
        const d = foe ? Battlefield.gap(near, {x: foe.position.x, y: foe.position.y}) || 1 : 1;
        const hug: Point = foe
            ? {x: near.x + (near.x - foe.position.x) / d * 2, y: near.y + (near.y - foe.position.y) / d * 2}
            : {x: near.x + 2, y: near.y};
        const moved = Battlefield.stepToward(c, hug, c.runMeters(), others);
        if (moved >= 1) {
            this.events.push({kind: "move", actor: c, from,
                to: {x: c.position.x, y: c.position.y}, cover: Battlefield.nearCover(c.position)});
        }
    }

    /**
     * Morale (house rule): once the wave has lost half its people, each
     * survivor checks its nerve exactly once — d10 + WILL (+4 for rank 3+)
     * against 13. Berserkers and full-chrome never break.
     */
    private static moraleBreaks(c: Actor, enemies: Actor[]): boolean {
        // the app prunes the fallen from its live list — measure against the
        // wave's original headcount, not whoever is still standing
        const wave: number = Math.max(Battlefield.WAVE, enemies.length);
        if (c.moraleTested || wave < 2) { return false; }
        const living: number = enemies.filter((e) => e.canFight()).length;
        if (wave - living < Math.ceil(wave / 2)) { return false; }
        c.moraleTested = true;
        if (c.temperament === "berserker" || c.faction === "Chrome" || c.faction === "Cyberpsycho") { return false; }
        const roll: number = Math.floor(Math.random() * 10) + 1;
        return roll + c.stats.will + ((c.rank || 1) >= 3 ? 4 : 0) < 13;
    }

    /** One full round with both sides played by the tactical AI. */
    public static autoRound(party: Actor[], enemies: Actor[]): any {
        return this.round(party, enemies);
    }

    /**
     * One full round, resolved instantly (headless sim / legacy callers). If
     * `controlled`/`action` are given, that unit performs the supplied action
     * on its turn; everyone else is driven by the tactical AI.
     */
    public static round(party: Actor[], enemies: Actor[], controlled?: Actor, action?: any): any {
        let out: any[] = [];
        for (const c of this.beginRound(party, enemies)) {
            if (!c.alive) { continue; }
            const manual = c === controlled && action ? action : undefined;
            // newest turn first, matching the feed's newest-first ordering
            out = this.takeTurn(c, party, enemies, manual).messages.concat(out);
        }
        return out;
    }

    /** House rule: a laser-locked sniper shot is steadied — the paint turn pays off. */
    public static readonly MARK_BONUS: number = 5;

    /** Rounds a trigger pull costs: a full burst on autofire, else the volley. */
    private static ammoCost(a: Actor, aimed: boolean): number {
        if (a.weapon.autofire) { return 10; }
        return aimed ? 1 : Math.max(1, Math.min(a.weapon.rateOfFire || 1, 3));
    }

    /** True when the magazine can't feed the shot the plan calls for. */
    private static needsReload(a: Actor, aimed: boolean): boolean {
        if (a.weapon.weaponClass === "melee" || a.weapon.shots <= 0 || a.mag >= 900) { return false; }
        return a.mag < this.ammoCost(a, aimed);
    }

    /**
     * Rank-5 signature moves, fired once per battle when their trigger lines up.
     * Returns true when the ability consumed the turn.
     */
    private static bossAbility(self: Actor, foes: Actor[], others: Actor[]): boolean {
        if ((self.rank || 0) < 5 || !self.ability || self.abilityUsed) { return false; }
        const live = foes.filter((f) => f.canFight());
        if (!live.length) { return false; }
        const here: Point = {x: self.position.x, y: self.position.y};
        const nearest = live.reduce((a, b) =>
            Battlefield.gap(here, {x: a.position.x, y: a.position.y})
            < Battlefield.gap(here, {x: b.position.x, y: b.position.y}) ? a : b);
        const gap = Battlefield.gap(here, {x: nearest.position.x, y: nearest.position.y});

        if (self.ability === "leap" && gap >= 5 && gap <= 20) {
            // crashing leap: land on the target, slam everything around the crater
            self.abilityUsed = true;
            Battlefield.stepToward(self, {x: nearest.position.x, y: nearest.position.y}, 99, others);
            const at: Point = {x: self.position.x, y: self.position.y};
            this.events.push({kind: "ability", actor: self, name: "leap", to: at});
            this.messages.push(new MessageStr(`${self.name} leaps — the street cracks.`));
            const victims: BlastVictim[] = [];
            for (const t of live) {
                if (Battlefield.gap({x: t.position.x, y: t.position.y}, at) > 3.5) { continue; }
                let dmg = 0;
                for (let i = 0; i < 3; i++) { dmg += Math.floor(Math.random() * 6) + 1; }
                const dealt: number = t.receiveDamage(dmg, true);
                BattleRecorder.countDamage(self, t, dealt);
                victims.push({target: t, damage: dealt, dodged: false, dropped: !t.canFight()});
                this.messages.push(new MessageStr(`${t.name} takes ${dealt} from the slam.`));
                this.registerIfDefeated(self, t);
            }
            this.events.push({kind: "blast", actor: self, at, radius: 3.5, gtype: "slam", victims});
            return true;
        }
        if (self.ability === "volley" && !this.needsReload(self, false)) {
            // double tap: two disciplined attacks on the same target in one action
            self.abilityUsed = true;
            this.events.push({kind: "ability", actor: self, name: "volley"});
            this.messages.push(new MessageStr(`${self.name} opens up — sustained fire.`));
            this.attack(self, nearest);
            if (nearest.canFight()) { this.attack(self, nearest); }
            return true;
        }
        return false;
    }

    /** Apply a tactical plan: move, then the turn's one action (throw / hack / suppress / stabilize / attack). */
    private static applyPlan(self: Actor, plan: Plan, foes: Actor[], allies: Actor[], others: Actor[]): void {
        if (plan.moveTo) {
            const before: number = this.nearestFoeGap(self, foes);
            const from: Point = {x: self.position.x, y: self.position.y};
            // sprint (house rule): melee trades its attack for a double move, so
            // Bruisers stop getting kited across the whole street
            const reach: number = self.runMeters() * (plan.sprint ? 2 : 1);
            const moved: number = Battlefield.stepToward(self, plan.moveTo, reach, others);
            if (moved >= 1) {
                const after: number = this.nearestFoeGap(self, foes);
                const inCover: boolean = Battlefield.nearCover(self.position);
                this.events.push({kind: "move", actor: self, from,
                    to: {x: self.position.x, y: self.position.y}, cover: inCover,
                    ...(plan.sprint ? {sprint: true} : {})});
                const verb: string = plan.sprint ? "sprints in" : inCover ? "takes cover"
                    : after < before - 0.5 ? "advances" : after > before + 0.5 ? "falls back" : "repositions";
                this.messages.push(new MessageStr(`${self.name} ${verb} (${Math.round(after)}m).`));
            }
        }
        if (plan.sprint) { return; }   // the sprint IS the turn — no attack
        if (plan.stabilizeTarget) {
            this.stabilizeAlly(self, plan.stabilizeTarget);
            return;
        }
        if (plan.hackTarget && plan.hackTarget.canFight()) {
            this.quickhack(self, plan.hackTarget);
            return;
        }
        if (plan.suppressTarget && plan.suppressTarget.canFight()) {
            this.suppress(self, plan.suppressTarget);
            return;
        }
        if (plan.markTarget && plan.markTarget.canFight()) {
            // sniper telegraph: paint the target this turn, fire the steadied shot next
            self.marking = plan.markTarget;
            // the paint is a squad asset now: everyone hits a marked target harder,
            // not just the sniper who called it
            this.afflict(self, plan.markTarget, "marked", 2);
            this.events.push({kind: "mark", actor: self, target: plan.markTarget});
            this.messages.push(new MessageStr(`${self.name} paints ${plan.markTarget.name} with a laser.`));
            return;
        }
        if (plan.grenadeAt) {
            this.throwGrenade(self, plan.grenadeAt, foes, allies, plan.grenadeType || "frag");
            return;   // the throw is the turn's attack
        }
        if (plan.target && plan.target.canFight()) {
            // dry magazine: the trigger clicks and the turn becomes the reload
            if (this.needsReload(self, !!plan.aimed)) {
                self.mag = self.weapon.shots;
                this.events.push({kind: "reload", actor: self});
                this.messages.push(new MessageStr(`${self.name} reloads.`));
                return;
            }
            if (self.weapon.weaponClass !== "melee" && self.mag < 900) {
                self.mag = Math.max(0, self.mag - this.ammoCost(self, !!plan.aimed));
            }
            const locked: boolean = self.marking === plan.target;
            self.marking = null;   // firing (at anyone) burns the lock
            this.attack(self, plan.target, plan.aimed, locked ? Combat.MARK_BONUS : 0);
        }
    }

    /** Field medicine: stop the bleeding; drag the dying back to their feet at 1 HP. */
    private static stabilizeAlly(self: Actor, target: Actor): void {
        if (Battlefield.distance(self, target) > 3.5) { return; }
        const saved: boolean = target.alive && target.mortallyWounded;
        target.bleeding = 0;
        if (saved) { target.stabilize(); }
        this.events.push({kind: "stabilize", actor: self, target, saved, hp: target.health});
        this.messages.push(new MessageStr(saved
            ? `${self.name} drags ${target.name} back from the brink.`
            : `${self.name} patches ${target.name} up.`));
    }

    /** Netrunner Short Circuit: burn a chromed target's systems — armour means nothing. */
    private static quickhack(self: Actor, target: Actor): void {
        self.hackCooldown = 3;   // this turn + the next two
        const margin: number = Check.redRoll() + self.interfaceRank() + 4
            - (Check.redRoll() + target.stats.will);
        let dmg = 0;
        for (let i = 0; i < 3; i++) { dmg += Math.floor(Math.random() * 6) + 1; }
        if (margin < 0) { dmg = Math.ceil(dmg / 2); }   // partial breach still hurts
        const dealt: number = target.directDamage(dmg);
        const stunned: boolean = margin >= 4 && target.canFight();
        this.afflict(self, target, "fried", 2);
        if (stunned) { this.afflict(self, target, "stunned", 1); }
        BattleRecorder.countShot(self, dealt > 0);
        BattleRecorder.countDamage(self, target, dealt);
        this.events.push({kind: "hack", actor: self, target, damage: dealt, stunned,
            dropped: !target.canFight()});
        this.messages.push(new MessageStr(
            `${self.name} shorts ${target.name}'s chrome — ${dealt} damage${stunned ? ", systems locked" : ""}.`));
        this.registerIfDefeated(self, target);
    }

    /** Suppressive fire: a whole magazine of noise. An opposed check pins the target. */
    private static suppress(self: Actor, target: Actor): void {
        self.mag = Math.max(0, self.mag - 10);
        const pinned: boolean = Check.opposed(self,
            self.stats.ref + self.skillFor(self.weapon), target.stats.will).success;
        if (pinned) { this.afflict(self, target, "suppressed", 2); }
        this.events.push({kind: "suppress", actor: self, target, pinned});
        this.messages.push(new MessageStr(pinned
            ? `${self.name} hoses ${target.name}'s position — pinned.`
            : `${self.name} hoses ${target.name}'s position — they hold steady.`));
    }

    /**
     * Typed ordnance at `at` — frags maim, smoke hides, flashbangs stun, EMP
     * burns chrome. Frags also level nearby street furniture, and a caught car
     * goes up in a secondary explosion. (House rules, simpler than tabletop.)
     */
    public static throwGrenade(self: Actor, at: Point, foes: Actor[], allies: Actor[],
                               type: BlastType = "frag"): void {
        const belt: {[k: string]: number} = {
            frag: self.grenades, smoke: self.smokes, flash: self.flashes, emp: self.emps};
        if ((belt[type] || 0) <= 0) { return; }
        const from: Point = {x: self.position.x, y: self.position.y};
        const target: Point = Battlefield.gap(from, at) <= GRENADE_RANGE ? at
            : (() => {   // over-arm throws fall short along the line
                const g = Battlefield.gap(from, at);
                return {x: from.x + (at.x - from.x) * (GRENADE_RANGE / g),
                        y: from.y + (at.y - from.y) * (GRENADE_RANGE / g)};
            })();
        if (type === "frag") { self.grenades -= 1; }
        else if (type === "smoke") { self.smokes -= 1; }
        else if (type === "flash") { self.flashes -= 1; }
        else { self.emps -= 1; }

        if (type === "smoke") {
            Battlefield.addSmoke(target);
            // fresh smoke breaks every laser lock painted through it
            [...foes, ...allies].forEach((a) => {
                if (a.marking && Battlefield.inSmoke({x: a.marking.position.x, y: a.marking.position.y})) {
                    a.marking = null;
                }
            });
            this.events.push({kind: "blast", actor: self, at: target,
                radius: Battlefield.SMOKE[Battlefield.SMOKE.length - 1]!.r, gtype: "smoke", victims: []});
            this.messages.push(new MessageStr(`${self.name} pops smoke.`));
            return;
        }

        const radius: number = type === "flash" ? FLASH_RADIUS : type === "emp" ? EMP_RADIUS : BLAST_RADIUS;
        const victims: BlastVictim[] = [];
        for (const t of [...allies, ...foes]) {
            if (!t.canFight()) { continue; }
            if (Battlefield.gap({x: t.position.x, y: t.position.y}, target) > radius) { continue; }
            if (type === "flash") {
                // no wounds, just a white wall of noise: WILL check or lose the turn
                const held: boolean = Check.redRoll() + t.stats.will >= 13;
                if (!held) {
                    this.afflict(self, t, "blinded", 2);
                    this.afflict(self, t, "stunned", 1);
                }
                victims.push({target: t, damage: 0, dodged: held, dropped: false, stunned: !held});
                this.messages.push(new MessageStr(held
                    ? `${t.name} shakes off the flash.` : `${t.name} is blinded — stunned.`));
                continue;
            }
            if (type === "emp") {
                if (!t.chromed()) {
                    this.messages.push(new MessageStr(`${t.name} rides out the EMP — no chrome to fry.`));
                    continue;
                }
                let dmg = 0;
                for (let i = 0; i < 3; i++) { dmg += Math.floor(Math.random() * 6) + 1; }
                const dealt: number = t.directDamage(dmg);   // straight through the armour
                // the point of an EMP is not the damage: their chrome goes dark
                this.afflict(self, t, "fried", 3);
                const stunned: boolean = t.canFight() && Check.redRoll() + t.stats.will < 15;
                if (stunned) { this.afflict(self, t, "stunned", 1); }
                BattleRecorder.countShot(self, dealt > 0);
                BattleRecorder.countDamage(self, t, dealt);
                victims.push({target: t, damage: dealt, dodged: false, dropped: !t.canFight(), stunned});
                this.messages.push(new MessageStr(`${t.name}'s chrome arcs — ${dealt} damage.`));
                if (foes.indexOf(t) >= 0) { this.registerIfDefeated(self, t); }
                continue;
            }
            // frag
            let dmg = 0;
            for (let i = 0; i < 6; i++) { dmg += Math.floor(Math.random() * 6) + 1; }
            const dodged: boolean = Check.redRoll() + t.evasion() >= 15;   // dive clear for half
            if (dodged) { dmg = Math.ceil(dmg / 2); }
            const dealt: number = t.receiveDamage(dmg, true);   // blasts halve armour (ap path)
            BattleRecorder.countShot(self, dealt > 0);
            BattleRecorder.countDamage(self, t, dealt);
            victims.push({target: t, damage: dealt, dodged, dropped: !t.canFight()});
            this.messages.push(new MessageStr(
                `${t.name} ${dodged ? "dives clear — " : ""}takes ${dealt} blast damage.`));
            if (dealt > 0 && !dodged) { this.afflict(self, t, "bleed", 2); }   // shrapnel opens people up
            this.rollCrit(t, dealt);
            if (foes.indexOf(t) >= 0) { this.registerIfDefeated(self, t); }
        }
        this.events.push({kind: "blast", actor: self, at: target, radius, gtype: type, victims});
        this.messages.push(new MessageStr(`${self.name} lobs ${type === "frag" ? "a frag grenade"
            : type === "flash" ? "a flashbang" : "an EMP charge"}.`));

        // frags rearrange the street: caught cover is destroyed, cars go up
        if (type === "frag") {
            const gone = Battlefield.destroyCoverNear(target, BLAST_RADIUS * 0.75);
            for (const c of gone) {
                const exploded: boolean = c.kind === "car";
                this.events.push({kind: "coverGone", at: {x: c.x, y: c.y}, ckind: c.kind, exploded});
                this.messages.push(new MessageStr(exploded
                    ? "The wrecked car goes up in a fireball!" : `The ${c.kind} is blown apart.`));
                if (exploded) { this.carExplosion(self, c, foes, allies); }
            }
        }
    }

    /** Secondary boom when a frag catches a car: 3d6 armour-halved in a tight radius. */
    private static carExplosion(self: Actor, at: Point, foes: Actor[], allies: Actor[]): void {
        const victims: BlastVictim[] = [];
        for (const t of [...allies, ...foes]) {
            if (!t.canFight()) { continue; }
            if (Battlefield.gap({x: t.position.x, y: t.position.y}, at) > 4.5) { continue; }
            let dmg = 0;
            for (let i = 0; i < 3; i++) { dmg += Math.floor(Math.random() * 6) + 1; }
            const dealt: number = t.receiveDamage(dmg, true);
            BattleRecorder.countDamage(self, t, dealt);
            victims.push({target: t, damage: dealt, dodged: false, dropped: !t.canFight()});
            this.messages.push(new MessageStr(`${t.name} is caught in the fireball — ${dealt} damage.`));
            if (foes.indexOf(t) >= 0) { this.registerIfDefeated(self, t); }
        }
        this.events.push({kind: "blast", actor: self, at: {x: at.x, y: at.y}, radius: 4.5, gtype: "car", victims});
    }

    private static nearestFoeGap(self: Actor, foes: Actor[]): number {
        return foes.filter((f) => f.canFight())
            .reduce((m, f) => Math.min(m, Battlefield.distance(self, f)), Infinity);
    }
}
