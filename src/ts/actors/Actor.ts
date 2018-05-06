import {Utils} from "../utils/utils";
import {Role} from "./resources/Role";
import {Weapon} from "../items/Weapon";
import {Item} from "../items/Item";
import {getItem} from "../interact/getItem";
import {Statistics} from "./resources/Statistics";
import {Movement} from "../interact/Movement";
import {Name} from "./resources/Name";
import {State} from "../utils/State";

export class Actor {
    get weapon(): Weapon {
        if (this._weapon != null) return this._weapon;
        return null;
    }

    set weapon(value: Weapon) {
        this._weapon = value;
    }

    item: any;
    public name: string;
    public role: Role;
    public skill: any;
    public level: number;
    public experience: number;
    public health: number;
    private _weapon: Weapon;
    public armor: any;
    public weapons: any[];
    public color: string;
    public gender: string;
    public items: Item[];
    public currency: number;
    public position: number[];
    public kills: number;
    stats: {
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
    lifepath: {
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
    maxExperience: number = 100;

    constructor() {
        this.gender = Name.getGender();
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.role = null;
        this.skill = null;
        this.level = 1;
        this.experience = null;
        this.health = 100;
        this._weapon = getItem.weapon();
        this.armor = null;
        this.weapons = [];
        this.color = null;
        this.items = [];
        this.currency = 0;
        this.position = [0, 0];
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
                run: 1, //this.stats.movementAllowance.stamina * 3,
                leap: 1 //this.stats.movementAllowance.stamina / 4
            },
            bt: 2, //2-10
            btm: 0,
            emp: 1,
            hm: 1,
            sn: 1,
            lift: 1
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
                streetDeal: 0
            },
            att: {
                personalGrooming: 0,
                wardrobeAndStyle: 0
            },
            body: {
                endurance: 0,
                strength: 0,
                swimming: 0
            },
            cool: {
                interrogation: 0,
                intimidate: 0,
                oratory: 0,
                resistTorture: 0,
                streetwise: 0
            },
            emp: {
                humanPerception: 0,
                interview: 0,
                leadership: 0,
                seduction: 0,
                social: 0,
                persuasion: 0,
                perform: 0
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
                zoology: 0
            },
            language: {
                english: 0,
                japanese: 0,
                chinese: 0,
                german: 0,
                korean: 0,
                french: 0
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
                submachinegun: 0
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
                weaponSmith: 0
            }
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
                    accessories: null
                },
                hair: null,
                affectations: null,
                ethnicity: null,
                language: null
            },
            familyBackground: null,
            motivations: {
                traits: null,
                valuedPerson: null,
                valueMost: null,
                feelAboutPeople: null,
                valuedPossession: null
            },
            lifeEvents: []
        };
    }

    update() {
        this.gender = Name.getGender();
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.role = new Role();
        this.skill = this.role.skill;
        this.level = Statistics.level;
        this.experience = Math.floor(Statistics.level ^ (2 / 0.4));
        this.health = Math.floor(
            Utils.range(
                (Statistics.level ^ (2 / 0.09)) * 0.9,
                (Statistics.level ^ (2 / 0.09)) * 1.1
            )
        );
        this.maxHealth = this.health;
        this._weapon = getItem.weapon();
        this.armor = 0;
        this.weapons = [];
        this.color = this.role.color;
        this.items = [getItem.item()];
        this.item = getItem.item();
        this.currency = Math.floor(Utils.range(20, 100));
        this.position = Movement.randomPosition(State.playArea, 50);
        this.kills = 0;
        this.stats = {
            int: Utils.dice(1, 10),
            ref: Utils.dice(1, 10),
            tech: Utils.dice(1, 10),
            cl: Utils.dice(1, 10),
            att: Utils.dice(1, 10),
            lk: Utils.dice(1, 10),
            ma: {
                ma: Utils.dice(1, 10),
                run: this.stats.ma.ma * 3,
                leap: this.stats.ma.ma / 4
            },
            bt: Utils.dice(1, 11) - 1, //2-10
            btm: Math.ceil(this.stats.bt / 2),
            emp: Utils.dice(1, 10),
            lift: Utils.dice(1, 10),
            hm: this.stats.emp * 10,
            sn: this.stats.bt
        };
        this.skills = {
            special: {
                authority: Utils.dice(1, 5),
                charismaticLeadership: Utils.dice(1, 5),
                combatSense: Utils.dice(1, 5),
                credibility: Utils.dice(1, 5),
                family: Utils.dice(1, 5),
                interface: Utils.dice(1, 5),
                juryRig: Utils.dice(1, 5),
                medicalTech: Utils.dice(1, 5),
                resources: Utils.dice(1, 5),
                streetDeal: Utils.dice(1, 5)
            },
            att: {
                personalGrooming: Utils.dice(1, 5),
                wardrobeAndStyle: Utils.dice(1, 5)
            },
            body: {
                endurance: Utils.dice(1, 5),
                strength: Utils.dice(1, 5),
                swimming: Utils.dice(1, 5)
            },
            cool: {
                interrogation: Utils.dice(1, 5),
                intimidate: Utils.dice(1, 5),
                oratory: Utils.dice(1, 5),
                resistTorture: Utils.dice(1, 5),
                streetwise: Utils.dice(1, 5)
            },
            emp: {
                humanPerception: Utils.dice(1, 5),
                interview: Utils.dice(1, 5),
                leadership: Utils.dice(1, 5),
                seduction: Utils.dice(1, 5),
                social: Utils.dice(1, 5),
                persuasion: Utils.dice(1, 5),
                perform: Utils.dice(1, 5)
            },
            int: {
                accounting: Utils.dice(1, 5),
                anthropology: Utils.dice(1, 5),
                awareness: Utils.dice(1, 5),
                biology: Utils.dice(1, 5),
                botany: Utils.dice(1, 5),
                chemistry: Utils.dice(1, 5),
                composition: Utils.dice(1, 5),
                diagnosis: Utils.dice(1, 5),
                education: Utils.dice(1, 5),
                expert: Utils.dice(1, 5),
                gamble: Utils.dice(1, 5),
                geology: Utils.dice(1, 5),
                evade: Utils.dice(1, 5),
                history: Utils.dice(1, 5),
                librarySearch: Utils.dice(1, 5),
                math: Utils.dice(1, 5),
                physics: Utils.dice(1, 5),
                programming: Utils.dice(1, 5),
                tracking: Utils.dice(1, 5),
                stockMarket: Utils.dice(1, 5),
                systemKnowledge: Utils.dice(1, 5),
                teaching: Utils.dice(1, 5),
                wilderness: Utils.dice(1, 5),
                zoology: Utils.dice(1, 5)
            },
            language: {
                english: Utils.dice(1, 5),
                japanese: Utils.dice(1, 5),
                chinese: Utils.dice(1, 5),
                german: Utils.dice(1, 5),
                korean: Utils.dice(1, 5),
                french: Utils.dice(1, 5)
            },
            ref: {
                archery: Utils.dice(1, 5),
                athletics: Utils.dice(1, 5),
                brawling: Utils.dice(1, 5),
                dance: Utils.dice(1, 5),
                dodge: Utils.dice(1, 5),
                driving: Utils.dice(1, 5),
                fencing: Utils.dice(1, 5),
                handgun: Utils.dice(1, 5),
                heavyWeapons: Utils.dice(1, 5),
                martialJudo: Utils.dice(1, 5),
                martialKungfu: Utils.dice(1, 5),
                martialKarate: Utils.dice(1, 5),
                melee: Utils.dice(1, 5),
                motorcycle: Utils.dice(1, 5),
                heavyMachinery: Utils.dice(1, 5),
                pilotGyro: Utils.dice(1, 5),
                pilotFixedwing: Utils.dice(1, 5),
                pilotDirigible: Utils.dice(1, 5),
                pilotVect: Utils.dice(1, 5),
                rifle: Utils.dice(1, 5),
                stealth: Utils.dice(1, 5),
                submachinegun: Utils.dice(1, 5)
            },
            tech: {
                aero: Utils.dice(1, 5),
                AV: Utils.dice(1, 5),
                basic: Utils.dice(1, 5),
                cryotankOperation: Utils.dice(1, 5),
                cyberdeckDesign: Utils.dice(1, 5),
                cyberTech: Utils.dice(1, 5),
                demolitions: Utils.dice(1, 5),
                disguise: Utils.dice(1, 5),
                electronics: Utils.dice(1, 5),
                electronicSecurity: Utils.dice(1, 5),
                firstAid: Utils.dice(1, 5),
                forgery: Utils.dice(1, 5),
                gyroTech: Utils.dice(1, 5),
                painting: Utils.dice(1, 5),
                photography: Utils.dice(1, 5),
                pharmatics: Utils.dice(1, 5),
                lockPick: Utils.dice(1, 5),
                pickPocket: Utils.dice(1, 5),
                instrument: Utils.dice(1, 5),
                weaponSmith: Utils.dice(1, 5)
            }
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
                    accessories: null
                },
                hair: null,
                affectations: null,
                ethnicity: null,
                language: null
            },
            familyBackground: null,
            motivations: {
                traits: null,
                valuedPerson: null,
                valueMost: null,
                feelAboutPeople: null,
                valuedPossession: null
            },
            lifeEvents: []
        };
    }

    reposition() {
        let previousPos = this.position;
        this.position = [
            previousPos[0] + Math.floor(Utils.range(-50, 50)),
            previousPos[1] + Math.floor(Utils.range(-50, 50))
        ];
    }

    updateAfter() {
        this.stats.ma.run = this.stats.ma.ma * 3;
        this.stats.ma.leap = this.stats.ma.ma / 4;
        this.stats.btm = Math.ceil(this.stats.bt / 2);
        this.stats.hm = this.stats.emp * 10;
        this.stats.sn = this.stats.bt;
    }

    gainLevel() {
        this.level += 1;
        Statistics.level += 1;
        this.experience = 0;
        this.maxExperience = this.level ^ (2 / 0.04);
        this.maxHealth = this.level ^ (2 / 0.1);
        this.health = this.maxHealth;
    }

    isAlive(): boolean {
        return this.health > 0;
    }

    draw(context) {
        context.clearRect(this.position[0], this.position[1], 3, 3);
        context.fillStyle = this.color;
        context.fillRect(this.position[0], this.position[1], 3, 3);
    }
}
