import {Actor} from "../actors/Actor";
import {Purse} from "./crew";
import {Check} from "./check";
import {Chrome} from "./chrome";
import Equipment from "../items/Equipment";
import {Medical} from "../items/Scrap";
import {EncounterSpec} from "./runMap";

/**
 * Street encounters — the ❓ nodes of a run. Slay-the-Spire-style events with
 * real choices: every option costs, gambles, or gates on who your crew is.
 * Checks use the RED d10 (exploding/fumbling) + a STAT, and Luck auto-tops-up
 * a near miss (Check.resolve), so a lucky crew literally gets luckier streets.
 *
 * Pure data + logic, no React/three — headless-testable.
 */

export type StatKey = "cool" | "int" | "tech" | "ref" | "emp";

export interface EventCtx {
    party: Actor[];
    leader: Actor;                       // the crew's face — pays the bills
    best: (stat: StatKey) => Actor;      // who steps up for a check
}

export interface EventOutcome {
    lines: string[];
    combat?: EncounterSpec | undefined;  // some choices end in gunfire
    reveal?: number | undefined;         // intel: uncover N fog-of-war waypoints
    restoreRevive?: boolean | undefined; // re-arm the per-run Trauma Team pickup
}

export interface EventCheck { stat: StatKey; dv: number; label: string; tag?: "toxin"; }

export interface EventOption {
    label: string;
    detail?: string;
    /** Non-null return = why this option is unavailable (greyed with reason). */
    req?: (ctx: EventCtx) => string | null;
    check?: EventCheck;
    run: (ctx: EventCtx, success: boolean, luckSpent: number) => EventOutcome;
}

export interface GameEvent {
    id: string;
    title: string;
    flavor: string;
    options: EventOption[];
}

// ------------------------------------------------------------------ helpers --

const statOf = (a: Actor, s: StatKey): number =>
    s === "cool" ? a.stats.cl : s === "int" ? a.stats.int : s === "tech" ? a.stats.tech
        : s === "ref" ? a.stats.ref : a.stats.emp;

/** Standard ctx for a party: the leader pays, the best-stat member steps up. */
export function makeCtx(party: Actor[]): EventCtx {
    return {
        party, leader: party[0]!,
        best: (stat) => party.reduce((b, p) =>
            p.canFight() && statOf(p, stat) > statOf(b, stat) ? p : b, party[0]!),
    };
}

/** Approximate odds of d10+stat >= dv, for showing on the button. */
export function odds(actor: Actor, check: EventCheck): number {
    if (autoPasses(actor, check)) { return 100; }
    const p = (11 - (check.dv - statOf(actor, check.stat) - faceBonus(actor, check))) * 10;
    return Math.max(5, Math.min(95, p));
}

export interface CheckResult { success: boolean; luckSpent: number; roll: number; total: number; stat: number; }

/**
 * Everything that skews a check besides the raw stat:
 * - COOL: Rockerboy fame / intimidating chrome (facedownBonus).
 * - INT/TECH: Chipware skill chips; a Polychip Array covers every stat.
 * - toxin-tagged: Toxin Binders' filtration bonus.
 * - COOL/EMP: below 20 Humanity the street can smell the chrome — the
 *   cyberpsychosis fear line, −2 on every social read.
 */
export function faceBonus(actor: Actor, check: EventCheck): number {
    let mod = check.stat === "cool" ? actor.facedownBonus() : 0;
    const chip = actor.chromeNum("checkBonus");
    if (chip > 0 && (actor.chromeHas("checkAllStats") || check.stat === "int" || check.stat === "tech")) {
        mod += chip;
    }
    if (check.tag === "toxin") { mod += actor.chromeNum("toxinCheckBonus"); }
    if (actor.humanity < 20 && (check.stat === "cool" || check.stat === "emp")) { mod -= 2; }
    return mod;
}

/** Toxin Binders Mk.II+: a poison/drug check simply doesn't apply to this body. */
export function autoPasses(actor: Actor, check: EventCheck): boolean {
    return check.tag === "toxin" && actor.chromeHas("toxinImmune");
}

export function rollCheck(actor: Actor, check: EventCheck): CheckResult {
    const stat = statOf(actor, check.stat) + faceBonus(actor, check);
    if (autoPasses(actor, check)) {
        return {success: true, luckSpent: 0, roll: 10, total: stat + 10, stat};
    }
    const res = Check.resolve(actor, stat, check.dv);
    return {success: res.success, luckSpent: res.luckSpent, roll: res.roll, total: res.total, stat};
}

