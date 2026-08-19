import * as THREE from "three";
import type {Actor} from "../../actors/Actor";
import {FactionStyle, styleFor} from "../../actors/resources/factionStyles";

/**
 * The unit figure, extracted whole from the battle scene so anything can
 * render a body the fight will recognise: the staging merc sheet shows the
 * same model that walks into the street. One construction site — armour is
 * silhouette, faction kit is bolted on the same way, the gun is the same
 * length — so the two views can never drift apart.
 */

/** The unit palette the figure is built from (the scene keeps its own for fx). */
export const FIG_COL = {
    you: 0x37e1e7, ally: 0x7fd67f, foe: 0xe0533f,
    body: 0x232a33, gun: 0x11151b,
};

export interface UnitFigure {
    group: THREE.Group;       // root at ground level
    body: THREE.Group;        // pose target (crouch/flinch/fall)
    legL: THREE.Object3D;
    legR: THREE.Object3D;
    gunTip: THREE.Object3D;   // muzzle world-position anchor
    /** The side/faction accent the figure was inked with. */
    color: number;
}

/** Emissive edge trim for a box mesh — the game's neon-wireframe accent. */
export function figureEdges(mesh: THREE.Mesh, color: number, opacity: number): THREE.LineSegments {
    const e = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry as THREE.BoxGeometry),
        new THREE.LineBasicMaterial({color, transparent: true, opacity}));
    e.position.copy(mesh.position);
    e.rotation.copy(mesh.rotation);
    return e;
}

/** Weapon-class silhouette: how long the thing in their hands reads. */
export function gunLength(a: Actor): number {
    switch (a.weapon.weaponClass) {
        case "sniper": return 1.35;
        case "rifle": return 1.0;
        case "shotgun": return 0.8;
        case "smg": return 0.55;
        case "bow": return 0.6;
        case "melee": return 0.55;
        default: return 0.38;
    }
}

/** The SP that shapes the body: worn plate or subdermal, whichever is more. */
export function bodySPOf(a: Actor): number {
    const worn = a.equipment.upper ? a.equipment.upper.stoppingPower : 0;
    return Math.max(worn, a.cyberSP());
}

/**
 * Build the figure: legs, torso, chest plate, shoulders, head (helmet if
 * worn), visor, faction dress, and the weapon at the hip. Everything the
 * battle scene bolts on top — IFF ring, pick cylinder, name tag — stays in
 * the scene; this is just the body.
 */
export function buildFigure(a: Actor, side: "you" | "ally" | "foe"): UnitFigure {
    const foe = side === "foe";
    const style: FactionStyle | null = foe ? styleFor(a.faction) : null;
    const color = style ? style.accent : FIG_COL[side];
    const bodyCol = style ? style.body : FIG_COL.body;
    const headCol = style ? style.head : 0x1a1f28;
    const rank = a.rank || 1;
    const parts: string[] = style ? [...style.parts, ...(a.kitParts || [])] : [];
    // armour is silhouette: SP 0 reads slim, MetalGear reads like a wall
    const bulk = 1 + (bodySPOf(a) / 18) * 0.32;
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);

    const mat = (c: number) => new THREE.MeshBasicMaterial({color: c});
    const legGeo = new THREE.BoxGeometry(0.24, 0.9, 0.28).translate(0, -0.45, 0);
    const legCol = parts.indexOf("chrome") >= 0 ? 0x9aa4ad : bodyCol;
    const legL = new THREE.Mesh(legGeo, mat(legCol)); legL.position.set(-0.16, 0.9, 0);
    const legR = new THREE.Mesh(legGeo.clone(), mat(legCol)); legR.position.set(0.16, 0.9, 0);
    body.add(legL, legR);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66 * bulk, 0.72, 0.4 * bulk), mat(bodyCol));
    torso.position.y = 1.28;
    body.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5 * bulk, 0.12, 0.42 * bulk), mat(color));
    chest.position.y = 1.5;
    body.add(chest);
    const hasPauldrons = parts.indexOf("pauldrons") >= 0;
    const shW = hasPauldrons ? 0.22 : 0.16;
    const shH = hasPauldrons ? 0.34 : 0.26;
    const shD = hasPauldrons ? 0.42 : 0.34;
    const shX = 0.44 * bulk + (hasPauldrons ? 0.04 : 0);
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(shW, shH, shD), mat(hasPauldrons ? bodyCol : color));
    shoulderL.position.set(-shX, hasPauldrons ? 1.54 : 1.5, 0);
    const shoulderR = shoulderL.clone(); shoulderR.position.x = shX;
    body.add(shoulderL, shoulderR);
    if (hasPauldrons) {   // accent cap on each hard-shell shoulder
        const capL = new THREE.Mesh(new THREE.BoxGeometry(shW + 0.02, 0.05, shD + 0.02), mat(color));
        capL.position.set(-shX, 1.73, 0);
        const capR = capL.clone(); capR.position.x = shX;
        body.add(capL, capR);
    }

    const helmeted = !!a.equipment.headgear;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.36), mat(headCol));
    head.position.y = 1.85;
    body.add(head);
    if (helmeted) {
        const helm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.42), mat(bodyCol));
        helm.position.y = 1.94;
        body.add(helm);
        body.add(figureEdges(helm, color, 0.55));
    }
    const visorFull = parts.indexOf("visorFull") >= 0;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(visorFull ? 0.3 : 0.3, visorFull ? 0.18 : 0.09, 0.05), mat(color));
    visor.position.set(0, visorFull ? 1.85 : 1.87, 0.19);
    body.add(visor);

    dressFigure(body, parts, {accent: color, bodyCol, torso, mat});

    // rank presence: heavies get emissive accent trim, bosses get real mass
    if (foe && rank >= 4) { body.add(figureEdges(torso, color, 0.85)); }
    group.scale.setScalar(1.12 * (rank >= 5 ? 1.22 : foe && rank === 4 ? 1.07 : 1));

    const gun = new THREE.Group();
    const gl = gunLength(a);
    const melee = a.weapon.weaponClass === "melee";
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, melee ? gl : 0.12, melee ? 0.09 : gl), mat(FIG_COL.gun));
    barrel.position.set(0, melee ? gl / 2 : 0, melee ? 0 : gl / 2);
    gun.add(barrel);
    if (a.weapon.weaponClass === "sniper") {   // scope + muzzle: the long-rifle silhouette
        const scope = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.3), mat(0x2a2f38));
        scope.position.set(0, 0.11, gl * 0.42);
        gun.add(scope);
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.14), mat(0x2a2f38));
        muzzle.position.set(0, 0, gl - 0.06);
        gun.add(muzzle);
    }
    const tip = new THREE.Object3D();
    tip.position.set(0, melee ? gl : 0, melee ? 0 : gl);
    gun.add(tip);
    gun.position.set(0.3, 1.32, 0.22);
    body.add(gun);

    return {group, body, legL, legR, gunTip: tip, color};
}

