define(["require", "exports", "../utils/utils", "./resources/Role", "./tools/nameBuilder", "./tools/nameBuilder", "../interact/getItem", "./resources/stats"], function (require, exports, utils_1, Role_1, nameBuilder_1, nameBuilder_2, getItem_1, stats_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Actor = /** @class */ (function () {
        function Actor() {
            this.name = nameBuilder_1.name.toString();
            this.role = null;
            this.skill = null;
            this.level = 1;
            this.experience = null;
            this.health = 100;
            this._weapon = getItem_1.getItem.weapon();
            this.armor = null;
            this.weapons = [];
            this.color = null;
            this.gender = nameBuilder_2.gender.toString();
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
                    run: 1,
                    leap: 1,
                },
                bodyType: 2,
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
        Object.defineProperty(Actor.prototype, "weapon", {
            get: function () {
                if (this._weapon != null)
                    return this._weapon;
                return null;
            },
            set: function (value) {
                this._weapon = value;
            },
            enumerable: true,
            configurable: true
        });
        Actor.prototype.reposition = function () {
            var previousPos = this.position;
            this.position = [previousPos[0] + Math.floor(utils_1.Utils.range(50, -50)),
                previousPos[1] + Math.floor(utils_1.Utils.range(50, -50))];
        };
        Actor.prototype.update = function () {
            this.weapon = getItem_1.getItem.weapon();
            this.name = nameBuilder_1.name();
            this.gender = nameBuilder_2.gender();
            this.items = [getItem_1.getItem.item()];
            this.role = new Role_1.Role();
            this.color = this.role.color;
            this.level = Math.floor((stats_1.Stats.level) + utils_1.Utils.range(1, 3));
            this.currency = Math.floor(utils_1.Utils.range(50, 20));
            this.experience = Math.floor(utils_1.Utils.range(50, 20));
        };
        return Actor;
    }());
    exports.Actor = Actor;
});
