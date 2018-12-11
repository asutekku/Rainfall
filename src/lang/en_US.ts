export default class en_US {
    static armor = {
        headwearCap: "Baseball Cap",
        headwearBeanie: "Beanie",
        headwearCycling: "Bicycling Helmet"
    };

    static stats = {
        stats: "Stats",
        int: {
            name: "Intelligence",
            short: "INT",
            description:
                "This is a measure of your problem solving ability; figuring out problems, noticing things, remembering information. Almost every character type will need a high intelligence, with Netrunnes and Corporates requiring the highest of all."
        },
        ref: {
            name: "Reflexes",
            short: "REF",
            description:
                "This is a combined index, covering not only your basic dexterity, but also how your level of physical coordination will affect feats of driving, piloting, fighting and athletics. Characters who intend to engage in great deal of combat (such as Solos, Nomads, Rockerboys) should always invest in the highest possible Reflex."
        },
        cool: {
            name: "Cool",
            short: "CL",
            description:
                'This index measures how well the character stands up to stress, pressure, physical pain and/or torture. In determining your willingness to fight on despite wounds or your fighting ability under fire, Cool (CL) is essential. It is also the measure of how "together" your character is and how tough he appears to others. Rockerboys and Fixers should always have a high Cool with Solos and Nomads having the highest of all.'
        },
        tech: {
            name: "Technical Ability",
            short: "TECH",
            description:
                "This is an index of how well you relate to hardware and other technically oriented things. In Cyberpunk, the ability to use and repair technology is of paramount impotence - TECH will be the Stat used when fxing, repairing and attempting to use unfamiliar tech. While all character should have a descent Tech Stat, potential Techies should always opt for the highest possible score in this area."
        },
        lk: {
            name: "Luck",
            short: "LK",
            description:
                'This is the intangible "something" that throws the balance of events into your favor. Your luck represents how many points you may use each game to influence the outcome of critical event. To use Luck, you may add any or all the points of luck a character has to a critical die roll (declaring your inetntion to use Luck before the roll is made) until all of your Luck stat is used up. Luck is always restored at the end of each game session.'
        },
        att: {
            name: "Attractiveness",
            short: "ATT",
            description:
                "This is how good-looking you are. In Cyberpunk, it's not enough to be good - you have to look good while you're doing it (Attitude vs Everything). Attractiveness is especially impotent to Medias and Rockerboys, as being good-looking is part of their jobs."
        },
        ma: {
            name: "Movement Allowance",
            short: "MA",
            description:
                "This is index of how fast character can run (impotent in combat situations). The higher your Movement Allowance (MA), the more distance you can cover in turn."
        },
        run: {
            name: "Run",
            short: "RUN",
            description: "How far your character can run in a single combat round ( MA * 3 )"
        },
        leap: {
            name: "Leap",
            short: "LEAP",
            description: "How far your character can leap ( RUN / 4 )"
        },
        emp: {
            name: "Empathy",
            short: "EMP",
            description:
                'This Stat represent how well you relate to other living things - a measure of charisma and sympathetic emotions. In a world of alienated, future-shocked survivors, the ability to be "human" can no longer be taken for granted. Empathy (EM) is critical when leading, convincing, seducing or perceiving emotional undercurrents. Empathy is also a measure of how close he/she is to the line between feeling human being and cold blooded cyber-monster.'
        },
        hm: {
            name: "Humanity",
            short: "HM",
            description:
                "This is a measure of the toll cybernetics takes on your ability to relate to other living things. Multiply your EMP by 10 to determine how many humanity points you have. Write the result in the box on your Hardcopy Form. Remember: for every 10 points of Humanity lost, you will automatically lose 1 point of EMP. This can have serious effect on any Empathy related Skills, as well as forcing you to the edge of cybernetic-induced psychosis."
        },
        bt: {
            name: "Body Type",
            short: "BT",
            description:
                "Strength, Endurance and Constitution are all based on the character's Body Type. Body Type determines how much damage you can take in wounds, how much you can lift or carry. How far you can throw, how well you recover from shock, and how much additional damage you cause with physical attacks. Body Type is important to all character types, but to Solos, Rockerboys and Nomads most of all."
        },
        btm: {
            name: "Body Type Modifier",
            short: "BTM",
            description:
                "Not all people take damage the same way. For example, it takes a lot more damage to stop Arnold The Terminator than it does Arnold The Nerd. This is reflected by the Body Type Modifier, a special bonus used by your character to reduce the effects of damage. The Body type modifier is subtracted from any damage your character takes in combat."
        },
        sn: {
            name: "Save Number",
            short: "SN",
            description:
                "Your character's Save Number is a value equal to your Body Type. To make saves, you must roll a value on 1D10 equal or lower than this number."
        }
    };

    static player = {
        name: "Name",
        gender: "Gender",
        role: "Role",
        skill: "Skill",
        level: "Level",
        exp: "Experience",
        hp: "Health points",
        money: "Currency"
    };

    static UI = {
        armor: {
            empty: "Empty",
            headgearDescEmpty: "You are wearing nothing on your head.",
            upperDescEmpty: "You are wearing nothing on your upper body.",
            lowerDescEmpty: "You are wearing nothing on your lower body."
        }
    };

    static Drugs = {
        synthCoke: {
            name: "SynthCoke",
            desc:
                "The second generation, synthetic replacement for cocaine. Like the original, its side effects are nasty: paranoia, psychological addiction.",
            type: "Stimulant",
            cost: 1000,
            strength: 1,
            difficulty: 20,
            duration: 1
        },
        stim: {
            name: "Stimulant",
            desc:
                "Stim increases endurance, allowing the user to stay alert for longer periods. Side effects include mental delusions.",
            type: "Stimulant",
            cost: 500,
            strength: 3,
            difficulty: 10,
            duration: 1
        },
        syncomp: {
            name: "Syncomp 15",
            desc:
                "Syncomp is a broad spectrum poison antidote, used to treat nerve and biotoxins. REF is reduced at the rate of 1 point per dose.",
            type: "Antidote",
            cost: 650,
            strength: 3,
            difficulty: 13,
            duration: 1
        },
        speedheal: {
            name: "Speedheal",
            desc:
                "Speedheal is designed to enhance the natural healing processes. Side effects are reduced for a period of 1 week after use.",
            type: "Healing Drug",
            cost: 1650,
            strength: 2,
            difficulty: 33,
            duration: 1
        },
        boost: {
            name: "Boost",
            desc:
                "Boost increases intelligence. A Boost addict has gained full tolerance - his intelligence is no longer increased, and he must have more Boost within twelve hours or be reduced to screaming fits and hallucinations.",
            type: "INT Booster",
            cost: 12,
            strength: 4,
            difficulty: 12,
            duration: 1
        },
        blueglass: {
            name: "Blue Glass",
            desc: `Blue Glass was originally developed as a biological weapon. Under stress, you will have a 3 in 10 chance of "flashing out" - reduced to staring blankly at the pretty colors in your mind (reduce INT by 1 per dose). Roll 1D10 and hope.`,
            type: "Hallucinogenic",
            cost: 1000,
            strength: 1,
            difficulty: 20,
            duration: 1
        },
        smash: {
            name: "Smash",
            desc:
                "Smash is 2020's answer to aIcohol - it's yellow, foamy, and comes in cans. It makes you loose, happy and ready to party. ",
            type: "Euphoric",
            cost: 900,
            strength: 1,
            difficulty: 18,
            duration: 1
        },
        dorph: {
            name: "'Dorph",
            desc:
                "Designed as a combat drug and painkiller, endorphins reduce pain and stress effects. 'Dorph allows you to reduce the effects of stun or shock. Dorph also has a nasty cost in nervous system damage.",
            type: "Pain Negation",
            cost: 250,
            strength: 2,
            difficulty: 5,
            duration: 1
        },
        blacklace: {
            name: "Black Lace",
            desc: "A high powered version of 'Dorph which imparts euphoria, adrenal rush, and invulnerability to pain.",
            type: "Pain Negation",
            cost: 650,
            strength: 3,
            difficulty: 13,
            duration: 1
        }
    };

    static Log = {
        hit: {
            normal:
                "${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${playerDamage} damage. ${enemyHealth}",
            critical:
                "${str_Critical} ${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${playerDamage} damage. ${enemyHealthCrit}",
            criticalKill:
                "${str_Critical} ${playerName} ${damageType} ${targetName} with ${playerWeapon} and caused ${playerDamage} damage. ${str_damageIndicatorCrit0}",
            kill: "${playerName} killed ${targetName}",
            miss1:
                "${hitMiss} ${playerName} tried to attack ${targetName} but ${pronounS} was able to dodge the ${damageType}!",
            miss2: "${hitMiss} ${playerName} tried to attack ${targetName} but missed!",
            miss3: "${hitMiss} ${targetName} was able to jump away from ${playerName}'s ${damageType}!"
        },
        encounter:
            "You encountered ${targetName}. Just by looking at ${pronounP} attire you can see ${pronounS} is a ${targetRole}",
        encounterSame:
            "You encountered ${targetName}. However you see ${pronounP} is also ${enemyRole} so you just greet ${pronounO} and venture forward.",
        levelUp: "You leveled up from ${actorLevelOld} to ${actorLevel}!",
        death: "You have been killed by ${targetName}",
        dead: "You are dead, try respawning!",
        respawn: "${nanobots}from TraumaTeam revitalize you. You have been charged ${deathCharge} yens.",
        loot: {
            search1:
                "As the blood still flows from ${targetName}'s liquidated carcass, you search through ${pronounP} belongings.",
            search2: "You search through ${targetName}'s belongings.",
            search3:
                "As you advance towards ${targetName}'s dead body you look around if ${pronounS} has anything valuable with ${pronounO}.",
            find: "You found ${lootDrop}.",
            finsSame: "You found ${lootDrop} but as you already have it, you let it be."
        },
        insufficientFunds: "Your funds are insufficient.",
        findMoney: "You found ${currencyDrop}.",
        loseMoney: "You lost ${currencyDrop}."
    };
}
