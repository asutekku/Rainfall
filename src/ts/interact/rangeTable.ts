/**
 * Cyberpunk RED ranged-combat Difficulty Values.
 *
 * To hit at range you must beat the DV for your weapon class at the target's
 * distance band. `null` means the target is beyond the weapon's effective
 * range (an automatic miss). Melee is resolved as an opposed check elsewhere,
 * so it is not in this table.
 *
 * Bands (metres): 0-6, 7-12, 13-25, 26-50, 51-100, 101-200, 201-400, 401-800.
 * Source: Cyberpunk RED core rulebook, Ranged Combat DV table.
 */
type DVRow = Array<number | null>;

const BANDS: number[] = [6, 12, 25, 50, 100, 200, 400, 800];

const DV: { [weaponClass: string]: DVRow } = {
    //         0-6  7-12 13-25 26-50 51-100 101-200 201-400 401-800
    pistol:  [13,  15,  20,   25,   30,    null,   null,   null],
    smg:     [15,  13,  15,   20,   25,    25,     30,     null],
    shotgun: [13,  15,  20,   25,   30,    35,     null,   null],
    rifle:   [17,  16,  15,   13,   15,    20,     25,     30],
    sniper:  [30,  25,  25,   20,   15,    16,     17,     20],
    bow:     [15,  15,  20,   25,   30,    null,   null,   null],
};

/**
 * The DV to hit a target of the given weapon class at the given distance, or
 * null if the target is out of range. Unknown classes fall back to pistol.
 */
export function rangeDV(weaponClass: string, distance: number): number | null {
    const row = DV[weaponClass] || DV.pistol;
    for (let i = 0; i < BANDS.length; i++) {
        if (distance <= BANDS[i]) {
            return row[i];
        }
    }
    return null;
}
