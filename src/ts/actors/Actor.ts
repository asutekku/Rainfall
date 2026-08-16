import {GetItem} from "../interact/getItem";
import {Armor} from "../items/Armor";
import {Cyberware} from "../items/Cyberware";
import {Program} from "../items/Program";
import {Vehicle} from "../items/Vehicle";
import {Item} from "../items/Item";
import {Weapon} from "../items/Weapon";
import {Name} from "./resources/Name";
import {Role} from "./resources/Role";
import {CharacterCreation, Lifepath} from "./resources/CharacterCreation";
import {Statistics} from "./resources/Statistics";
import {ObjectPosition} from "../utils/ObjectPosition";
import {GameObject} from "../items/GameObject";

export class Actor extends GameObject {
    public item: any;
    public name: string;
    public role: Role;
    public skill: any;
    public level: number;
    public experience: number;
    public health: number;
    public weapon: Weapon;
    public armor: number;
    public alive: boolean;
    public override position: ObjectPosition;
    public temperament: string;   // tactical AI personality: balanced|aggressive|flanker|camper|berserker
    public auto: boolean;         // squad member played by the tactical AI instead of the player
    public faction?: string;      // enemy faction (Maelstrom, Arasaka, ...) for display
    public rank?: number;         // enemy threat rank 1-5
    public archetype?: string;    // enemy role within the faction (Reaver, Lanceman, ...)
    public equipment: {
        headgear: Armor | null;
        upper: Armor | null;
        lower: Armor | null;
        arms: Armor | null;
        feet: Armor | null;
        accessories: Armor | null;
        [key: string]: Item | null;
    };
    public weapons: any[];
    public gender: string;
    public items: Item[];
    public currency: number;
    public kills: number;
    /** Hired help — expendable. Your character is never this, so it never dies for good. */
    public hireable: boolean;
    public inventory: {
        weapons: Weapon[];
        armor: Armor[];
        misc: Item[];
        medical: Item[];
        [key: string]: Item[];
    };

    public stats: {
        int: number;
        ref: number;
        dex: number;   // Cyberpunk RED: melee/evasion stat
        tech: number;
        cl: number;
        att: number;
        lk: number;
        will: number;  // Cyberpunk RED: HP and resolve
        ma: { ma: number; run: number; leap: number };
        bt: number;
        btm: number;
        sn: number;
        hm: number;
        emp: number;
        lift: number;
    };
    public luck: number;
    public maxLuck: number;
    public roleRank: number;
    public mortallyWounded: boolean;
    public deathSavePenalty: number;
    public lifepath: Lifepath;
    public maxHealth: number;
    public maxExperience: number;
    protected skills: {
        special: {
            authority: number;
            charismaticLeadership: number;
            combatSense: number;
            credibility: number;
            family: number;
            interface: number;
            juryRig: number;
            medicalTech: number;
            resources: number;
            streetDeal: number;
        };
        att: { personalGrooming: number; wardrobeAndStyle: number };
        body: { endurance: number; strength: number; swimming: number };
        cool: {
            interrogation: number;
            intimidate: number;
            oratory: number;
            resistTorture: number;
            streetwise: number;
        };
        emp: {
            humanPerception: number;
            interview: number;
            leadership: number;
            seduction: number;
            social: number;
            persuasion: number;
            perform: number;
        };
        int: {
            accounting: number;
            anthropology: number;
            awareness: number;
            biology: number;
            botany: number;
            chemistry: number;
            composition: number;
            diagnosis: number;
            education: number;
            expert: number;
            gamble: number;
            geology: number;
            evade: number;
            history: number;
            librarySearch: number;
            math: number;
            physics: number;
            programming: number;
            tracking: number;
            stockMarket: number;
            systemKnowledge: number;
            teaching: number;
            wilderness: number;
            zoology: number;
        };
        language: {
            english: number;
            japanese: number;
            chinese: number;
            german: number;
            korean: number;
            french: number;
        };
        ref: {
            archery: number;
            athletics: number;
            brawling: number;
            dance: number;
            dodge: number;
            driving: number;
            fencing: number;
            handgun: number;
            heavyWeapons: number;
            martialJudo: number;
            martialKungfu: number;
            martialKarate: number;
            melee: number;
            motorcycle: number;
            heavyMachinery: number;
            pilotGyro: number;
            pilotFixedwing: number;
            pilotDirigible: number;
            pilotVect: number;
            rifle: number;
            stealth: number;
            submachinegun: number;
        };
        tech: {
            aero: number;
            AV: number;
            basic: number;
            cryotankOperation: number;
            cyberdeckDesign: number;
            cyberTech: number;
            demolitions: number;
            disguise: number;
            electronics: number;
            electronicSecurity: number;
            firstAid: number;
            forgery: number;
            gyroTech: number;
            painting: number;
            photography: number;
            pharmatics: number;
            lockPick: number;
            pickPocket: number;
            instrument: number;
            weaponSmith: number;
        };
    };
    public cybernetics: Cyberware[];
    public cyberdeck: Program[];
    public humanity: number;
    public maxHumanity: number;
    public cyberpsychosis: boolean;
    public traumaTeam: boolean;
    public reputation: number;
    public fearPenalty: number;
    public housing: string;
    public vehicle: Vehicle | null;
    public combatAwareness: { precision: number; initiative: number; spotWeakness: number; deflection: number };
    public firstHitDone: boolean;
    public deflectionUsed: boolean;

