import {Utils} from "./utils/utils";
import {Player} from "./actors/player";
import {Enemy} from "./actors/Enemy";
import {updateUI, updateStats, initStats, initMap} from "./utils/UI";
import {Combat} from "./interact/combat";
import {Messages} from "./interact/messages";
import {Statistics} from "./actors/resources/Statistics";
import {State} from "./utils/State";

let playerActor = new Player();
let playArea = State.playArea;
playerActor.update();
playerActor.updateAfter();
State.playArea.actors.push(playerActor);
let grunt = new Enemy();
State.playArea.actors.push(grunt);
let deadMessageSent = false;
updateUI(playerActor);

//Attacks!
Utils.l("hitButton").onclick = function () {
    if (playerActor.isAlive()) {
        Combat.basicAction(playerActor, grunt);
    } else if (deadMessageSent === false) {
        Messages.combat("youredead", playerActor, grunt);
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
        Messages.combat("respawn", playerActor, grunt);
        deadMessageSent = false;
        Statistics.money -= Math.floor(Statistics.money * 0.45);
        updateUI(playerActor);
    }
};

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
        }, 500);
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
    } else {
        Utils.l("playareaStats").style.display = "block";
        updateStats(playerActor);
        initMap();
        statsVisible = true;
    }
};

function init() {
    initStats();
}

init();
