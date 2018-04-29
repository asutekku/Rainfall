import {Utils} from "./utils/utils";
import {Player} from "./actors/player";
import {Enemy} from "./actors/Enemy";
import {updateUI, updateStats, initStats} from "./utils/UI";
import {Combat} from "./interact/combat";
import {Messages} from "./interact/messages";
import {Statistics} from "./actors/resources/Statistics";

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
let playerActor = new Player();
playerActor.update();
playerActor.updateAfter();
let grunt = new Enemy();
let deadMessageSent = false;
updateUI(playerActor);

//Attacks!
Utils.l("hitButton").onclick = function () {
    if (playerActor.isAlive()) {
        Combat.basicAction(playerActor, grunt);
    } else if (deadMessageSent === false) {
        Messages.combat('youredead', playerActor, grunt);
        deadMessageSent = true;
    }
};

//For the people who are stuck
Utils.l("restartButton").onclick = function () {
    window.localStorage.clear();
    location.reload();
};

//Because respawning is so much more enjoyable than restarting
Utils.l("respawnButton").onclick = function () {
    if (!playerActor.isAlive()) {
        playerActor.health = playerActor.maxHealth;
        clearInterval();
        Messages.combat('respawn', playerActor, grunt);
        deadMessageSent = false;
        Statistics.money -= Math.floor(Statistics.money * .45);
        updateUI(playerActor);
    }
}

//Functionality for the autoplay (because no one likes to click away)
let running = false;
Utils.l("autoButton").onclick = function () {
    let myvar;
    if (!running) {
        running = true;
        myvar = setInterval(function () {
            if (playerActor.isAlive()) {
                Combat.basicAction(playerActor, grunt);
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
let statsVisible = false;
Utils.l("statButton").onclick = function () {
    if (statsVisible) {
        Utils.l("playareaStats").style.display = "none";
        statsVisible = false;
    }
    else {
        Utils.l("playareaStats").style.display = "block";
        updateStats(playerActor);
        statsVisible = true;
    }
};

function init(){
    initStats();
}
init();