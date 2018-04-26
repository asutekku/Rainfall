define(['nameGen',
        'list_roles',
        'utils',
        'combat',
        'color',
        'messages',
        'list_items',
        'player',
        'UI',
        'enemy',
        'actor'
    ],
    function (nameGen, stat, utils, combat, color, message, items, player, UI,enemy, Actor) {

        let playerActor = player.player;

        /*==========================================================================================
        LOAD GAME
        ============================================================================================*/
        function loadGame() {
            playerActor.level = isNaN(playerActor.level) ? 1 : parseInt(playerActor.level, 10);
            utils.l("charLvl").textContent = (playerActor.level).toString(10);
            playerActor.experience = isNaN(playerActor.experience) ? 0 : playerActor.experience;
            playerActor.maxExperience = isNaN(playerActor.maxExperience) ? 40 : parseInt(playerActor.maxExperience, 10);
            utils.l("charExp").textContent = (playerActor.experience).toString(10) + "/" + (playerActor.maxExperience).toString(10);
            playerActor.health = isNaN(playerActor.health) ? 100 : parseInt(playerActor.health, 10);
            playerActor.maxHealth = isNaN(playerActor.maxHealth) ? 100 : parseInt(playerActor.maxHealth, 10);
            utils.l("charHP").textContent = playerActor.health + "/" + (playerActor.maxHealth).toString(10);
            playerActor.crit = isNaN(playerActor.crit) ? 10 : parseInt(playerActor.crit, 10);
            utils.l("charCRIT").textContent = playerActor.weapon.crit + "%";
            playerActor.critM = isNaN(playerActor.critM) ? 2 : parseInt(playerActor.critM, 10);
            utils.l("charCRITM").textContent = playerActor.critM;
            playerActor.kills = isNaN(playerActor.kills) ? 0 : parseInt(playerActor.kills, 10);
            utils.l("kills").textContent = playerActor.kills;
            playerActor.currency = isNaN(playerActor.currency) ? 0 : parseInt(playerActor.kills, 10);
            utils.l("currency").textContent = playerActor.currency;
        }

        loadGame();

        let grunt = enemy.enemy;
        let currentEnemy = grunt;
        let deadMessageSent = false;
        enemy.updateEnemy();
        player.updatePlayer();
        UI.updateUI(playerActor);

        //Attacks!
        utils.l("hitButton").onclick = function () {
            if (combat.isAlive(playerActor)) {
                combat.basicAction(playerActor, grunt);
            } else if (deadMessageSent === false) {
                message.combat('youredead', playerActor, grunt);
                deadMessageSent = true;
            }
        };

        //For the people who are stuck
        utils.l("restartButton").onclick = function () {
            window.localStorage.clear();
            location.reload();
        };

        //Because respawning is so much more enjoyable than restarting
        utils.l("respawnButton").onclick = function () {
            if (!combat.isAlive(playerActor)) {
                playerActor.health = playerActor.maxHealth;
                clearInterval();
                message.combat('respawn', playerActor, currentEnemy);
                deadMessageSent = false;
                stats.player.money -= Math.floor(stats.player.money * .45);
                UI.updateUI(playerActor);
            }
        }

        //Functionality for the autoplay (because no one likes to click away)
        let running = false;
        utils.l("autoButton").onclick = function () {
            if (!running) {
                running = true;
                myvar = setInterval(function () {
                    if (combat.isAlive(playerActor)) {
                        combat.basicAction(playerActor, grunt);
                    } else {
                        clearInterval(myvar);
                        running = false;
                    }
                }, 500)
            } else if (running) {
                running = false;
                clearInterval(myvar);
            }
        };

        function saveStats() {
            utils.save("pHP", (playerActor.health).toString(10));
            utils.save("pMHP", (playerActor.maxHealth).toString(10));
            utils.save("kills", stats.kills.toString(10));
            utils.save("pEXP", playerActor.experience);
            utils.save("pLVL", playerActor.level);
            utils.save("pMEXP", (playerActor.maxExperience).toString(10));
        }
    });