    constructor() {
        const role = new Role();
        super(new ObjectPosition(0, 0, 0));
        this.gender = Name.getGender();
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.role = role;
        this.skill = role.skill;
        this.level = 1;
        this.experience = 0;
        this.alive = true;
        this.maxExperience = 100;
        this.health = 100;
        this.maxHealth = 100;
        this.weapon = GetItem.weapon("Fists");
        this.armor = 0;
        this.equipment = {
            headgear: null,
            upper: null,
            lower: null,
            arms: null,
            feet: null,
            accessories: null,
        };
        this.weapons = [];
        this.items = [];
        this.inventory = {
            weapons: [],
            armor: [],
            misc: [],
            medical: [],
        };
        this.currency = 0;
        this.position = new ObjectPosition(0, 0, 0);
        this.kills = 0;
        this.hireable = false;
        this.temperament = "balanced";
        this.auto = false;
        this.stats = {
            int: 1,
            ref: 1,
            dex: 1,
            tech: 1,
            cl: 1,
            att: 1,
            lk: 1,
            will: 1,
            ma: {
                ma: 1,
                run: 1, // this.stats.movementAllowance.stamina * 3,
                leap: 1, // this.stats.movementAllowance.stamina / 4
            },
            bt: 2, // 2-10
            btm: 0,
            emp: 1,
            hm: 1,
            sn: 1,
            lift: 1,
        };
        this.luck = 1;
        this.maxLuck = 1;
        this.roleRank = 4;
        this.mortallyWounded = false;
        this.deathSavePenalty = 0;
        this.skills = {
            special: {
                authority: 0,
                charismaticLeadership: 0,
                combatSense: 0,
                credibility: 0,
                family: 0,
                interface: 0,
                juryRig: 0,
                medicalTech: 0,
                resources: 0,
                streetDeal: 0,
            },
            att: {
                personalGrooming: 0,
                wardrobeAndStyle: 0,
            },
            body: {
                endurance: 0,
                strength: 0,
                swimming: 0,
            },
            cool: {
                interrogation: 0,
                intimidate: 0,
                oratory: 0,
                resistTorture: 0,
                streetwise: 0,
            },
            emp: {
                humanPerception: 0,
                interview: 0,
                leadership: 0,
                seduction: 0,
                social: 0,
                persuasion: 0,
                perform: 0,
            },
            int: {
                accounting: 0,
                anthropology: 0,
                awareness: 0,
                biology: 0,
                botany: 0,
                chemistry: 0,
                composition: 0,
                diagnosis: 0,
                education: 0,
                expert: 0,
                gamble: 0,
                geology: 0,
                evade: 0,
                history: 0,
                librarySearch: 0,
                math: 0,
                physics: 0,
                programming: 0,
                tracking: 0,
                stockMarket: 0,
                systemKnowledge: 0,
                teaching: 0,
                wilderness: 0,
                zoology: 0,
            },
            language: {
                english: 0,
                japanese: 0,
                chinese: 0,
                german: 0,
                korean: 0,
                french: 0,
            },
            ref: {
                archery: 0,
                athletics: 0,
                brawling: 0,
                dance: 0,
                dodge: 0,
                driving: 0,
                fencing: 0,
                handgun: 0,
                heavyWeapons: 0,
                martialJudo: 0,
                martialKungfu: 0,
                martialKarate: 0,
                melee: 0,
                motorcycle: 0,
                heavyMachinery: 0,
                pilotGyro: 0,
                pilotFixedwing: 0,
                pilotDirigible: 0,
                pilotVect: 0,
                rifle: 0,
                stealth: 0,
                submachinegun: 0,
            },
            tech: {
                aero: 0,
                AV: 0,
                basic: 0,
                cryotankOperation: 0,
                cyberdeckDesign: 0,
                cyberTech: 0,
                demolitions: 0,
                disguise: 0,
                electronics: 0,
                electronicSecurity: 0,
                firstAid: 0,
                forgery: 0,
                gyroTech: 0,
                painting: 0,
                photography: 0,
                pharmatics: 0,
                lockPick: 0,
                pickPocket: 0,
                instrument: 0,
                weaponSmith: 0,
            },
        };
        this.cybernetics = [];
        this.cyberdeck = [];
        this.humanity = this.stats.emp * 10;
        this.maxHumanity = this.stats.emp * 10;
        this.cyberpsychosis = false;
        this.traumaTeam = false;
        this.reputation = 0;
        this.fearPenalty = 0;
        this.housing = "Streets";
        this.vehicle = null;
        this.combatAwareness = {precision: 0, initiative: 0, spotWeakness: 0, deflection: 0};
        this.firstHitDone = false;
        this.deflectionUsed = false;
        this.lifepath = CharacterCreation.randomLifepath();
    }