const healPct = (a: Actor, pct: number): number => a.heal(Math.floor(a.maxHealth * pct));

/** Event damage never kills outright — the street leaves you at 1 HP, bleeding. */
const hurt = (a: Actor, n: number): number => {
    const dealt = Math.min(n, Math.max(0, a.health - 1));
    a.health -= dealt;
    return dealt;
};

const d6 = (n: number): number => {
    let t = 0;
    for (let i = 0; i < n; i++) { t += ((Math.random() * 6) << 0) + 1; }
    return t;
};

const hum = (a: Actor, delta: number): void => a.shiftHumanity(delta);

const pay = (ctx: EventCtx, eddies: number): boolean => Purse.spend(ctx.leader, eddies);

const needEddies = (n: number) => (ctx: EventCtx): string | null =>
    Purse.canAfford(ctx.leader, n) ? null : `need ${n}¥`;

/** Scav-clinic pricing: the back alley runs at 60% of the ripperdoc counter. */
const clinicPrice = (cost: number): number => Math.max(10, Math.ceil(cost * 0.6));

/** A random kinetic weapon in a rarity band, into the actor's stash. */
const grantWeapon = (a: Actor, rMin: number, rMax: number): string => {
    const pool = Equipment.weapons.filter((w) =>
        w.damageType === "kinetic" && w.cost > 0 && w.rarity >= rMin && w.rarity <= rMax);
    const w = pool[(Math.random() * pool.length) << 0]!.clone();
    w.equipped = false;
    a.inventory.weapons.push(w);
    return w.name;
};

const first = (party: Actor[]): Actor => party.find((p) => p.canFight()) || party[0]!;

// ------------------------------------------------------------------- events --

