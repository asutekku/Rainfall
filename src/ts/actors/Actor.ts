import {GetItem} from "../interact/getItem";
import {Armor} from "../items/Armor";
import {Item} from "../items/Item";
import {Weapon} from "../items/Weapon";
import {Name} from "./resources/Name";
import {Role} from "./resources/Role";
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
    public position: ObjectPosition;
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
        tech: number;
        cl: number;
        att: number;
        lk: number;
        ma: { ma: number; run: number; leap: number };
        bt: number;
        btm: number;
        sn: number;
        hm: number;
        emp: number;
        lift: number;
    };
    public lifepath: {
        style: {
            clothes: {
                headgear: any;
                upper: any;
                jacket: any;
                bottom: any;
                shoes: any;
                accessories: any;
            };
            hair: any;
            affectations: any;
            ethnicity: any;
            language: any;
        };
        familyBackground: any;
        motivations: {
            traits: any;
            valuedPerson: any;
            valueMost: any;
            feelAboutPeople: any;
            valuedPossession: any;
        };
        lifeEvents: any[];
    };
    public maxHealth: number;
    public maxExperience: number;
    private skills: {
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
    private cybernetics: any[];

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
        this.stats = {
            int: 1,
            ref: 1,
            tech: 1,
            cl: 1,
            att: 1,
            lk: 1,
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
        this.lifepath = {
            style: {
                clothes: {
                    headgear: null,
                    upper: null,
                    jacket: null,
                    bottom: null,
                    shoes: null,
                    accessories: null,
                },
                hair: null,
                affectations: null,
                ethnicity: null,
                language: null,
            },
            familyBackground: null,
            motivations: {
                traits: null,
                valuedPerson: null,
                valueMost: null,
                feelAboutPeople: null,
                valuedPossession: null,
            },
            lifeEvents: [],
        };
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
        this.maxExperience += (this.level ^ (3 / 2)) * 5;
        this.maxHealth += (this.level ^ (3 / 2));
        this.health = this.maxHealth;
    }

    public isAlive(): boolean {
        return (this.health > 0 && this.alive);
    }

    public receiveDamage(amount: number): number {
        const eq = this.equipment;
        const headSP: number = eq.headgear ? eq.headgear.stoppingPower : 0;
        const armsSP: number = eq.arms ? eq.arms.stoppingPower : 0;
        const feetSP: number = eq.feet ? eq.feet.stoppingPower : 0;
        const lowerSP: number = eq.lower ? eq.lower.stoppingPower : 0;
        const upperSP: number = eq.upper ? eq.upper.stoppingPower : 0;
        const SP: number[] = [headSP, armsSP, feetSP, lowerSP, upperSP];
        const damage = amount - SP.reduce((acc: number, c: number) => acc + c);
        if (this.health < damage) {
            this.health = 0;
            this.health = 0;
            this.alive = false;
        } else {
            this.health -= damage;
        }
        return damage;
    }

    /*draw(context) {
        context.clearRect(this.position[0], this.position[1], 3, 3);
        context.fillStyle = this.color;
        context.fillRect(this.position[0], this.position[1], 3, 3);
    }*/
}