    public updateAfter() {
        this.stats.ma.run = this.stats.ma.ma * 3;
        this.stats.ma.leap = this.stats.ma.ma / 4;
        this.stats.btm = Math.ceil(this.stats.bt / 2);
        this.stats.hm = this.stats.emp * 10;
        this.stats.sn = this.stats.bt;
    }

    public gainLevel() {
        this.level += 1;
        Statistics.level += 1;
        this.experience = 0;
        // `level ^ 1.5` was a bitwise XOR (1.5 truncates to 1), so growth was a
        // meaningless sawtooth. Use a real power for smooth, monotonic scaling.
        this.maxExperience += Math.floor(Math.pow(this.level, 1.5) * 5);
        this.maxHealth += Math.floor(Math.pow(this.level, 1.5));
        // Only the ceiling rises; current HP is recovered by resting. This keeps a
        // mid-fight level-up from restoring a combatant (no more enemy self-heals).
        this.onLevelUp();
    }

    /** Hook for spending RED Improvement Points on level-up (players override). */
    public onLevelUp(): void { /* no-op for generic actors */ }

    /** Train the equipped weapon's skill by one (cap 10) — safehouse drills. */
    public trainWeaponSkill(): boolean {
        const r: any = this.skills.ref;
        const key = this.weaponSkillKey();
        if (r[key] >= 10) { return false; }
        r[key] += 1;
        return true;
    }

    /** The ref-skill key backing the equipped weapon (for training it up). */
    public weaponSkillKey(): string {
        switch (this.weapon.skill) {
            case "Handgun": return "handgun";
            case "Shoulder Arms": return "rifle";
            case "Heavy Weapons": return "heavyWeapons";
            case "Melee Weapon": return "melee";
            case "Brawling": return "brawling";
            case "Archery": return "archery";
            case "Thrown": return "athletics";
            default: return "handgun";
        }
    }

