import {GetItem} from "../interact/getItem";
import {TacticalAI} from "../interact/tacticalAI";
import {Armor} from "../items/Armor";
import {Actor} from "./Actor";
import {Name} from "./resources/Name";
import {Role} from "./resources/Role";
import {CharacterCreation} from "./resources/CharacterCreation";
import type {MercOffer} from "../interact/mercMarket";

/**
 * Hired help.
 *
 * Deliberately not a `Player`: no conapt, no car, no cyberdeck, no chrome and
 * no wallet of their own. A merc is a gun you rent — they show up with the kit
 * their fee bought and whatever the crew hands them later. Keeping them lean is
 * what stops a four-strong squad from being four identical chromed solos, and
 * what makes losing one sting without ending the run.
 */
export class Merc extends Actor {

    /** The market offer they came from — stable identity, unlike a rolled name. */
    public offerId: string;
    /** The full offer, retained so a save file can reconstruct this merc. */
    public offer: MercOffer;
    /** What the crew paid for them — shown on the roster, and what a buyout is priced against. */
    public fee: number;
    /** Market tier: Rookie / Pro / Veteran / Legend. */
    public tier: string;

    constructor(offer: MercOffer) {
        super();
        this.gender = Name.getGender();
        this.name = offer.name;
        this.role = new Role(offer.role);
        this.grenades = 1;   // every hire walks in with one frag on the belt
        this.skill = this.role.skill;
        this.lifepath = CharacterCreation.randomLifepath();
        this.offerId = offer.id;
        this.offer = offer;
        this.fee = offer.price;
        this.tier = offer.tier;
        this.auto = true;                     // hired guns fight themselves
        this.hireable = true;                 // and can be lost for good

        this.item = GetItem.item();
        this.weapon = GetItem.weaponOfClass(offer.weapons, 4, offer.minDice, offer.maxDice);
        this.inventory.weapons.push(GetItem.weapon("Fists"));
        this.temperament = TacticalAI.rollTemperament(this.weapon.weaponClass);

        const st = offer.stats;
        this.setCombatProfile({
            ref: st.ref, dex: st.dex, body: st.body, will: st.will, emp: st.emp,
            luck: st.luck, roleRank: offer.roleRank, skill: offer.skill, firstAid: Math.max(2, offer.skill - 2),
        });
        this.stats.cl = st.cool;
        this.stats.int = st.int;
        this.stats.tech = st.tech;
        this.stats.ma.ma = st.move;
        this.stats.ma.run = st.move * 3;
        this.stats.ma.leap = st.move / 4;

        this.equipment.upper = new Armor("upper", offer.armorName, "", 1, offer.armorSP, 0, "");

        this.level = offer.level;
        this.experience = 0;
        this.maxExperience = 100 + Math.floor(Math.pow(offer.level, 1.5) * 5);
        this.currency = 0;                    // eddies live in the crew purse
        this.traumaTeam = false;              // no subscription — that's what the buyout is for
        this.recalculateHealth();
        this.health = this.maxHealth;
    }

    /** What Trauma Team wants to scrape this one off the pavement. */
    public buyoutCost(): number {
        return Math.max(200, Math.round(this.fee * 0.4 / 10) * 10);
    }
}
