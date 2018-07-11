import { Utils } from "./utils/utils";
import { Player } from "./actors/player";
import { Enemy } from "./actors/Enemy";
import { UI } from "./utils/UI";
import { Combat } from "./interact/combat";
import { Statistics } from "./actors/resources/Statistics";
import { State } from "./utils/State";
import { Messages } from "./interact/messages";
import en_US from "../lang/en_US";

export class Rainfall {
    public static main(): void {
        State.player = new Player();
        State.player.update();
        State.player.updateAfter();
        State.playArea.actors.push(State.player);
        State.currentEnemy = new Enemy();
        State.currentEnemy.update();
        State.currentEnemy.updateAfter();
        State.playArea.actors.push(State.currentEnemy);
        let deadMessageSent = false;
        //UI.initMap();

        Utils.l("hitButton")!.onclick = function() {
            if (State.player!.isAlive()) {
                Combat.basicAction(State.player!, State.currentEnemy!);
            } else if (deadMessageSent === false) {
                Messages.logMessage(en_US.Log.dead);
                deadMessageSent = true;
            }
        };

        //For the people who are stuck
        Utils.l("restartButton")!.onclick = function() {
            window.localStorage.clear();
            location.reload();
        };

        Utils.l("inventoryButton")!.onclick = function() {
            UI.changeInfoPane("inventory");
            UI.updateInventory();
        };
        Utils.l("questsButton")!.onclick = function() {
            UI.changeInfoPane("quests");
        };
        Utils.l("storeButton")!.onclick = function() {
            UI.changeInfoPane("store");
        };
        Utils.l("playerButton")!.onclick = function() {
            UI.changeInfoPane("player");
        };
        Utils.l("raidButton")!.onclick = function() {
            UI.changeInfoPane("raid");
        };
        Utils.l("allianceButton")!.onclick = function() {
            UI.changeInfoPane("alliance");
        };
        Utils.l("statButton")!.onclick = function() {
            UI.changeInfoPane("stats");
            UI.updateStats();
        };

        //Because respawning is so much more enjoyable than restarting
        Utils.l("respawnButton")!.onclick = function() {
            if (!State.player!.isAlive()) {
                State.player!.health = State.player!.maxHealth;
                clearInterval();
                Messages.logMessage(en_US.Log.respawn);
                deadMessageSent = false;
                Statistics.money -= Math.floor(Statistics.money * 0.45);
                UI.updateUI();
            }
        };

        //Functionality for the autoplay (because no one likes to click away)
        let running = false;
        Utils.l("autoButton")!.onclick = function() {
            let int: any;
            if (!running) {
                running = true;
                int = setInterval(function() {
                    if (State.player!.isAlive()) {
                        Combat.basicAction(State.player!, State.currentEnemy!);
                    } else {
                        clearInterval(int);
                        running = false;
                    }
                }, 500);
            } else if (running) {
                running = false;
                clearInterval(int);
            }
        };
        UI.updateUI();
    }
}
