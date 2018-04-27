import {Utils} from "../utils/utils";
import {Role} from "./resources/Role";
import {name} from "./tools/nameBuilder";
import {gender} from "./tools/nameBuilder";
import {Weapon} from "../items/Weapon";
import {Item} from "../items/Item";
import {getItem} from "../interact/getItem";
import {Stats} from "./resources/stats";

export class Actor {

    get weapon(): Weapon {
        if (this._weapon != null) return this._weapon;
        return null;
    }

    set weapon(value: Weapon) {
        this._weapon = value;
    }
    maxExperience: number;
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
    private criticalChange: number;
    public position: number[];
    public kills: number;
    private stats: { intelligence: number; reflexes: number; techAbility: number; determination: number; attractiveness: number; luck: number; movementAllowance: { stamina: number; run: number; leap: number }; bodyType: number; empathy: number; lift: number };
    private skills: { special: { authority: number; charismaticLeadership: number; combatSense: number; credibility: number; family: number; interface: number; juryRig: number; medicalTech: number; resources: number; streetDeal: number }; attr: { personalGrooming: number; wardrobeAndStyle: number }; body: { endurance: number; strength: number; swimming: number }; will: { interrogation: number; intimidate: number; oratory: number; resistTorture: number; streetwise: number }; empathy: { humanPerception: number; interview: number; leadership: number; seduction: number; social: number; persuasion: number; perform: number }; int: { accounting: number; anthropology: number; awareness: number; biology: number; botany: number; chemistry: number; composition: number; diagnosis: number; education: number; expert: number; gamble: number; geology: number; evade: number; history: number; librarySearch: number; math: number; physics: number; programming: number; tracking: number; stockMarket: number; systemKnowledge: number; teaching: number; wilderness: number; zoology: number }; language: { english: number; japanese: number; chinese: number; german: number; korean: number; french: number }; ref: { archery: number; athletics: number; brawling: number; dance: number; dodge: number; driving: number; fencing: number; handgun: number; heavyWeapons: number; martialJudo: number; martialKungfu: number; martialKarate: number; melee: number; motorcycle: number; heavyMachinery: number; pilotGyro: number; pilotFixedwing: number; pilotDirigible: number; pilotVect: number; rifle: number; stealth: number; submachinegun: number }; tech: { aero: number; AV: number; basic: number; cryotankOperation: number; cyberdeckDesign: number; cyberTech: number; demolitions: number; disguise: number; electronics: number; electronicSecurity: number; firstAid: number; forgery: number; gyroTech: number; painting: number; photography: number; pharmatics: number; lockPick: number; pickPocket: number; instrument: number; weaponSmith: number } };
    private cybernetics: any[];
    lifepath: { style: { clothes: { headgear: any; upper: any; jacket: any; bottom: any; shoes: any; accessories: any }; hair: any; affectations: any; ethnicity: any; language: any }; familyBackground: any; motivations: { traits: any; valuedPerson: any; valueMost: any; feelAboutPeople: any; valuedPossession: any }; lifeEvents: any[] };
    public maxHealth: number;

    constructor() {
        this.name = name.toString();
        this.role = null;
        this.skill = null;
        this.level = 1;
        this.experience = null;
        this.health = 100;
        this._weapon = getItem.weapon();
        this.armor = null;
        this.weapons = [];
        this.color = null;
        this.gender = gender.toString();
        this.items = [];
        this.currency = 0;
        this.criticalChange = null;
        this.position = [0, 0];
        this.kills = 0;
        this.stats = {
            intelligence: 1,
            reflexes: 1,
            techAbility: 1,
            determination: 1,
            attractiveness: 1,
            luck: 1,
            movementAllowance: {
                stamina: 1,
                run: 1,//this.stats.movementAllowance.stamina * 3,
                leap: 1,//this.stats.movementAllowance.stamina / 4
            },
            bodyType: 2, //2-10
            empathy: 1,
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
                streetDeal: 0,
            },
            attr: {
                personalGrooming: 0,
                wardrobeAndStyle: 0
            },
            body: {
                endurance: 0,
                strength: 0,
                swimming: 0
            },
            will: {
                interrogation: 0,
                intimidate: 0,
                oratory: 0,
                resistTorture: 0,
                streetwise: 0
            },
            empathy: {
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

    reposition() {
        let previousPos = this.position;
        this.position = [previousPos[0] + Math.floor(Utils.range(50, -50)),
            previousPos[1] + Math.floor(Utils.range(50, -50))]
    }

    update(){
        this.weapon = getItem.weapon();
        this.name = name();
        this.gender = gender();
        this.items = [getItem.item()];
        this.role = new Role();
        this.color = this.role.color;
        this.level = Math.floor((Stats.level) + Utils.range(1, 3));
        this.currency = Math.floor(Utils.range(50, 20));
        this.experience = Math.floor(Utils.range(50, 20));
    }
}