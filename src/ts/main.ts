import en_US from "../lang/en_US";
import {Enemy} from "./actors/Enemy";
import {Player} from "./actors/player";
import {Messages} from "./interact/messages";
import {State} from "./utils/State";
import {Utils} from "./utils/utils";

export class Rainfall {
    public static main(): void {
        State.player = new Player();
        State.playArea.actors.push(State.player);
        State.currentEnemy = new Enemy();
        State.currentEnemy.updateAfter();
        State.playArea.actors.push(State.currentEnemy);
        let deadMessageSent = false;
        // UI.initMap();

        Utils.l("hitButton")!.onclick = () => {
            if (State.player!.isAlive()) {
                //Combat.basicAction(State.player!, State.currentEnemy!);
            } else if (deadMessageSent === false) {
                Messages.logMessage(en_US.Log.dead);
                deadMessageSent = true;
            }
        };

        // Functionality for the autoplay (because no one likes to click away)
        let running = false;
        Utils.l("autoButton")!.onclick = () => {
            let int: any;
            if (!running) {
                running = true;
                int = setInterval(() => {
                    if (State.player!.isAlive()) {
                        //Combat.basicAction(State.player!, State.currentEnemy!);
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
    }
}
