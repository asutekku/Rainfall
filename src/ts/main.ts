import {Utils} from "./utils/utils";
import {Player} from "./actors/player";
import {Enemy} from "./actors/Enemy";
import {UI} from "./utils/UI";
import {Combat} from "./interact/combat";
import {Messages} from "./interact/messages";
import {Statistics} from "./actors/resources/Statistics";
import {State} from "./utils/State";

export class Rainfall {
    public static main(): void {
        State.player = new Player();
        State.player.update();
        State.player.updateAfter();
        State.playArea.actors.push(State.player);
        let grunt = new Enemy();
        State.playArea.actors.push(grunt);
        let deadMessageSent = false;
        UI.updateUI(State.player);
        //UI.initMap();

        Utils.l("hitButton").onclick = function () {
            if (State.player.isAlive()) {
                Combat.basicAction(State.player, grunt);
            } else if (deadMessageSent === false) {
                Messages.combat("youredead", State.player, grunt);
                deadMessageSent = true;
            }
        };

        //For the people who are stuck
        Utils.l("restartButton").onclick = function () {
            window.localStorage.clear();
            location.reload();
        };

        Utils.l("inventoryButton").onclick = function () {
            UI.changeInfoPane("inventory");
            UI.updateInventory();
        };
        Utils.l("questButton").onclick = function () {
            UI.changeInfoPane("quests");
        };
        Utils.l("storeButton").onclick = function () {
            UI.changeInfoPane("store");
        };
        Utils.l("playerButton").onclick = function () {
            UI.changeInfoPane("player");
        };
        Utils.l("raidButton").onclick = function () {
            UI.changeInfoPane("raid");
        };
        Utils.l("allianceButton").onclick = function () {
            UI.changeInfoPane("alliance");
        };
        Utils.l("statButton").onclick = function () {
            UI.changeInfoPane("stats");
            UI.updateStats(State.player);
        };

        //Because respawning is so much more enjoyable than restarting
        Utils.l("respawnButton").onclick = function () {
            if (!State.player.isAlive()) {
                State.player.health = State.player.maxHealth;
                clearInterval();
                Messages.combat("respawn", State.player, grunt);
                deadMessageSent = false;
                Statistics.money -= Math.floor(Statistics.money * 0.45);
                UI.updateUI(State.player);
            }
        };

        //Functionality for the autoplay (because no one likes to click away)
        let running = false;
        Utils.l("autoButton").onclick = function () {
            let myvar;
            if (!running) {
                running = true;
                myvar = setInterval(function () {
                    if (State.player.isAlive()) {
                        Combat.basicAction(State.player, grunt);
                    } else {
                        clearInterval(myvar);
                        running = false;
                    }
                }, 1000);
            } else if (running) {
                running = false;
                clearInterval(myvar);
            }
        };
    }
}