export const EVENTS: GameEvent[] = [

    // ---- doctors & flesh ----
    {
        id: "ripperdoc", title: "Scav Clinic",
        flavor: "A basement clinic behind a noodle stall. The doc's hands are chrome to the elbow, the prices are too good, and the anaesthetic is optional.",
        options: [
            {
                label: "Discount install — dirty chair, +1 Humanity", detail: "60% price · TECH check or the install gets messy",
                req: (ctx) => {
                    const offer = Chrome.cheapestInstall(ctx.leader);
                    if (!offer) { return Chrome.canInstall(ctx.leader) ? "nothing left to fit" : "the doc won't touch a cyberpsycho"; }
                    return Purse.canAfford(ctx.leader, clinicPrice(offer.cost)) ? null : `need ${clinicPrice(offer.cost)}¥`;
                },
                check: {stat: "tech", dv: 12, label: "watch the doc's work"},
                run: (ctx, ok) => {
                    const a = ctx.leader;
                    const offer = Chrome.cheapestInstall(a);
                    if (!offer) { return {lines: ["The doc shrugs. Nothing on the shelf fits you."]}; }
                    pay(ctx, clinicPrice(offer.cost));
                    const cw = Chrome.install(a, offer.line.id, ok ? 1 : 2);
                    if (!cw) { return {lines: ["The doc shrugs. Nothing on the shelf fits you."]}; }
                    if (ok) { return {lines: [`The doc slots a ${cw.name}. Clean enough work, for the price (−${offer.hl + 1} Humanity).`]}; }
                    const dmg = hurt(a, d6(2));
                    return {lines: [`The doc slots a ${cw.name} — badly. ${a.name} loses ${dmg} HP and a little extra of themselves (−${offer.hl + 2} Humanity).`]};
                },
            },
            {
                label: "Discount upgrade — dirty chair, +1 Humanity", detail: "half the ripperdoc's rate",
                req: (ctx) => {
                    const offer = Chrome.cheapestUpgrade(ctx.leader);
                    if (!offer) { return Chrome.canInstall(ctx.leader) ? "nothing to upgrade" : "the doc won't touch a cyberpsycho"; }
                    return Purse.canAfford(ctx.leader, clinicPrice(offer.cost)) ? null : `need ${clinicPrice(offer.cost)}¥`;
                },
                run: (ctx) => {
                    const a = ctx.leader;
                    const offer = Chrome.cheapestUpgrade(a);
                    if (!offer) { return {lines: ["Nothing on you is worth the doc's time."]}; }
                    pay(ctx, clinicPrice(offer.cost));
                    const cw = Chrome.upgrade(a, offer.line.id, 1);
                    return {lines: [cw
                        ? `The doc tunes it up: ${cw.name} (−${offer.hl + 1} Humanity).`
                        : "The doc waves you off the chair."]};
                },
            },
            {
                label: "Extract chrome — recover Humanity",
                req: (ctx) => ctx.leader.cybernetics.length > 0 ? null : "nothing to spare",
                run: (ctx) => {
                    const a = ctx.leader;
                    const cw = Chrome.extract(a);
                    return {lines: [cw
                        ? `The ${cw.name} comes out. ${a.name} feels more like a person again (+${cw.humanityLoss + 4} Humanity).`
                        : "Nothing to take out."]};
                },
            },
            {label: "Walk away", run: () => ({lines: ["Some other night."]})},
        ],
    },
    {
        id: "medtech", title: "Street Medtech",
        flavor: "A med-tent glowing white in an alley. The tech is licensed. Her student is… enthusiastic.",
        options: [
            {
                label: "Full patch-up — 180¥",
                req: needEddies(180),
                run: (ctx) => {
                    pay(ctx, 180);
                    ctx.party.forEach((p) => healPct(p, 1));
                    return {lines: ["Stitched, stapled, dermal-glued. The squad walks out whole."]};
                },
            },
            {
                label: "Free care from the student", detail: "COOL check to sit still",
                check: {stat: "cool", dv: 12, label: "grit teeth"},
                run: (ctx, ok) => {
                    if (ok) {
                        ctx.party.forEach((p) => healPct(p, 0.5));
                        return {lines: ["The student's shaky, but the work holds. Half the damage, gone."]};
                    }
                    const a = first(ctx.party);
                    const dmg = hurt(a, d6(1));
                    ctx.party.forEach((p) => healPct(p, 0.25));
                    return {lines: [`Slipped scalpel — ${a.name} takes ${dmg} extra before the patch job sticks.`]};
                },
            },
            {label: "Move on", run: () => ({lines: ["No time to bleed."]})},
        ],
    },
    {
        id: "maxdoc", title: "Ex-Corpo Doc Selling MaxDocs",
        flavor: "Trauma Team jacket, no Trauma Team ID. The case of MaxDoc injectors looks genuine. Mostly.",
        options: [
            {
                label: "Buy the case — 120¥, squad heals 30%",
                req: needEddies(120),
                run: (ctx) => {
                    pay(ctx, 120);
                    ctx.party.forEach((p) => healPct(p, 0.3));
                    return {lines: ["The injectors hiss. Warmth spreads. Genuine after all."]};
                },
            },
            {
                label: "Haggle him down", detail: "COOL check → 60¥, or he walks",
                req: needEddies(60), check: {stat: "cool", dv: 13, label: "talk him down"},
                run: (ctx, ok) => {
                    if (!ok) { return {lines: ["He snaps the case shut. \"Insulting.\" Gone into the crowd."]}; }
                    pay(ctx, 60);
                    ctx.party.forEach((p) => healPct(p, 0.3));
                    return {lines: ["Sixty eddies and a sob story. The injectors are yours."]};
                },
            },
            {label: "Too sketchy", run: () => ({lines: ["Anything free-floating from Trauma Team is trouble."]})},
        ],
    },
    {
        id: "trauma-recruiter", title: "Trauma Team Field Rep",
        flavor: "An AV idles overhead while a rep in a pressed uniform scans your vitals. \"Your coverage has lapsed.\"",
        options: [
            {
                label: "Renew Platinum — 400¥, re-arm the extraction",
                req: (ctx) => Purse.canAfford(ctx.leader, 400) ? null : "need 400¥",
                run: (ctx) => {
                    pay(ctx, 400);
                    return {lines: ["Biometrics logged. One extraction, re-armed. Try not to need it."], restoreRevive: true};
                },
            },
            {label: "Decline", run: () => ({lines: ["The AV peels away. You're on your own out here."]})},
        ],
    },

    // ---- police ----
    {
        id: "checkpoint", title: "NCPD Checkpoint",
        flavor: "Sawhorses, spotlights, bored badges running plates. The sergeant waves your crew over.",
        options: [
            {
                label: "Flash a badge", detail: "Cop only — professional courtesy",
                req: (ctx) => ctx.party.some((p) => p.isCop()) ? null : "no Cop in the crew",
                run: () => ({lines: ["Nods all around. \"Stay safe out there, officer.\" The sawhorses part."]}),
            },
            {
                label: "Bribe — 80¥",
                req: needEddies(80),
                run: (ctx) => { pay(ctx, 80); return {lines: ["The sergeant's palm closes. The spotlight finds someone else."]}; },
            },
            {
                label: "Stare them down", detail: "COOL check — badges respect nerve",
                check: {stat: "cool", dv: 13, label: "facedown"},
                run: (ctx, ok) => {
                    if (ok) { return {lines: ["Long silence. The sergeant blinks first. You walk."]}; }
                    const a = ctx.best("cool");
                    const w = a.inventory.weapons.length ? a.inventory.weapons.pop() : null;
                    return {lines: [w ? `Wrong night for nerve. They confiscate the ${w.name}.`
                        : "Wrong night for nerve. They pat you down and take their time about it."]};
                },
            },
        ],
    },
    {
        id: "shakedown", title: "Badge on the Take",
        flavor: "One cop, no cruiser, hand resting on a Federated Arms sidearm. \"Street tax. You know how it is.\"",
        options: [
            {
                label: "Pay the tax — 15% of your eddies",
                run: (ctx) => {
                    const cut = Purse.garnish(ctx.leader, Math.floor(Purse.balance(ctx.leader) * 0.15));
                    return {lines: [`${cut}¥ lighter. The badge smiles like a landlord.`]};
                },
            },
            {
                label: "\"Take it up with my union.\"", detail: "COOL check — call the bluff",
                check: {stat: "cool", dv: 14, label: "call the bluff"},
                run: (_ctx, ok) => ok
                    ? {lines: ["A twitch. A recalculation. \"…Move along.\" You didn't pay."]}
                    : {lines: ["He doesn't blink. His backup steps out of the doorway."], combat: {boss: false, amount: 2, level: 1, rank: 2}},
            },
            {
                label: "Swing first",
                run: () => ({lines: ["Cheaper than the tax. Louder, though."], combat: {boss: false, amount: 2, level: 1, rank: 2}}),
            },
        ],
    },

    // ---- junkies & vice ----
    {
        id: "junkie", title: "Junkie with a Kitchen Knife",
        flavor: "Glitter-burned eyes, shaking hands, a knife that's mostly rust. \"Twenty eddies, choom. Twenty and I'm gone.\"",
        options: [
            {
                label: "Give him 20¥",
                req: needEddies(20),
                run: (ctx) => { pay(ctx, 20); return {lines: ["He's gone before the eddies finish transferring. Cheap mercy."]}; },
            },
            {
                label: "Talk him down", detail: "EMP check — he's a person under there",
                check: {stat: "emp", dv: 12, label: "reach him"},
                run: (ctx, ok) => {
                    if (ok) { return {lines: ["The knife drops. He tells you which corners to avoid tonight — free intel."], reveal: 1}; }
                    const a = first(ctx.party);
                    const dmg = hurt(a, d6(1));
                    return {lines: [`He lunges mid-sentence. ${a.name} takes ${dmg} before he bolts.`]};
                },
            },
            {
                label: "Hire him as a guide — 50¥", detail: "junkies know the streets",
                req: needEddies(50),
                run: (ctx) => { pay(ctx, 50); return {lines: ["He knows every hole in this district. Two waypoints, uncovered."], reveal: 2}; },
            },
        ],
    },
    {
        id: "dust-dealer", title: "Glitter Dealer",
        flavor: "A coat full of inhalers that glow faintly violet. \"Combat grade. Corpo lab surplus. Barely expired.\"",
        options: [
            {
                label: "Combat stims — 100¥", detail: "+1 REF for the run, −4 Humanity",
                req: needEddies(100),
                run: (ctx) => {
                    pay(ctx, 100);
                    const a = ctx.leader;
                    a.stats.ref += 1;
                    hum(a, -4);
                    return {lines: [`${a.name} inhales. The world slows down. Something else quiets too.`]};
                },
            },
            {
                label: "The cheap batch — 30¥", detail: "TECH check to spot a bad vial",
                req: needEddies(30), check: {stat: "tech", dv: 13, label: "read the label", tag: "toxin"},
                run: (ctx, ok) => {
                    pay(ctx, 30);
                    const a = ctx.leader;
                    if (ok) {
                        a.stats.ref += 1; hum(a, -2);
                        const lines = [`Good batch after all. ${a.name} rides the edge (+1 REF).`];
                        if (Chrome.toxinShield(ctx.party) >= 3) {
                            a.inventory.medical.push(new Medical("Bounceback (filtered)", 50, 15, "What the binder glands strained out, rebottled."));
                            lines.push("The toxin binders strain the garbage out — and hand it back as clean pharma.");
                        }
                        return {lines};
                    }
                    const dmg = hurt(a, d6(2));
                    return {lines: [`Bad vial. ${a.name} convulses — ${dmg} HP gone before it passes.`]};
                },
            },
            {label: "Stay clean", run: () => ({lines: ["The violet glow follows you half a block."]})},
        ],
    },
    {
        id: "bd-den", title: "Braindance Den",
        flavor: "Velvet dark, warm static, a menu of other people's best nights. The proprietor doesn't ask questions.",
        options: [
            {
                label: "A clean wire — 60¥", detail: "+1 max Luck this run",
                req: needEddies(60),
                run: (ctx) => {
                    pay(ctx, 60);
                    ctx.party.forEach((p) => { p.maxLuck += 1; p.luck += 1; });
                    return {lines: ["An hour somewhere better. The crew comes out loose and sharp (+1 Luck)."]};
                },
            },
            {
                label: "The black-market reel — 90¥", detail: "+2 max Luck, −4 Humanity",
                req: needEddies(90),
                run: (ctx) => {
                    pay(ctx, 90);
                    ctx.party.forEach((p) => { p.maxLuck += 2; p.luck += 2; hum(p, -4); });
                    return {lines: ["You shouldn't have watched that. But your hands have never been steadier (+2 Luck)."]};
                },
            },
            {label: "Keep walking", run: () => ({lines: ["Someone else's best night isn't yours."]})},
        ],
    },

    // ---- the NET ----
    {
        id: "dead-runner", title: "Dead Netrunner in a Doorway",
        flavor: "Still warm, still jacked in. The deck's cooling fans whir. Whatever hit them might still be in there.",
        options: [
            {
                label: "Jack in", detail: "INT check vs whatever killed them",
                check: {stat: "int", dv: 13, label: "dive the wreck"},
                run: (ctx, ok) => {
                    const a = ctx.best("int");
                    if (ok) {
                        const take = 120 + d6(4) * 10;
                        Purse.earn(a, take);
                        return {lines: [`${a.name} rides the dead run's wake — ${take}¥ skimmed before the ICE re-forms.`]};
                    }
                    const dmg = hurt(a, d6(3));
                    return {lines: [`Black ICE, still hungry. ${a.name} rips the jack out at ${dmg} HP of feedback.`]};
                },
            },
            {
                label: "Just take the deck hardware",
                run: (ctx) => { Purse.earn(ctx.leader, 70); return {lines: ["Stripped for parts. 70¥. The body keeps its secrets."]}; },
            },
            {label: "Leave the dead alone", run: (ctx) => { hum(ctx.leader, 2); return {lines: ["You close their eyes. It costs nothing and it isn't nothing (+2 Humanity)."]}; }},
        ],
    },
    {
        id: "ice-terminal", title: "\"FREE EDDIES\" Terminal",
        flavor: "A street terminal flashing FREE TRANSFER — CLAIM NOW in six languages. Obviously a trap. Obviously.",
        options: [
            {
                label: "Claim it anyway", detail: "INT check — outrun the hook",
                check: {stat: "int", dv: 14, label: "beat the trap"},
                run: (ctx, ok) => {
                    const a = ctx.best("int");
                    if (ok) { Purse.earn(a, 150); return {lines: [`${a.name} snatches the bait and cuts the line — 150¥, no hook.`]}; }
                    const dmg = hurt(a, d6(3));
                    return {lines: [`The hook sets. ${a.name} takes ${dmg} neural feedback for zero eddies.`]};
                },
            },
            {
                label: "Techie: strip the terminal", detail: "Techie only",
                req: (ctx) => ctx.party.some((p) => p.isTechie()) ? null : "no Techie in the crew",
                run: (ctx) => { Purse.earn(ctx.leader, 90); return {lines: ["The Techie unbolts the whole faceplate. Scrap and coin box: 90¥."]}; },
            },
            {label: "Nothing's free", run: () => ({lines: ["Six languages of no."]})},
        ],
    },
    {
        id: "payphone", title: "The Payphone Rings",
        flavor: "A dead-network payphone. Ringing. For you, apparently.",
        options: [
            {
                label: "Answer it",
                run: (ctx) => {
                    if (Math.random() < 0.5) {
                        return {lines: ["A synthetic voice reads you tomorrow's obituaries — including where they died. The map lights up."], reveal: 3};
                    }
                    ctx.party.forEach((p) => hurt(p, d6(1)));
                    return {lines: ["A shriek of carrier tones. Everyone's optics whiteout — the crew staggers, ears bleeding."]};
                },
            },
            {
                label: "Rip out the coin box", detail: "TECH check",
                check: {stat: "tech", dv: 11, label: "pry it open"},
                run: (ctx, ok) => {
                    if (ok) { Purse.earn(ctx.leader, 40); return {lines: ["Forty eddies in physical coin. Who even pays cash?"]}; }
                    const a = ctx.best("tech");
                    const dmg = hurt(a, d6(1));
                    return {lines: [`The casing bites back — ${dmg} HP of sparks. The ringing stops. Somehow that's worse.`]};
                },
            },
            {label: "Let it ring", run: () => ({lines: ["It rings until you turn the corner. Then it stops."]})},
        ],
    },

    // ---- gangers & guns ----
    {
        id: "wounded-tyger", title: "Wounded Tyger Claw",
        flavor: "Katana still in hand, back against a dumpster, bleeding through lacquered armour. He watches you approach.",
        options: [
            {
                label: "Patch him up", detail: "he'll remember this",
                run: (ctx) => {
                    ctx.leader.gainReputation(1);
                    hum(ctx.leader, 3);
                    const name = grantWeapon(ctx.leader, 2, 3);
                    return {lines: [`He presses his backup blade into your hands — a ${name}. "Debt paid when I say it's paid."`]};
                },
            },
            {
                label: "Finish him and loot the armour",
                run: (ctx) => {
                    Purse.earn(ctx.leader, 60);
                    hum(ctx.leader, -6);
                    ctx.leader.reputation = Math.max(0, ctx.leader.reputation - 1);
                    return {lines: ["Quick and quiet. 60¥ and lacquer scraps. The street saw. The street always sees."]};
                },
            },
            {label: "Not your war", run: () => ({lines: ["His eyes track you all the way down the block."]})},
        ],
    },
    {
        id: "toll-crew", title: "Toll Crew on the Overpass",
        flavor: "Chains across the road, oil-drum fire, four gangers with bats and one with a shotgun. \"Thirty a head.\"",
        options: [
            {
                label: "Pay the toll — 30¥ per merc",
                req: (ctx) => needEddies(ctx.party.length * 30)(ctx),
                run: (ctx) => {
                    pay(ctx, ctx.party.length * 30);
                    return {lines: ["The chains drop. Cheaper than ammunition. Probably."]};
                },
            },
            {
                label: "Walk through them", detail: "COOL check — make them blink",
                check: {stat: "cool", dv: 13, label: "facedown"},
                run: (ctx, ok) => {
                    if (ok) {
                        ctx.leader.gainReputation(1);
                        return {lines: ["You don't slow down. The shotgun wavers. The chains drop.", "The street saw it happen (+1 REP)."]};
                    }
                    return {lines: ["The shotgun doesn't waver."], combat: {boss: false, amount: 3, level: 1, rank: 1}};
                },
            },
            {
                label: "Open fire",
                run: () => ({lines: ["The oil drum goes over. So does the first ganger."], combat: {boss: false, amount: 3, level: 1, rank: 1}}),
            },
        ],
    },
    {
        id: "cyberpsycho", title: "Cyberpsycho Incident",
        flavor: "Screaming from a parking structure — the wet kind. MaxTac is twenty minutes out. The bounty board updates in real time.",
        options: [
            {
                label: "Take the bounty",
                detail: "a rank-4 horror — big loot, no backup",
                run: (ctx) => {
                    ctx.leader.gainReputation(1);
                    return {lines: ["You go in before MaxTac takes the credit. Word spreads fast (+1 REP)."], combat: {boss: false, amount: 1, level: 3, rank: 4}};
                },
            },
            {label: "Let MaxTac earn their pay", run: () => ({lines: ["Twenty minutes of screaming. You walk faster."]})},
        ],
    },
    {
        id: "scav-van", title: "Abandoned Harvest Van",
        flavor: "A Scav van, doors open, engine ticking. Coolers in the back. Nobody in sight. Nobody visible, anyway.",
        options: [
            {
                label: "Loot the coolers",
                run: (ctx) => {
                    if (Math.random() < 0.5) {
                        const name = grantWeapon(ctx.leader, 2, 4);
                        Purse.earn(ctx.leader, 80);
                        return {lines: [`Coolers full of salvage — 80¥ and a ${name} under the false floor.`]};
                    }
                    return {lines: ["The coolers are bait. Scavs drop from the scaffolding."], combat: {boss: false, amount: 3, level: 1, rank: 1}};
                },
            },
            {label: "Vans like that cost organs", run: () => ({lines: ["You keep your kidneys and keep moving."]})},
        ],
    },

    // ---- animals ----
    {
        id: "mastiff", title: "Stray Cyber-Mastiff",
        flavor: "Military-surplus dog, one optic cracked, growl like a dying transformer. It hasn't decided about you yet.",
        options: [
            {
                label: "Approach slowly", detail: "EMP check — it was someone's once",
                check: {stat: "emp", dv: 12, label: "steady hand"},
                run: (ctx, ok) => {
                    if (ok) { return {lines: ["It sniffs your hand, then trots ahead — leading you to its dead handler's stash."], reveal: 1}; }
                    const a = ctx.best("emp");
                    const dmg = hurt(a, d6(2));
                    return {lines: [`Wrong move. ${a.name} takes ${dmg} in titanium teeth before it bolts.`]};
                },
            },
            {
                label: "Put it down, strip the chrome",
                run: (ctx) => {
                    Purse.earn(ctx.leader, 50);
                    hum(ctx.leader, -4);
                    return {lines: ["One shot. The optics fetch 50¥. The growl stays in your ears."]};
                },
            },
            {label: "Give it room", run: () => ({lines: ["You cross the street. It watches you the whole way."]})},
        ],
    },
    {
        id: "vultures", title: "Drones Circling a Body",
        flavor: "Corpse-drones wheel over something in a drainage ditch. Their salvage tags are still unclaimed.",
        options: [
            {
                label: "Search the body",
                run: (ctx) => {
                    const roll = Math.random();
                    if (roll < 0.4) { Purse.earn(ctx.leader, 90); return {lines: ["A courier, judging by the shoes. 90¥ in a hidden belt."]}; }
                    if (roll < 0.7) { const name = grantWeapon(ctx.leader, 1, 3); return {lines: [`Whoever they were, they were armed — a ${name}, still loaded.`]}; }
                    // Toxin Binders: the contact toxin never gets past the glands.
                    if (Chrome.toxinShield(ctx.party) >= 2) {
                        const lines = ["Contact toxin on the collar — the binder glands eat it without breaking stride."];
                        if (Chrome.toxinShield(ctx.party) >= 3) {
                            ctx.leader.inventory.medical.push(new Medical("Refined Toxin Base", 40, 10, "One street's poison is another's anaesthetic."));
                            lines.push("They even keep the base compound. Free pharma.");
                        }
                        return {lines};
                    }
                    const a = first(ctx.party);
                    const dmg = hurt(a, d6(1));
                    return {lines: [`Contact toxin on the collar. ${a.name} takes ${dmg} learning that.`]};
                },
            },
            {label: "Let the drones have it", run: () => ({lines: ["The tags claim themselves eventually."]})},
        ],
    },
    {
        id: "rat-pit", title: "The Rat Pit",
        flavor: "A basement crowd, a chalk circle, two augmented rats the size of terriers. The odds board is optimistic.",
        options: [
            {
                label: "Bet 50¥ on the ugly one",
                req: needEddies(50),
                run: (ctx) => {
                    pay(ctx, 50);
                    if (Math.random() < 0.5) { Purse.earn(ctx.leader, 120); return {lines: ["The ugly one wins ugly. 120¥ over the counter."]}; }
                    return {lines: ["The ugly one loses beautifully. Fifty eddies, gone."]};
                },
            },
            {
                label: "Read the rats first", detail: "INT check, then bet smart",
                req: needEddies(50), check: {stat: "int", dv: 12, label: "study the form"},
                run: (ctx, ok) => {
                    pay(ctx, 50);
                    if (ok || Math.random() < 0.5) { Purse.earn(ctx.leader, 120); return {lines: ["The limp was fake. Yours pays out: 120¥."]}; }
                    return {lines: ["The limp was real. The eddies are gone."]};
                },
            },
            {label: "Not with your money", run: () => ({lines: ["The crowd roars behind you."]})},
        ],
    },

    // ---- people of the street ----
    {
        id: "street-kid", title: "Kid on a Rooftop Ledge",
        flavor: "Maybe twelve, feet dangling over forty storeys, watching everything. Kids like this ARE the district's sensor net.",
        options: [
            {
                label: "Buy intel — 50¥",
                req: needEddies(50),
                run: (ctx) => { pay(ctx, 50); return {lines: ["She rattles off who's holding which corner like a weather report."], reveal: 2}; },
            },
            {
                label: "Just talk", detail: "EMP check — kids can tell",
                check: {stat: "emp", dv: 12, label: "be a person"},
                run: (_ctx, ok) => ok
                    ? {lines: ["She decides you're all right and points out one thing worth knowing."], reveal: 1}
                    : {lines: ["She looks straight through you and says nothing. Fair."]},
            },
            {label: "Keep moving", run: () => ({lines: ["She logs you anyway. Everyone's data to someone."]})},
        ],
    },
    {
        id: "tourist", title: "Lost Corpo Tourist",
        flavor: "Clean shoes, real leather bag, phone held like a map. He has no idea what district he's bleeding money in.",
        options: [
            {
                label: "Walk him out", detail: "COOL check — look like protection, not a threat",
                check: {stat: "cool", dv: 11, label: "play bodyguard"},
                run: (ctx, ok) => {
                    if (ok) { Purse.earn(ctx.leader, 60); return {lines: ["He transfers 60¥ 'for the escort service' and never knows how close it was."]}; }
                    return {lines: ["Halfway there, a pickpocket relieves him of everything. He blames you, loudly, and flees."]};
                },
            },
            {
                label: "Rob him yourselves",
                run: (ctx) => {
                    Purse.earn(ctx.leader, 80);
                    hum(ctx.leader, -5);
                    ctx.leader.reputation = Math.max(0, ctx.leader.reputation - 1);
                    return {lines: ["80¥ and a real leather bag. He'll tell this story at dinner parties forever."]};
                },
            },
            {label: "Not your problem", run: () => ({lines: ["The district will invoice him itself."]})},
        ],
    },
    {
        id: "preacher", title: "Preacher of the Burned Church",
        flavor: "He preaches to traffic from a milk crate: the Net has a hell, and everyone you've flatlined is in it, waiting.",
        options: [
            {
                label: "Donate 100¥ for a blessing",
                req: needEddies(100),
                run: (ctx) => {
                    pay(ctx, 100);
                    ctx.party.forEach((p) => { p.maxLuck += 1; p.luck = p.maxLuck; });
                    return {lines: ["He marks each forehead with machine oil. You feel absurd. You feel bulletproof (+1 Luck)."]};
                },
            },
            {
                label: "Heckle him", detail: "COOL check",
                check: {stat: "cool", dv: 11, label: "out-shout a prophet"},
                run: (ctx, ok) => {
                    if (ok) { return {lines: ["You get the crowd laughing. He blesses you anyway, out of spite."]}; }
                    ctx.party.forEach((p) => { p.luck = Math.max(0, p.luck - 1); });
                    return {lines: ["He names each of you in his next sermon. It shouldn't bother you. It does (−1 Luck)."]};
                },
            },
            {label: "Cross the street", run: () => ({lines: ["\"THE NET HAS A HELL,\" he calls after you, \"AND IT KNOWS YOUR HANDLE.\""]})},
        ],
    },
    {
        id: "raffle", title: "Night-Market Raffle",
        flavor: "A stall of sealed cases, numbered chips, and a spinning cage. \"Every case has a gun. Some guns are worth having.\"",
        options: [
            {
                label: "One chip — 60¥",
                req: needEddies(60),
                run: (ctx) => {
                    pay(ctx, 60);
                    const tier = Math.random() < 0.25 ? 4 : Math.random() < 0.6 ? 3 : 1;
                    const name = grantWeapon(ctx.leader, tier === 1 ? 1 : tier - 1, tier);
                    return {lines: [tier >= 4 ? `The cage rattles — case nine. Inside: a ${name}. The stall goes quiet.`
                        : `Case four: a ${name}. The stallholder looks relieved.`]};
                },
            },
            {
                label: "Fixer's discount", detail: "Fixer only — 30¥, better odds",
                req: (ctx) => ctx.party.some((p) => p.isFixer()) ? (Purse.canAfford(ctx.leader, 30) ? null : "need 30¥") : "no Fixer in the crew",
                run: (ctx) => {
                    pay(ctx, 30);
                    const name = grantWeapon(ctx.leader, 3, 4);
                    return {lines: [`The stallholder owes your Fixer. The chip was never random: a ${name}.`]};
                },
            },
            {label: "Rigged anyway", run: () => ({lines: ["The cage spins on without you."]})},
        ],
    },
];

// ------------------------------------------------------------------ picking --

export class Events {
    public static byId(id: string): GameEvent | null {
        return EVENTS.find((e) => e.id === id) || null;
    }

    /** A random event not yet seen this run (recycles once the pool runs dry). */
    public static pick(usedIds: string[], ctx: EventCtx): GameEvent {
        let pool = EVENTS.filter((e) => usedIds.indexOf(e.id) < 0 && Events.viable(e, ctx));
        if (!pool.length) { pool = EVENTS.filter((e) => Events.viable(e, ctx)); }
        if (!pool.length) { pool = EVENTS; }
        return pool[(Math.random() * pool.length) << 0]!;
    }

    /** An event is viable if at least one non-trivial option is available. */
    private static viable(e: GameEvent, ctx: EventCtx): boolean {
        return e.options.some((o) => !o.req || o.req(ctx) === null);
    }
}
