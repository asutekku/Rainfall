import {GetItem} from "../interact/getItem";
import {Actor} from "./Actor";
import {Name} from "./resources/Name";
import {Role} from "./resources/Role";
import {CharacterCreation, CharacterSpec} from "./resources/CharacterCreation";

export class Player extends Actor {
    /**
     * Create a player. With no argument the default "capable solo" is built.
     * Pass a CharacterSpec (e.g. from CharacterCreation.random(), or a hand-built
     * spec from a creation screen) to choose role, stats, name and lifepath.
     */
    constructor(spec?: CharacterSpec) {
        super();
        const s: CharacterSpec = spec || {};
        const st = s.stats || {};
        const d = (v: number | undefined, def: number): number => (v === undefined ? def : v);

        this.gender = Name.getGender();
        this.level = 1;
        this.name = s.name || `${Name.getFirstname(this.gender)} ${Name.getSurname()}`;
        this.role = s.role ? new Role(s.role) : new Role();
        this.skill = this.role.skill;
        this.lifepath = s.lifepath || CharacterCreation.randomLifepath();
        this.item = GetItem.item();

        // A RED merc starts armed with a sidearm; Fists stay as a fallback.
        this.weapon = GetItem.weapon("WSA Autopistol");
        this.inventory.weapons.push(GetItem.weapon("Fists"));

        // Stats come from the spec where given, otherwise a capable-solo default.
        this.setCombatProfile({
            ref: d(st.ref, 7), dex: d(st.dex, 6), body: d(st.body, 7), will: d(st.will, 6),
            emp: d(st.emp, 8), luck: d(st.luck, 7), roleRank: d(s.roleRank, 6), skill: 4, firstAid: 4,
        });
        if (st.cool !== undefined) { this.stats.cl = st.cool; }
        if (st.int !== undefined) { this.stats.int = st.int; }
        if (st.tech !== undefined) { this.stats.tech = st.tech; }

        this.traumaTeam = true; // carries a Trauma Team subscription
        // RED: everyone runs armour. Start in a Light Armor Jacket (SP ~ RED Light Armorjack).
        this.equipment.upper = GetItem.armor("Light Armor Jacket");
        this.equipment.headgear = GetItem.armor("Kevlar Helmet");
        // A chromed-up solo's starting loadout (each install pays Humanity Loss).
        this.installCyberware(GetItem.cyberware("Neural Link"));
        this.installCyberware(GetItem.cyberware("Cybereye w/ Targeting Scope"));
        this.installCyberware(GetItem.cyberware("Sandevistan"));
        this.installCyberware(GetItem.cyberware("Subdermal Armor"));
        this.installCyberware(GetItem.cyberware("Wolvers")); // grants a 3d6 melee cyberweapon
        // A basic cyberdeck loadout for jacking into the NET.
        this.cyberdeck.push(GetItem.program("Zap"));
        this.cyberdeck.push(GetItem.program("Sword"));
        this.cyberdeck.push(GetItem.program("Armor"));
        // A working merc: some street cred, a Nice Conapt, and a ride.
        this.reputation = 2;
        this.housing = "NiceConapt";
        this.vehicle = GetItem.vehicle("CityCar");
        this.currency = 1000; // starting eddies to cover early cost of living
    }
}
