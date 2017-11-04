define(['nameGen',
        'list_roles',
        'utils',
        'combat',
        'color',
        'messages',
        'list_items',
        'actors',
        'UI',
        'stats'
    ],
    function (nameGen, stat, utils, combat, color, message, items, actor, UI,stats) {

        var player = actor.player;

        /*==========================================================================================
        LOAD GAME
        ============================================================================================*/
        function loadGame() {
            player.level = isNaN(player.level) ? 1 : parseInt(player.level, 10);
            utils.l("charLvl").textContent = (player.level).toString(10);
            player.experience = isNaN(player.experience) ? 0 : player.experience;
            player.maxExperience = isNaN(player.maxExperience) ? 40 : parseInt(player.maxExperience, 10);
            utils.l("charExp").textContent = (player.experience).toString(10) + "/" + (player.maxExperience).toString(10);
            player.health = isNaN(player.health) ? 100 : parseInt(player.health, 10);
            player.maxHealth = isNaN(player.maxHealth) ? 100 : parseInt(player.maxHealth, 10);
            utils.l("charHP").textContent = player.health + "/" + (player.maxHealth).toString(10);
            player.crit = isNaN(player.crit) ? 10 : parseInt(player.crit, 10);
            utils.l("charCRIT").textContent = player.weapon.crit + "%";
            player.critM = isNaN(player.critM) ? 2 : parseInt(player.critM, 10);
            utils.l("charCRITM").textContent = player.critM;
            stats.kills = isNaN(stats.kills) ? 0 : parseInt(stats.kills, 10);
            utils.l("kills").textContent = stats.kills;
            stats.currency = isNaN(stats.currency) ? 0 : parseInt(stats.kills, 10);
            utils.l("currency").textContent = stats.currency;
        }
    
        
        loadGame();

        var enemy = actor.enemy;
        var currentEnemy = enemy;
        var deadMessageSent = false;
        actor.updateEnemy();
        actor.updatePlayer();
        UI.updateUI(player);

        //Attacks!
        utils.l("hitButton").onclick = function () {
            if (combat.isAlive(player)) {
                combat.basicAction(player, enemy);
            } else if (deadMessageSent == false){
                message.combat('youredead',player,currentEnemy);
                deadMessageSent = true;
            }
        };

        //For the people who are stuck
        utils.l("restartButton").onclick = function () {
            window.localStorage.clear();
            location.reload();
        };

        //Because respawning is so much more enjoybale than restarting
        utils.l("respawnButton").onclick = function () {
            if (!combat.isAlive(player)) {
                player.health = player.maxHealth;
                clearInterval();
                message.combat('respawn', player, currentEnemy);
                deadMessageSent = false;
                stats.player.money -= Math.floor(stats.player.money*.45);
                UI.updateUI(player);
            }
        }

        //Functionality for the autoplay (because no one likes to click away)
        var running = false;
        utils.l("autoButton").onclick = function () {
            if (!running) {
                running = true;
                myvar = setInterval(function () {
                    if (combat.isAlive(player)) {
                        combat.basicAction(player, enemy);
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
            utils.save("pHP", (player.health).toString(10));
            utils.save("pMHP", (player.maxHealth).toString(10));
            utils.save("kills", stats.kills.toString(10));
            utils.save("pEXP", player.experience);
            utils.save("pLVL", player.level);
            utils.save("pMEXP", (player.maxExperience).toString(10));

        }
    });