/** Bolt the faction silhouette kit onto a base figure. */
function dressFigure(body: THREE.Group, parts: string[],
                     c: {accent: number; bodyCol: number; torso: THREE.Mesh;
                         mat: (n: number) => THREE.MeshBasicMaterial}): void {
    const add = (m: THREE.Mesh) => body.add(m);
    for (const part of parts) {
        switch (part) {
            case "mohawk": {
                const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.34), c.mat(c.accent));
                m.position.set(0, 2.08, 0); add(m);
                break;
            }
            case "nose": {
                const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.07), c.mat(0xe0533f));
                m.position.set(0, 1.82, 0.21); add(m);
                break;
            }
            case "rags": {   // asymmetric junk plating, stitched on wherever it fits
                const spots: Array<[number, number, number, number]> = [
                    [-0.26, 1.36, 0.21, 0.35], [0.2, 1.18, 0.21, -0.25], [0.3, 1.52, -0.2, 0.4]];
                for (const [x, y, z, rot] of spots) {
                    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.05), c.mat(0x4a3b2c));
                    m.position.set(x, y, z); m.rotation.z = rot; add(m);
                }
                break;
            }
            case "bulkArms": {   // Animals: arms like girders
                const armL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.64, 0.34), c.mat(c.bodyCol));
                armL.position.set(-0.52, 1.28, 0);
                const armR = armL.clone(); armR.position.x = 0.52;
                add(armL); add(armR);
                break;
            }
            case "crest": {
                const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.44), c.mat(c.accent));
                m.position.set(0, 2.14, 0); add(m);
                break;
            }
            case "optics": {   // glowing sensor trio where a face should be
                for (const x of [-0.1, 0, 0.1]) {
                    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), c.mat(c.accent));
                    m.position.set(x, 1.94, 0.19); add(m);
                }
                break;
            }
            case "spikes": {
                for (const x of [-0.44, -0.36, 0.36, 0.44]) {
                    const m = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), c.mat(0x39404b));
                    m.position.set(x, 1.72, 0); add(m);
                }
                break;
            }
            case "mask": {   // pale ghost faceplate
                const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.04), c.mat(c.accent));
                m.position.set(0, 1.85, 0.2); add(m);
                break;
            }
            case "cap": {
                const top = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.38), c.mat(c.bodyCol));
                top.position.set(0, 2.05, 0); add(top);
                const brim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.16), c.mat(c.bodyCol));
                brim.position.set(0, 2.01, 0.26); add(brim);
                break;
            }
            case "antenna": {
                const whip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), c.mat(0x2a2f38));
                whip.position.set(-0.46, 1.95, -0.1); add(whip);
                const tip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), c.mat(c.accent));
                tip.position.set(-0.46, 2.22, -0.1); add(tip);
                break;
            }
            case "backpack": {
                const pack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.2), c.mat(c.bodyCol));
                pack.position.set(0, 1.34, -0.32); add(pack);
                const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.22), c.mat(c.accent));
                stripe.position.set(0, 1.44, -0.32); add(stripe);
                break;
            }
            case "cross": {   // medic cross on the chest
                const h = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.03), c.mat(c.accent));
                h.position.set(0, 1.36, 0.22 * 1.2); add(h);
                const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.03), c.mat(c.accent));
                v.position.set(0, 1.36, 0.22 * 1.2); add(v);
                break;
            }
            case "coat": {   // longcoat panels hanging off the back
                for (const x of [-0.18, 0.18]) {
                    const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.05), c.mat(c.bodyCol));
                    m.position.set(x, 0.82, -0.24); m.rotation.x = 0.08; add(m);
                }
                break;
            }
            case "chrome": {   // exposed cyberware: emissive seams over the frame
                body.add(figureEdges(c.torso, c.accent, 0.9));
                break;
            }
            case "bandolier": {   // frags slung across the chest
                for (let i = 0; i < 4; i++) {
                    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.06),
                        c.mat(i === 0 ? c.accent : 0x39404b));
                    m.position.set(-0.18 + i * 0.13, 1.5 - i * 0.11, 0.23); add(m);
                }
                break;
            }
        }
    }
}
