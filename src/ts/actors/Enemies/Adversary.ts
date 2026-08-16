import {GetItem} from "../../interact/getItem";
import {TacticalAI} from "../../interact/tacticalAI";
import {Armor} from "../../items/Armor";
import {Utils} from "../../utils/utils";
import {Actor} from "../Actor";
import {Archetype} from "../resources/archetypes";
import {Name} from "../resources/Name";
import {Role} from "../resources/Role";

/**
 * A faction enemy built from an Archetype. Carries a real personal name (so
 * targeting stays unambiguous) plus its faction/rank/title for display, and a
 * RED-grounded stat + armour + weapon loadout.
 */
export class Adversary extends Actor {

    constructor(a: Archetype, level: number) {
        super();
        this.gender = Name.getGender();
        this.name = `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.faction = a.faction;
        this.rank = a.rank;
        this.archetype = a.title;
        this.role = new Role(a.portrait);

        this.item = GetItem.item();
        this.items = [this.item];
        if (a.frags !== undefined) { this.frags = a.frags; }
        if (a.parts) { this.kitParts = a.parts; }
        // cap the weapon's dice by rank so mooks can't roll a heavy cannon
        this.weapon = GetItem.weaponOfClass(a.weapons, 3, a.minDice, a.rank <= 3 ? 5 : 6);
        this.temperament = a.temperament === "roll"
            ? TacticalAI.rollTemperament(this.weapon.weaponClass) : a.temperament;

        this.setCombatProfile({
            ref: a.ref, dex: a.dex, body: a.body, will: a.will,
            skill: a.skill, luck: a.luck, roleRank: Math.max(1, a.rank + 1),
        });

        // Body armour (or subdermal, modelled as body SP); a helmet only if headSP > 0.
        this.equipment.upper = new Armor("upper", `${a.faction} Armour`, "", 1, a.bodySP, 0, "");
        if (a.headSP > 0) {
            this.equipment.headgear = new Armor("headgear", `${a.faction} Helmet`, "", 1, a.headSP, 0, "");
        }

        this.level = Math.max(1, Math.floor(level + (a.rank - 1) + Utils.range(-1, 1)));
        this.currency = Math.floor(Utils.range(15, 40) * a.reward);
        this.experience = Math.floor(this.level * 12 * a.reward);
    }
}
