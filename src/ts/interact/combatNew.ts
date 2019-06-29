import {GameObject} from "../items/GameObject";
import {Actor} from "../actors/Actor";
import {Skill} from "../items/Skill";

class CombatNew {

    public attack(actor: Actor, target: GameObject, skill: Skill): any {
        new Attack('attack', actor, target);
        const damageDealt = actor.getDamage();
        let targetStoppingPower: number = 0;
        if (target instanceof Actor) {
            targetStoppingPower = target.getStoppingPower();
        }
        let damage = damageDealt - targetStoppingPower;
        target.receiveDamage(damage);
    }

    public defend(actor: Actor, target: GameObject) {
        new Action('defend', actor, target);
    }

    public dodge(actor: Actor, target: GameObject) {
        new Action('dodge', actor, target);
    }

    private shoot() {

    }
}

class Action {
    type: string;
    actor: GameObject;
    target: GameObject;

    constructor(type: string, actor: Actor, target: GameObject) {
        this.type = type;
        this.actor = actor;
        this.target = target;
    }
}

class Attack extends Action {
    constructor(type: string, actor: Actor, target: GameObject) {
        super(type, actor, target);
    }
}