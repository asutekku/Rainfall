import {Actor} from '../actors/Actor';
import {MessageCombat} from './messageSchema';

/**
 * The combat feed's message builder. Everything else that used to live here —
 * the ES-template filler, the pronoun/loot string tables, logMessage and its
 * State.player/currentEnemy singletons — belonged to the pre-React game loop
 * and could never run under the React app (the singletons are never set).
 */
export class Messages {

    public static getCombatMessage = (actor: Actor, target: Actor, prevHP: number, damage: number): MessageCombat => {
        const params = {
            msg: 'Hello',
            attacker: actor,
            defender: target,
            attType: actor.weapon.type,
            critical: false,
            damage: damage,
            prevHP: prevHP,
        };
        return new MessageCombat(params);
    };
}
