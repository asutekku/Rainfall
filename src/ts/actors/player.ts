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
        this.lifepath = s.lifepath || CharacterCreation.randomLifepath();

        // A RED merc starts armed with a sidearm; Fists are a state, not an
        // item — the equip screens conjure them on demand (see Gear).
        this.weapon = GetItem.weapon("WSA Autopistol");

        // Stats come from the spec where given, otherwise a capable-solo default.
        this.setCombatProfile({
            ref: d(st.ref, 7), dex: d(st.dex, 6), body: d(st.body, 7), will: d(st.will, 6),
            emp: d(st.emp, 8), luck: d(st.luck, 7), roleRank: d(s.roleRank, 6), skill: 4, firstAid: 4,
        });
        if (st.cool !== undefined) { this.stats.cl = st.cool; }
        if (st.int !== undefined) { this.stats.int = st.int; }
        if (st.tech !== undefined) { this.stats.tech = st.tech; }
        // RED MOVE: metres per Move Action. Default 6 keeps the classic run distance.
        this.stats.ma.ma = d(st.move, 6);
        this.stats.ma.run = this.stats.ma.ma * 3;
        this.stats.ma.leap = this.stats.ma.ma / 4;

        // RED: everyone runs armour. Start in a Light Armor Jacket (SP ~ RED Light Armorjack).
        this.equipment.upper = GetItem.armor("Light Armor Jacket");
        this.equipment.headgear = GetItem.armor("Kevlar Helmet");
        // No factory chrome: augs are the career, bought one Humanity chunk at a
        // time from ripperdocs and boss scalps — and they survive every death.
        // A basic cyberdeck loadout for jacking into the NET.
        this.cyberdeck.push(GetItem.program("Zap"));
        this.cyberdeck.push(GetItem.program("Sword"));
        this.cyberdeck.push(GetItem.program("Armor"));
        // A working merc: some street cred, a Nice Conapt, and a ride.
        this.reputation = 2;
        this.currency = 0;    // player-side eddies live in the crew purse (see interact/crew.ts)
    }

    /**
     * RED Improvement Points on level-up: a Player trains toward being a better
     * fighter so leveling scales offence and defence, not just HP.
     * - +1 to the equipped weapon's skill each level (cap 10)
     * - +1 Evasion every other level (cap 8)
     * - +1 to a rotating core stat every third level (cap 8)
     * - HP grows with any BODY/WILL gain, per the RED HP formula
     */
    public override onLevelUp(): void {
        const redHP = (): number => 10 + 5 * Math.ceil((this.stats.bt + this.stats.will) / 2);
        const hpBefore = redHP();

        const r: any = this.skills.ref;
        const key = this.weaponSkillKey();
        if (r[key] < 10) { r[key] += 1; }
        if (this.level % 2 === 0 && r.dodge < 8) { r.dodge += 1; }
        if (this.level % 3 === 0) {
            const order = ["ref", "dex", "bt", "will", "cl"];
            const stat = order[((this.level / 3) | 0) % order.length]!;
            if ((this.stats as any)[stat] < 8) { (this.stats as any)[stat] += 1; }
        }

        const gain = redHP() - hpBefore;   // HP from any BODY/WILL increase this level
        if (gain > 0) { this.maxHealth += gain; this.health += gain; }
    }
}
