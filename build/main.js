define(["require", "exports", "./utils/utils", "./actors/player", "./actors/Enemy", "./utils/UI", "./interact/combat", "./interact/messages", "./actors/resources/stats"], function (require, exports, utils_1, player_1, Enemy_1, UI_1, combat_1, messages_1, stats_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /*==========================================================================================
    LOAD GAME
    ============================================================================================*/
    /*function loadGame() {
        playerActor.level = isNaN(playerActor.level) ? 1 : parseInt(String(playerActor.level), 10);
        Utils.l("charLvl").textContent = (playerActor.level).toString(10);
        playerActor.experience = isNaN(playerActor.experience) ? 0 : playerActor.experience;
        playerActor.maxExperience = isNaN(playerActor.maxExperience) ? 40 : parseInt(playerActor.maxExperience, 10);
        Utils.l("charExp").textContent = (playerActor.experience).toString(10) + "/" + (playerActor.maxExperience).toString(10);
        playerActor.health = isNaN(playerActor.health) ? 100 : parseInt(playerActor.health, 10);
        playerActor.maxHealth = isNaN(playerActor.maxHealth) ? 100 : parseInt(playerActor.maxHealth, 10);
        Utils.l("charHP").textContent = playerActor.health + "/" + (playerActor.maxHealth).toString(10);
        playerActor.crit = isNaN(playerActor.crit) ? 10 : parseInt(playerActor.crit, 10);
        Utils.l("charCRIT").textContent = playerActor.weapon.crit + "%";
        playerActor.critM = isNaN(playerActor.critM) ? 2 : parseInt(playerActor.critM, 10);
        Utils.l("charCRITM").textContent = playerActor.critM;
        playerActor.kills = isNaN(playerActor.kills) ? 0 : parseInt(playerActor.kills, 10);
        Utils.l("kills").textContent = playerActor.kills;
        playerActor.currency = isNaN(playerActor.currency) ? 0 : parseInt(playerActor.kills, 10);
        Utils.l("currency").textContent = playerActor.currency;
    }*/
    //loadGame();
    var playerActor = new player_1.Player();
    console.log(playerActor);
    var grunt = new Enemy_1.Enemy();
    var currentEnemy = grunt;
    var deadMessageSent = false;
    UI_1.updateUI(playerActor);
    //Attacks!
    utils_1.Utils.l("hitButton").onclick = function () {
        if (combat_1.Combat.isAlive(playerActor)) {
            combat_1.Combat.basicAction(playerActor, grunt);
        }
        else if (deadMessageSent === false) {
            messages_1.Messages.combat('youredead', playerActor, grunt);
            deadMessageSent = true;
        }
    };
    //For the people who are stuck
    utils_1.Utils.l("restartButton").onclick = function () {
        window.localStorage.clear();
        location.reload();
    };
    //Because respawning is so much more enjoyable than restarting
    utils_1.Utils.l("respawnButton").onclick = function () {
        if (!combat_1.Combat.isAlive(playerActor)) {
            playerActor.health = playerActor.maxHealth;
            clearInterval();
            messages_1.Messages.combat('respawn', playerActor, currentEnemy);
            deadMessageSent = false;
            stats_1.Stats.money -= Math.floor(stats_1.Stats.money * .45);
            UI_1.updateUI(playerActor);
        }
    };
    //Functionality for the autoplay (because no one likes to click away)
    var running = false;
    utils_1.Utils.l("autoButton").onclick = function () {
        var myvar;
        if (!running) {
            running = true;
            myvar = setInterval(function () {
                if (combat_1.Combat.isAlive(playerActor)) {
                    combat_1.Combat.basicAction(playerActor, grunt);
                }
                else {
                    clearInterval(myvar);
                    running = false;
                }
            }, 500);
        }
        else if (running) {
            running = false;
            clearInterval(myvar);
        }
    };
    function saveStats() {
        utils_1.Utils.save("pHP", (playerActor.health).toString(10));
        utils_1.Utils.save("pMHP", (playerActor.maxHealth).toString(10));
        utils_1.Utils.save("kills", stats_1.Stats.kills.toString(10));
        utils_1.Utils.save("pEXP", playerActor.experience.toString());
        utils_1.Utils.save("pLVL", playerActor.level.toString());
        utils_1.Utils.save("pMEXP", (playerActor.maxExperience).toString(10));
    }
});