    /** Truly dead (a failed Death Save or an instant kill). */
    public isAlive(): boolean {
        return this.alive;
    }

    /** Can still take combat actions: alive, conscious, and not Mortally Wounded. */
    public canFight(): boolean {
        return this.alive && !this.mortallyWounded && this.health > 0;
    }

    /** RED: at or below half HP the character is Seriously Wounded (-2 to Actions). */
    public isSeriouslyWounded(): boolean {
        return this.health > 0 && this.health <= this.maxHealth / 2;
    }

    /** RED: -2 to all Actions while Seriously Wounded (negated by a Pain Editor). */
    public woundPenalty(): number {
        return this.isSeriouslyWounded() && !this.hasPainEditor() ? -2 : 0;
    }

    /** RED HP = 10 + 5 x ceil((BODY + WILL) / 2). Resets wound state. */
    public recalculateHealth(): void {
        this.maxHealth = 10 + 5 * Math.ceil((this.stats.bt + this.stats.will) / 2);
        this.health = this.maxHealth;
        this.mortallyWounded = false;
        this.deathSavePenalty = 0;
    }

    /**
     * RED Death Save, made at the start of a Mortally Wounded character's turn.
     * Roll 1d10: a natural 10 always fails, otherwise survive if the roll (plus
     * the cumulative penalty from previous rounds) is under BODY. A failure is
     * permanent death.
     */
    public deathSave(): boolean {
        const roll: number = Math.floor(Math.random() * 10) + 1;
        const survived: boolean = roll !== 10 && (roll + this.deathSavePenalty) < this.stats.bt;
        this.deathSavePenalty += 1;
        if (!survived) {
            this.alive = false;
        }
        return survived;
    }

    /** RED First Aid / Paramedic skill level. */
    public firstAidSkill(): number {
        return this.skills.tech.firstAid;
    }

    /** The skills that matter in this game's loop, for the character sheet. */
    public skillSheet(): Array<[string, number]> {
        const r = this.skills.ref;
        return [
            ["Handgun", r.handgun],
            ["Shoulder Arms", r.rifle],
            ["Heavy Weapons", r.heavyWeapons],
            ["Melee", r.melee],
            ["Brawling", r.brawling],
            ["Dodge", r.dodge],
            ["First Aid", this.skills.tech.firstAid],
            ["Interface", this.interfaceRank()],
            ["Drive", r.driving],
        ];
    }

    /**
     * Stabilise a Mortally Wounded character: Death Saves stop and, if they were
     * at 0 HP, they cling to 1. They are conscious but still badly hurt.
     */
    public stabilize(): void {
        this.mortallyWounded = false;
        this.deathSavePenalty = 0;
        if (this.alive && this.health <= 0) {
            this.health = 1;
        }
    }

    /** Full recovery, including from death: clears wounds and restores HP to max. */
    public revive(): void {
        this.alive = true;
        this.mortallyWounded = false;
        this.deathSavePenalty = 0;
        this.health = this.maxHealth;
    }

    /** Restore HP up to max. No effect while Mortally Wounded (stabilise first). */
    public heal(amount: number): number {
        if (this.mortallyWounded || !this.alive) {
            return 0;
        }
        const before: number = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health - before;
    }

    /** Spend up to `amount` Luck points from the pool; returns how many were spent. */
    public spendLuck(amount: number): number {
        const spent: number = Math.max(0, Math.min(amount, this.luck));
        this.luck -= spent;
        return spent;
    }

    /** RED Luck refreshes fully at the start of a new encounter/session. */
    public refreshLuck(): void {
        this.luck = this.maxLuck;
    }

