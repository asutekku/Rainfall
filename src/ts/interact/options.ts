/**
 * Player options — the handful of switches the engine actually has.
 *
 * Deliberately short: every row here changes something real, today. Combat
 * speed feeds the battle scene's playback multiplier (which was a hardcoded
 * 1.6), and the CRT switch turns the scanline/grid/vignette dressing off for
 * anyone whose eyes it fights. There is no audio system yet, so there is no
 * volume slider pretending otherwise.
 */

export type CombatSpeed = "normal" | "fast" | "blitz";

export interface Options {
    v: 1;
    combatSpeed: CombatSpeed;
    /** The scanline / grid / vignette dressing over the whole app. */
    crt: boolean;
    /** Menu animations — the console waking up between screens. */
    fx: boolean;
}

export interface SpeedSpec {
    label: string;
    /** BattleScene playback rate multiplier. */
    mult: number;
    /** One line for the options screen. */
    blurb: string;
}

/** "Fast" is the 1.6 the game has always shipped with — the default moves nothing. */
export const SPEEDS: { [k in CombatSpeed]: SpeedSpec } = {
    normal: {label: "Normal", mult: 1.0, blurb: "every shot at full length — good for reading a fight"},
    fast: {label: "Fast", mult: 1.6, blurb: "the pace the game ships at"},
    blitz: {label: "Blitz", mult: 2.4, blurb: "get to the verdict — turns resolve at a run"},
};

export const SPEED_ORDER: CombatSpeed[] = ["normal", "fast", "blitz"];

const KEY = "rainfall.options.v1";

const DEFAULTS: Options = {v: 1, combatSpeed: "fast", crt: true, fx: true};

export class OptionsStore {

    /** The live copy, so a render never has to touch localStorage. */
    private static current: Options = OptionsStore.read();

    private static read(): Options {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) { return {...DEFAULTS}; }
            const o = JSON.parse(raw);
            return {
                ...DEFAULTS,
                combatSpeed: SPEEDS[o.combatSpeed as CombatSpeed] ? o.combatSpeed : DEFAULTS.combatSpeed,
                crt: typeof o.crt === "boolean" ? o.crt : DEFAULTS.crt,
                fx: typeof o.fx === "boolean" ? o.fx : DEFAULTS.fx,
            };
        } catch { return {...DEFAULTS}; }
    }

    public static load(): Options {
        return {...OptionsStore.current};
    }

    public static save(o: Options): void {
        OptionsStore.current = {...o};
        try { localStorage.setItem(KEY, JSON.stringify(OptionsStore.current)); } catch { /* storage full/blocked */ }
        OptionsStore.apply();
    }

    /** The battle scene's playback multiplier under the current setting. */
    public static speedMult(): number {
        return SPEEDS[OptionsStore.current.combatSpeed].mult;
    }

    /**
     * Push the current options onto the document. The CRT dressing is pure
     * CSS, so the switch is one class on <body> — see `body.no-crt` rules.
     */
    public static apply(): void {
        document.body.classList.toggle("no-crt", !OptionsStore.current.crt);
        document.body.classList.toggle("no-fx", !OptionsStore.current.fx);
    }

    /** Back to shipped defaults (part of "clear all data"). */
    public static clear(): void {
        try { localStorage.removeItem(KEY); } catch { /* fine */ }
        OptionsStore.current = {...DEFAULTS};
        OptionsStore.apply();
    }
}
