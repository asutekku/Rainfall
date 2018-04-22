define('Actor', function () {
    function Actor(type) {
        this.type = type;
        this.name = null;
        this.role = null;
        this.skill = null;
        this.level = null;
        this.experience = null;
        this.health = null;
        this.weapon = null;
        this.armor = null;
        this.weapons = [];
        this.color = stat.color;
        this.gender = null;
        this.gear = [];
        this.currency = null;
        this.criticalChange = null;
        this.stats = {
            int: 0,
            ref: 0,
            tech: 12,
            cool: 0,
            attr: 0,
            luck: 0,
            ma: 0,
            body: 0,
            emp: 0,
            run: 0,
            leap: 0,
            lift: 0
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
                streetdeal: 0,
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
    return Actor;
});