    public receiveDamage(amount: number, ap: boolean = false, aimedAtHead: boolean = false): number {
        // RED uses body armour SP for normal hits and head armour SP for aimed
        // head shots; limbs are not separately armoured in the core rules.
        const piece: Armor | null = aimedAtHead ? this.equipment.headgear : this.equipment.upper;
        const wornSP: number = piece ? piece.stoppingPower : 0;
        // Subdermal armour doesn't stack with worn armour; use the higher SP.
        let sp: number = aimedAtHead ? wornSP : Math.max(wornSP, this.cyberSP());
        if (ap) {
            sp = Math.floor(sp / 2); // armour-piercing halves SP
        }
        let damage: number = Math.max(0, amount - sp);
        if (aimedAtHead) {
            damage *= 2; // head shots double the damage that gets through
        }
        // Combat Awareness "Damage Deflection": block the first pierced damage of the round.
        if (damage > 0 && !this.deflectionUsed && this.deflection() > 0) {
            damage = Math.max(0, damage - this.deflection());
            this.deflectionUsed = true;
        }
        if (damage > 0) {
            // RED ablation: whichever armour actually stopped part of the hit loses 1 SP.
            const usingSubdermal: boolean = !aimedAtHead && this.cyberSP() > wornSP;
            if (usingSubdermal) {
                const sub = this.subdermalPiece();
                if (sub && sub.effects.sp) {
                    sub.effects.sp = Math.max(0, sub.effects.sp - 1);
                }
            } else if (piece) {
                piece.stoppingPower = Math.max(0, piece.stoppingPower - 1);
            }
            this.health -= damage;
            if (this.health <= 0) {
                this.health = 0;
                this.mortallyWounded = true;
            }
        }
        return damage;
    }

    /** The installed cyberware providing the most subdermal SP, if any. */
    private subdermalPiece(): Cyberware | null {
        let best: Cyberware | null = null;
        let bestSP = 0;
        for (const c of this.cybernetics) {
            const cSP = c.effects.sp || 0;
            if (cSP > bestSP) { bestSP = cSP; best = c; }
        }
        return best;
    }

    /** RED weapon-skill level for the given weapon (all combat skills share a base). */
    public skillFor(weapon: Weapon): number {
        const r = this.skills.ref;
        switch (weapon.skill) {
            case "Handgun": return r.handgun;
            case "Shoulder Arms": return r.rifle;
            case "Heavy Weapons": return r.heavyWeapons;
            case "Melee Weapon": return r.melee;
            case "Brawling": return r.brawling;
            case "Archery": return r.archery;
            case "Thrown": return r.athletics;
            default: return r.handgun;
        }
    }

    /**
     * RED attack modifier: DEX (melee) or REF (ranged) + weapon skill + weapon
     * accuracy, minus the Seriously Wounded penalty, plus a Solo's Precision
     * Attack bonus.
     */
    public attackBonus(weapon: Weapon): number {
        const stat: number = weapon.weaponClass === "melee" ? this.stats.dex : this.stats.ref;
        const cyber: number = weapon.weaponClass === "melee" ? 0 : this.cyberAttackBonus();
        return stat + this.skillFor(weapon) + weapon.accuracyBonus
            + this.woundPenalty() + this.precisionAttackBonus() + cyber + this.fearPenalty;
    }

    /** RED Reputation (0-10), earned through notable deeds (Media/Rockerboy gain faster). */
    public gainReputation(amount: number): void {
        this.reputation = Math.min(10, this.reputation + amount + this.repGainBonus());
    }

    /** RED Drive skill (Land Vehicle) for vehicle checks. */
    public driveSkill(): number {
        return this.skills.ref.driving;
    }

    /** RED melee/ranged defence: DEX + Evasion (Dodge), minus the wound penalty. */
    public evasion(): number {
        return this.stats.dex + this.skills.ref.dodge + this.woundPenalty();
    }

    /**
     * RED MOVE stat (metres per Move Action). A configured character uses its
     * chosen MOVE (2-8); an un-configured actor (base MOVE 1) falls back to the
     * baseline 6 so enemy waves and legacy spawns move exactly as before.
     */
    public moveStat(): number {
        return this.stats.ma.ma >= 2 ? this.stats.ma.ma : 6;
    }

