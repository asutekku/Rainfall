import {Actor} from "../actors/Actor";
import {Utils} from "../utils/utils";
import en_US from "./../../lang/en_US";
import {GetItem} from "./getItem";
import {Messages} from "./messages";
import {DeathMessage, DodgeMessage, IDefaultMessage, MessageStr} from "./messageSchema";
import {Skill} from "../items/Skill";
import {rangeDV} from "./rangeTable";
import {Check} from "./check";
import {BLAST_RADIUS, Battlefield, GRENADE_RANGE, Point} from "./battlefield";
import {TacticalAI, Plan} from "./tacticalAI";
import {Economy} from "./economy";
import {BattleRecorder} from "./battleReport";
import {BattleEvent, BlastVictim, TurnResult} from "./battleEvents";

const Log = en_US.Log;

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
        // Reset per-round Combat Awareness trackers (first hit, deflection).
        actor.firstHitDone = false; actor.deflectionUsed = false;
        target.firstHitDone = false; target.deflectionUsed = false;
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

    public static attack(actor: Actor, target: Actor, aimed: boolean = false): any {
        const weapon = actor.weapon;
        const distance: number = Utils.distance(actor.position, target.position);
        if (weapon.autofire && weapon.weaponClass !== "melee") {
            this.autofireAttack(actor, target, distance);   // RED: autofire can't make an Aimed Shot
            return;
        }
        const melee: boolean = weapon.weaponClass === "melee";
        const covered: boolean = !melee && Battlefield.coverPenaltyAt(target.position, actor.position) > 0;
        // rounds leaving the barrel, for the tracer animation (RED aimed shots are single, careful rounds)
        const rounds: number = melee || aimed ? 1 : Math.max(1, Math.min(weapon.rateOfFire || 1, 3));
        if (!melee && rangeDV(weapon.weaponClass, distance) === null) {
            this.events.push({kind: "noshot", actor});
            this.messages.push(new MessageStr(`${actor.name}: no shot — out of range.`));
            return;
        }
        this.stats.shots += 1; if (aimed) { this.stats.aimed += 1; }
        const targetOldHP: number = target.health;
        if (!this.didAttackHit(actor, target, distance, aimed)) {
            BattleRecorder.countShot(actor, false);
            this.events.push({kind: "shot", actor, target, hit: false, damage: 0, aimed,
                autofire: false, melee, covered, dropped: false, rounds});
            this.messages.push(new MessageStr(aimed ? 'MISS! (aimed)' : 'MISS!'));
            return;
        }
        this.stats.hits += 1;
        BattleRecorder.countShot(actor, true);
        let damage: number = weapon.getDamage();
        if (damage > 0) {
            damage += this.spotWeakness(actor);   // Solo "Spot Weakness" (first hit only)
            damage += actor.backupDamage();        // Cop "Backup" support fire
        }
        const dealt: number = target.receiveDamage(damage, weapon.ap, aimed);
        this.stats.dmg += dealt;
        BattleRecorder.countDamage(actor, target, dealt);
        this.events.push({kind: "shot", actor, target, hit: true, damage: dealt, aimed,
            autofire: false, melee, covered, dropped: !target.canFight(), rounds});
        this.messages.push(Messages.getCombatMessage(actor, target, targetOldHP, dealt));
        if (aimed && dealt > 0) { this.messages.push(new MessageStr(`${actor.name} lands a head shot!`)); }
        this.registerIfDefeated(actor, target);
    }

    /** RED Combat Awareness "Spot Weakness": bonus damage on the round's first hit. */
    private static spotWeakness(actor: Actor): number {
        if (actor.firstHitDone) {
            return 0;
        }
        actor.firstHitDone = true;
        return actor.spotWeaknessBonus();
    }

    /**
     * RED autofire: a single Autofire check; on a hit, damage is 2d6 multiplied
     * by the amount the check beat the DV, capped by the weapon's autofire
     * rating (x3 for SMGs, x4 for assault rifles). Both dice reading 6 is a
     * Critical Injury (+5 damage).
     */
    private static autofireAttack(actor: Actor, target: Actor, distance: number): void {
        const dv: number | null = rangeDV(actor.weapon.weaponClass, distance);
        if (dv === null) {
            this.events.push({kind: "noshot", actor});
            this.messages.push(new MessageStr('OUT OF RANGE'));
            return;
        }
        const cover: number = Battlefield.coverPenaltyAt(target.position, actor.position);
        this.stats.shots += 1;
        const check = Check.resolve(actor, actor.attackBonus(actor.weapon), dv + cover);
        if (!check.success) {
            BattleRecorder.countShot(actor, false);
            this.events.push({kind: "shot", actor, target, hit: false, damage: 0, aimed: false,
                autofire: true, melee: false, covered: cover > 0, dropped: false, rounds: 5});
            this.messages.push(new MessageStr('MISS!'));
            return;
        }
        this.stats.hits += 1;
        BattleRecorder.countShot(actor, true);
        const maxMultiplier: number = actor.weapon.weaponClass === "rifle" ? 4 : 3;
        const multiplier: number = Math.max(1, Math.min(check.margin, maxMultiplier));
        const d1: number = Math.floor(Math.random() * 6) + 1;
        const d2: number = Math.floor(Math.random() * 6) + 1;
        let damage: number = (d1 + d2) * multiplier + this.spotWeakness(actor);
        if (d1 === 6 && d2 === 6) {
            damage += 5; // Critical Injury
        }
        const targetOldHP: number = target.health;
        const dealt: number = target.receiveDamage(damage, actor.weapon.ap);
        this.stats.dmg += dealt;
        BattleRecorder.countDamage(actor, target, dealt);
        this.events.push({kind: "shot", actor, target, hit: true, damage: dealt, aimed: false,
            autofire: true, melee: false, covered: cover > 0, dropped: !target.canFight(), rounds: 5});
        this.messages.push(Messages.getCombatMessage(actor, target, targetOldHP, dealt));
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
        if (!target.canFight()) {
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

    /**
     * Cyberpunk RED attack resolution. Melee is an opposed check against the
     * target's evasion; ranged compares the attack roll to the weapon's DV for
     * its class at the current distance (out of range = automatic miss).
     */
    private static didAttackHit(actor: Actor, target: Actor, distance: number, aimed: boolean = false): boolean {
        const weapon = actor.weapon;
        const atkMod: number = actor.attackBonus(weapon) + (aimed ? -8 : 0);   // RED Aimed Shot: -8 to hit
        if (weapon.weaponClass === "melee") {
            return Check.opposed(actor, atkMod, target.evasion()).success;
        }
        const dv: number | null = rangeDV(weapon.weaponClass, distance);
        if (dv === null) {
            return false; // target beyond the weapon's effective range
        }
        const cover: number = Battlefield.coverPenaltyAt(target.position, actor.position);
        return Check.resolve(actor, atkMod, dv + cover).success;
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
        const all: Actor[] = [...party, ...enemies].filter((a) => a.canFight() || a.mortallyWounded);
        all.forEach((a) => { a.firstHitDone = false; a.deflectionUsed = false; });
        return all
            .map((a) => ({a, init: a.rollInitiative()}))
            .sort((x, y) => y.init - x.init)
            .map((o) => o.a);
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
        } else if (c.canFight()) {
            const foes: Actor[] = side === "party" ? enemies : party;
            const allies: Actor[] = side === "party" ? party : enemies;
            const others: Actor[] = [...party, ...enemies].filter((a) => a !== c);
            const plan: Plan = order
                ? {moveTo: order.moveTo, target: order.target, aimed: order.aimed,
                   grenadeAt: order.grenadeAt, label: "manual"}
                : TacticalAI.plan(c, allies, foes);
            this.applyPlan(c, plan, foes, allies, others);
        }
        return {events: this.events, messages: this.messages.flat().reverse()};
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

    /** Apply a tactical plan: move (if any), then throw a frag or attack the chosen target. */
    private static applyPlan(self: Actor, plan: Plan, foes: Actor[], allies: Actor[], others: Actor[]): void {
        if (plan.moveTo) {
            const before: number = this.nearestFoeGap(self, foes);
            const from: Point = {x: self.position.x, y: self.position.y};
            const moved: number = Battlefield.stepToward(self, plan.moveTo, self.runMeters(), others);
            if (moved >= 1) {
                const after: number = this.nearestFoeGap(self, foes);
                const inCover: boolean = Battlefield.nearCover(self.position);
                this.events.push({kind: "move", actor: self, from,
                    to: {x: self.position.x, y: self.position.y}, cover: inCover});
                const verb: string = inCover ? "takes cover"
                    : after < before - 0.5 ? "advances" : after > before + 0.5 ? "falls back" : "repositions";
                this.messages.push(new MessageStr(`${self.name} ${verb} (${Math.round(after)}m).`));
            }
        }
        if (plan.grenadeAt && (self.grenades || 0) > 0) {
            this.throwGrenade(self, plan.grenadeAt, foes, allies);
            return;   // the throw is the turn's attack
        }
        if (plan.target && plan.target.canFight()) {
            this.attack(self, plan.target, plan.aimed);
        }
    }

    /**
     * A frag goes off at `at`: every fighter inside the blast radius — friend
     * or foe — takes 6d6 with armour halved; a reflex check dives for half.
     * (House rule, deliberately simpler than tabletop RED.)
     */
    public static throwGrenade(self: Actor, at: Point, foes: Actor[], allies: Actor[]): void {
        if ((self.grenades || 0) <= 0) { return; }
        const from: Point = {x: self.position.x, y: self.position.y};
        const target: Point = Battlefield.gap(from, at) <= GRENADE_RANGE ? at
            : (() => {   // over-arm throws fall short along the line
                const g = Battlefield.gap(from, at);
                return {x: from.x + (at.x - from.x) * (GRENADE_RANGE / g),
                        y: from.y + (at.y - from.y) * (GRENADE_RANGE / g)};
            })();
        self.grenades -= 1;
        const victims: BlastVictim[] = [];
        for (const t of [...allies, ...foes]) {
            if (!t.canFight()) { continue; }
            if (Battlefield.gap({x: t.position.x, y: t.position.y}, target) > BLAST_RADIUS) { continue; }
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
            if (foes.indexOf(t) >= 0) { this.registerIfDefeated(self, t); }
        }
        this.events.push({kind: "blast", actor: self, at: target, radius: BLAST_RADIUS, victims});
        this.messages.push(new MessageStr(`${self.name} lobs a frag grenade.`));
    }

    private static nearestFoeGap(self: Actor, foes: Actor[]): number {
        return foes.filter((f) => f.canFight())
            .reduce((m, f) => Math.min(m, Battlefield.distance(self, f)), Infinity);
    }
}