    /** Metres this actor can cover in a turn by Running (a Move Action at x2). */
    public runMeters(): number {
        return this.moveStat() * 2;
    }

    /** RED Initiative: 1d10 + REF (+ Solo Initiative Reaction + reflex boosters). */
    public rollInitiative(): number {
        return Math.floor(Math.random() * 10) + 1 + this.stats.ref
            + this.initiativeBonus() + this.cyberInitiative();
    }

    public isSolo(): boolean {
        return this.role.name === "Solo";
    }

    /**
     * Solo "Combat Awareness" Role Ability (RED): a pool of `roleRank` points the
     * Solo divides each round among sub-abilities. Set it with setCombatAwareness()
     * (a UI/AI choice); allocateCombatAwareness() fills a sensible default.
     */
    public allocateCombatAwareness(): void {
        const r = this.roleRank;
        this.combatAwareness = {
            precision: Math.ceil(r / 2),                 // +1 to hit per 3 points
            initiative: Math.floor(r / 3),               // +1 Initiative per point
            spotWeakness: r - Math.ceil(r / 2) - Math.floor(r / 3), // +1 dmg first hit / point
            deflection: 0,                               // block 1 pierced dmg per 2 points
        };
    }

    /** Manually divide the Combat Awareness pool (must total <= roleRank). */
    public setCombatAwareness(a: { precision: number; initiative: number; spotWeakness: number; deflection: number }): boolean {
        if (a.precision + a.initiative + a.spotWeakness + a.deflection > this.roleRank) {
            return false;
        }
        this.combatAwareness = a;
        return true;
    }

    /** Combat Awareness "Precision Attack": +1 to hit per 3 allocated points. */
    public precisionAttackBonus(): number {
        return this.isSolo() ? Math.floor(this.combatAwareness.precision / 3) : 0;
    }

    /** Combat Awareness "Initiative Reaction": +1 Initiative per allocated point. */
    public initiativeBonus(): number {
        return this.isSolo() ? this.combatAwareness.initiative : 0;
    }

    /** Combat Awareness "Spot Weakness": +1 damage per point on the first hit of the round. */
    public spotWeaknessBonus(): number {
        return this.isSolo() ? this.combatAwareness.spotWeakness : 0;
    }

    /** Combat Awareness "Damage Deflection": block 1 pierced damage per 2 points, once per round. */
    public deflection(): number {
        return this.isSolo() ? Math.floor(this.combatAwareness.deflection / 2) : 0;
    }

    /** Configure RED combat-relevant stats and derive HP and Humanity. */
    public setCombatProfile(cfg: {
        ref?: number; dex?: number; body?: number; will?: number; emp?: number;
        skill?: number; luck?: number; roleRank?: number; firstAid?: number;
    }): void {
        if (cfg.firstAid !== undefined) { this.skills.tech.firstAid = cfg.firstAid; }
        if (cfg.ref !== undefined) { this.stats.ref = cfg.ref; }
        if (cfg.dex !== undefined) { this.stats.dex = cfg.dex; }
        if (cfg.body !== undefined) { this.stats.bt = cfg.body; }
        if (cfg.will !== undefined) { this.stats.will = cfg.will; }
        if (cfg.emp !== undefined) {
            this.stats.emp = cfg.emp;
            this.maxHumanity = cfg.emp * 10;
            this.humanity = this.maxHumanity;
            this.stats.hm = this.humanity;
        }
        if (cfg.roleRank !== undefined) { this.roleRank = cfg.roleRank; this.allocateCombatAwareness(); }
        if (cfg.luck !== undefined) { this.maxLuck = cfg.luck; this.luck = cfg.luck; }
        if (cfg.skill !== undefined) {
            const r = this.skills.ref;
            r.handgun = r.rifle = r.submachinegun = r.melee = r.brawling =
                r.archery = r.heavyWeapons = r.martialKarate = r.athletics = r.driving = cfg.skill;
        }
        this.recalculateHealth();
    }

    /**
     * Installs a piece of cyberware: pays its Humanity Loss, recomputes EMP from
     * the remaining Humanity, applies stat effects, and flags cyberpsychosis if
     * Humanity is emptied. Call at set-up (it refreshes HP for BODY changes).
     */
    public installCyberware(cw: Cyberware): void {
        this.cybernetics.push(cw);
        this.humanity = Math.max(0, this.humanity - cw.humanityLoss);
        this.stats.emp = Math.floor(this.humanity / 10);
        this.stats.hm = this.humanity;
        if (this.humanity <= 0) {
            this.cyberpsychosis = true;
        }
        if (cw.effects.body) {
            this.stats.bt += cw.effects.body;
            this.recalculateHealth();
        }
        if (cw.effects.grantsWeapon) {
            // Cyberweapons (Wolvers, Rippers, ...) are real weapons the wielder can equip.
            this.inventory.weapons.push(GetItem.weapon(cw.effects.grantsWeapon));
        }
    }

    public isCyberpsycho(): boolean {
        return this.cyberpsychosis;
    }

    /** RED subdermal/skinweave armour uses the highest single SP, not a sum. */
    public cyberSP(): number {
        return this.cybernetics.reduce((sp, c) => Math.max(sp, c.effects.sp || 0), 0);
    }

    public cyberInitiative(): number {
        return this.cybernetics.reduce((n, c) => n + (c.effects.initiative || 0), 0);
    }

    public cyberAttackBonus(): number {
        return this.cybernetics.reduce((n, c) => n + (c.effects.attackBonus || 0), 0);
    }

    public hasPainEditor(): boolean {
        return this.cybernetics.some((c) => c.effects.ignoreWoundPenalty === true);
    }

    public isNetrunner(): boolean {
        return this.role.name === "Netrunner";
    }

    // --- Remaining RED Role Abilities (rank = roleRank) ---
    public isNomad(): boolean { return this.role.name === "Nomad"; }
    public isFixer(): boolean { return this.role.name === "Fixer"; }
    public isCop(): boolean { return this.role.name === "Cop"; }
    public isCorporate(): boolean { return this.role.name === "Corporate"; }
    public isMedia(): boolean { return this.role.name === "Media"; }
    public isRockerboy(): boolean { return this.role.name === "Rockerboy"; }
    public isTechie(): boolean { return this.role.name === "Techie"; }

    /** Nomad "Moto": bonus to Driving checks (and calling in family rides). */
    public motoBonus(): number { return this.isNomad() ? this.roleRank : 0; }

    /** Fixer "Operator": better deals — +10% per rank on eddies, cheaper upkeep. */
    public operatorBonus(): number { return this.isFixer() ? this.roleRank : 0; }

    /** Cop "Backup": called-in support adds damage each round of a fight. */
    public backupDamage(): number { return this.isCop() ? this.roleRank : 0; }

    /** Corporate "Teamwork": a corporate stipend paid each period. */
    public corpStipend(): number { return this.isCorporate() ? this.roleRank * 50 : 0; }

    /** Rockerboy "Charismatic Impact" / Media "Credibility": Facedown edge from fame. */
    public facedownBonus(): number {
        if (this.isRockerboy()) { return this.roleRank; }
        if (this.isMedia()) { return Math.floor(this.roleRank / 2); }
        return 0;
    }

    /** Media/Rockerboy earn Reputation faster through exposure. */
    public repGainBonus(): number { return this.isMedia() || this.isRockerboy() ? 1 : 0; }

    /** Techie "Maker": repairs this much armour SP each time it services gear. */
    public makerRepair(): number { return this.isTechie() ? this.roleRank : 0; }

    /** RED Interface rank: a Netrunner uses its Role Ability rank; others have a basic 2. */
    public interfaceRank(): number {
        return this.isNetrunner() ? this.roleRank : 2;
    }

    /*draw(context) {
        context.clearRect(this.position[0], this.position[1], 3, 3);
        context.fillStyle = this.color;
        context.fillRect(this.position[0], this.position[1], 3, 3);
    }*/
}
