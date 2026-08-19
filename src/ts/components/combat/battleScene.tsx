import * as React from "react";
import * as THREE from "three";
import {Actor} from "../../actors/Actor";
import {BLAST_RADIUS, Battlefield, Point} from "../../interact/battlefield";
import {AbilityEvent, BattleEvent, BlastEvent, CoverGoneEvent, HackEvent, MoveEvent, RoutEvent,
    ShotEvent, StabilizeEvent, SuppressEvent} from "../../interact/battleEvents";
import {Streetscape, generateStreetscape} from "../../interact/streetscape";
import {STATUS} from "../../interact/statuses";
import {ShownState} from "../../interact/shownState";
import {styleFor} from "../../actors/resources/factionStyles";
import {buildFigure, figureEdges} from "./unitModel";

/**
 * The 3D battle arena: a procedural rain-slick street in the same holographic
 * neon language as the run map. Units live at their real battlefield metres
 * (x across the street, y down it → world x/z), so the picture always matches
 * the dice.
 *
 * The scene is a *playback* renderer: the engine resolves one unit's turn into
 * a BattleEvent script, this component animates it (walk, muzzle flash,
 * tracers, impacts, falls), then reports done so the sequencer can hand out
 * the next turn. Combat is fully automatic — the scene is a viewer, not an
 * input surface.
 */

export interface PlaybackBundle {
    id: number;
    events: BattleEvent[];
}

/**
 * Something happened to the fight itself, and the board should say so.
 *
 * The opening contact banner was the only on-screen announcement the arena had,
 * and it was wired exclusively to a fresh street. Reinforcements arriving and a
 * Trauma Team revive both only ever reached the text feed — so more hostiles
 * simply appeared, and being dragged back onto your feet was indistinguishable
 * from a new encounter.
 */
export interface BattleNotice {
    id: number;
    title: string;
    sub: string;
    tone: "warn" | "good";
}

export interface BattleSceneProps {
    party: Actor[];
    enemies: Actor[];
    battleId: number;                       // new value = new encounter = new street
    playback: PlaybackBundle | null;        // latest resolved turn to animate
    onPlaybackDone: (id: number) => void;
    /** A round landed: the board's health walks down at the moment it is drawn. */
    onImpact: (target: Actor, damage: number) => void;
    /** A medic got someone back up: the board's health follows it the other way. */
    onMend: (target: Actor, hp: number) => void;
    /** Health as the board is drawing it, rather than what the engine already knows. */
    shown: ShownState;
    /** A fight-level announcement to put over the street (reinforcements, revive). */
    notice: BattleNotice | null;
    speed: number;                          // playback rate multiplier
    activeName?: string | undefined;        // unit whose turn it is (ring highlight)
}

// ---------------------------------------------------------------------------

/** Middle of the street down its length (Battlefield runs y 0-44) — the phone camera's anchor. */
const ARENA_MID = 22;

const COL = {
    you: 0x37e1e7, ally: 0x7fd67f, foe: 0xe0533f, foeElite: 0xf0a830,
    body: 0x232a33, foeBody: 0x2c2126, gun: 0x11151b,
    tracerFriend: 0x9df3f6, tracerFoe: 0xff8a66,
};

const BUILDING_TONES = [0x86392e, 0x5f2c26, 0x3a3f47];

interface UnitView {
    actor: Actor;
    side: "you" | "ally" | "foe";
    color: number;
    accent: number;           // faction accent: tracers, slash arcs, trim
    group: THREE.Group;       // root at ground level (world position)
    body: THREE.Group;        // crouch/flinch/fall pose target
    legL: THREE.Object3D;
    legR: THREE.Object3D;
    gunTip: THREE.Object3D;   // muzzle world-position anchor
    ring: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    pick: THREE.Mesh;         // generous invisible cylinder for tapping
    tag: HTMLDivElement;
    hpFill: HTMLElement;
    visPos: Point;            // displayed battlefield position
    yaw: number;
    targetYaw: number;
    crouch: number;           // 0..1 blended pose
    walk: number;             // walk-cycle phase
    walking: boolean;
    sprinting: boolean;       // all-out melee close: faster gait, forward lean
    air: number;              // metres off the ground (boss leap)
    fallen: number;           // 0..1 blended fall
    faded: boolean;           // flatlined → nearly invisible
    flinch: number;           // >0 = seconds of flinch left
    laser: {line: THREE.Line; attr: THREE.BufferAttribute; dot: THREE.Sprite} | null;   // sniper paint beam
}

/** One playback step: drives the scene for `dur` seconds, then `end` snaps state. */
interface Act {
    dur: number;
    t: number;
    start?: () => void;
    update?: (k: number, dt: number) => void;   // k = 0..1 progress
    end?: () => void;
}

/** Fire-and-forget effect (tracer, sparks, flash) updated every frame. */
interface Fx { update: (dt: number) => boolean; }

export class BattleScene extends React.Component<BattleSceneProps, {}> {

    private mount = React.createRef<HTMLDivElement>();
    private overlay = React.createRef<HTMLDivElement>();
    private renderer!: THREE.WebGLRenderer;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private units: UnitView[] = [];
    private fx: Fx[] = [];
    private acts: Act[] = [];
    private playingId = 0;               // playback id currently animating (0 = none)
    private doneId = 0;                  // last playback id reported done
    private builtBattle = -1;
    private scape: Streetscape | null = null;
    private streetGroup: THREE.Group | null = null;
    private raf = 0;
    private t = 0;
    private last = 0;
    private reduced = false;
    private shakeT = 0;                  // camera-shake seconds left (explosions)
    private ro: ResizeObserver | null = null;
    private camDist = 46;
    private focus = new THREE.Vector3(0, 0, 18);
    private focusGoal = new THREE.Vector3(0, 0, 18);
    // engagement framing: yaw/zoom/elevation ease toward these each frame
    private camYaw = 0;
    private camYawG = 0;
    private camZoom = 1;
    private camZoomG = 1;
    private camEl = 0.62;
    private camElG = 0.62;
    private rain: THREE.LineSegments | null = null;
    private rainVel: number[] = [];
    private smokeClouds: Array<{x: number; y: number; sprites: THREE.Sprite[]; phase: number; dying: boolean}> = [];
    private coverViews: Map<string, THREE.Group> = new Map();
    private signMats: Array<{mat: THREE.MeshBasicMaterial; base: number; flicker: boolean; phase: number}> = [];
    private ventSprites: Array<{s: THREE.Sprite; phase: number}> = [];
    /** Floaters still on screen per unit, so a second one stacks instead of overlapping. */
    private floaters: Map<string, number> = new Map();
    private noticeShown = 0;

    // ------------------------------------------------------------ lifecycle --

    public override componentDidMount() { this.init(); }

    public override componentDidUpdate() {
        if (!this.renderer) { return; }
        const n = this.props.notice;
        if (n && n.id !== this.noticeShown) {
            this.noticeShown = n.id;
            this.banner(n.title, n.sub, n.tone === "good" ? "#7fd67f" : "#f0a830", 2600);
        }
        if (this.props.battleId !== this.builtBattle) { this.rebuild(); }
        // reinforcements: new hostiles joined an ongoing fight — dress and place them
        for (const a of this.props.enemies) {
            if (!this.unitFor(a)) {
                const u = this.buildUnit(a, "foe");
                this.units.push(u);
                this.snapUnit(u);
                this.spawnPulse(u, u.accent);
            }
        }
        const pb = this.props.playback;
        if (pb && pb.id !== this.playingId && pb.id !== this.doneId) { this.beginPlayback(pb); }
    }

    public override componentWillUnmount() {
        cancelAnimationFrame(this.raf);
        if (this.ro) { this.ro.disconnect(); }
        window.removeEventListener("resize", this.resize);
        if (this.renderer) {
            const el = this.renderer.domElement;
            this.renderer.dispose();
            if (el.parentNode) { el.parentNode.removeChild(el); }
        }
    }

    private init() {
        const host = this.mount.current;
        if (!host) { return; }
        this.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 500;
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x07080c, 70, 150);
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 400);
        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(w, h);
        this.renderer.setClearColor(0x07080c, 1);
        host.appendChild(this.renderer.domElement);

        this.buildRain();
        this.rebuild();

        window.addEventListener("resize", this.resize);
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(host);
        this.fitCamera(w, h);
        // a turn may already be waiting (remount mid-fight) — pick it up
        const pb = this.props.playback;
        if (pb && pb.id !== this.doneId) { this.beginPlayback(pb); }
        this.last = performance.now();
        this.animate();
    }

    /** New encounter: fresh street, fresh unit views. */
    private rebuild() {
        this.builtBattle = this.props.battleId;
        this.acts = [];
        this.playingId = 0;
        if (this.streetGroup) { this.scene.remove(this.streetGroup); }
        this.units.forEach((u) => {
            this.scene.remove(u.group); this.scene.remove(u.pick); u.tag.remove();
            this.dropLaser(u);
        });
        this.units = [];
        this.smokeClouds.forEach((c) => c.sprites.forEach((s) => {
            this.scene.remove(s);
            (s.material as THREE.Material).dispose();
        }));
        this.smokeClouds = [];
        this.scape = generateStreetscape(this.props.battleId * 7919 + 13, Battlefield.COVER);
        this.signMats = [];
        this.ventSprites = [];
        this.streetGroup = this.buildStreet(this.scape);
        this.scene.add(this.streetGroup);
        this.props.party.forEach((a, i) => this.units.push(this.buildUnit(a, i === 0 ? "you" : "ally")));
        this.props.enemies.forEach((a) => this.units.push(this.buildUnit(a, "foe")));
        this.units.forEach((u) => this.snapUnit(u));
        // opening dolly: start tight on the hostiles, sweep out to the overview
        const foes = this.props.enemies.filter((e) => e.canFight());
        const boss = foes.find((f) => (f.rank || 0) >= 5);
        if (foes.length) {
            const cx = foes.reduce((s, f) => s + f.position.x, 0) / foes.length;
            const cy = foes.reduce((s, f) => s + f.position.y, 0) / foes.length;
            this.focus.set(cx, 0, cy);
            this.camZoom = 0.5;
            this.camYaw = 0.4;
            this.camEl = 0.5;
        }
        this.frameOverview();
        this.focusGoal.set(0, 0, 18);
        if (boss && !this.reduced) {
            // boss entrance: hold tight on the heavy, pulse the ground, then sweep out
            this.focus.set(boss.position.x, 0, boss.position.y);
            this.camZoom = 0.42;
            this.camEl = 0.42;
            this.acts.push({dur: 1.4, t: 0, start: () => {
                this.focusGoal.set(boss.position.x, 0, boss.position.y);
                this.camZoomG = 0.45;
                this.camElG = 0.45;
                const bu = this.unitFor(boss);
                if (bu) { this.spawnPulse(bu, bu.accent); }
            }});
            this.acts.push({dur: 0.05, t: 0, end: () => {
                this.frameOverview();
                this.focusGoal.set(0, 0, 18);
            }});
        }
        this.showBanner(foes, boss);
    }

    /** Anything the fight needs to say out loud, over the street. */
    private banner(title: string, sub: string, accent: string, ms: number, boss: boolean = false) {
        const host = this.overlay.current;
        if (!host) { return; }
        const el = document.createElement("div");
        el.className = "bsBanner" + (boss ? " boss" : "");
        el.style.borderColor = accent;
        el.innerHTML = `<b style="color:${accent}">${title}</b><span>${sub}</span>`;
        host.appendChild(el);
        window.setTimeout(() => el.remove(), ms);
    }

    /** Faction contact banner over the opening dolly. */
    private showBanner(foes: Actor[], boss: Actor | undefined) {
        if (!foes.length) { return; }
        const lead = boss || foes[0]!;
        const faction = (lead.faction || "HOSTILES").toUpperCase();
        const accent = "#" + styleFor(lead.faction).accent.toString(16).padStart(6, "0");
        this.banner(`⚠ ${faction}`,
            boss ? `${lead.name} — ${lead.archetype || "heavy"}`
                 : `${foes.length} HOSTILE${foes.length > 1 ? "S" : ""}`,
            accent, boss ? 3400 : 2600, !!boss);
    }

    /** Tear down a unit's sniper beam (target dropped, lock spent, or rebuild). */
    private dropLaser(u: UnitView) {
        if (!u.laser) { return; }
        this.scene.remove(u.laser.line);
        this.scene.remove(u.laser.dot);
        u.laser.line.geometry.dispose();
        (u.laser.line.material as THREE.Material).dispose();
        (u.laser.dot.material as THREE.Material).dispose();
        u.laser = null;
    }

    // -------------------------------------------------------------- street --

    private box(w: number, h: number, d: number, color: number, opacity: number = 1): THREE.Mesh {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({
            color, transparent: opacity < 1, opacity, depthWrite: opacity >= 0.6,
        }));
        return m;
    }

    private edges(mesh: THREE.Mesh, color: number, opacity: number): THREE.LineSegments {
        return figureEdges(mesh, color, opacity);
    }

    private signTexture(text: string, color: number, vertical: boolean): THREE.CanvasTexture {
        const cv = document.createElement("canvas");
        const chars = Array.from(text);
        if (vertical) { cv.width = 64; cv.height = 64 * Math.max(2, chars.length); }
        else { cv.width = 256; cv.height = 96; }
        const ctx = cv.getContext("2d")!;
        ctx.fillStyle = "rgba(8,8,12,0.88)";
        ctx.fillRect(0, 0, cv.width, cv.height);
        const css = "#" + color.toString(16).padStart(6, "0");
        ctx.shadowColor = css;
        ctx.shadowBlur = 14;
        ctx.fillStyle = css;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (vertical) {
            ctx.font = "bold 44px monospace";
            chars.forEach((c, i) => ctx.fillText(c, 32, 32 + i * 64 + 32 - 32 + 32));
        } else {
            ctx.font = "bold 52px monospace";
            ctx.fillText(text, 128, 50, 236);
        }
        return new THREE.CanvasTexture(cv);
    }

    private buildStreet(s: Streetscape): THREE.Group {
        const g = new THREE.Group();
        const depthLen = s.depth[1] - s.depth[0];
        const depthMid = (s.depth[0] + s.depth[1]) / 2;

        // asphalt + sidewalks
        const road = this.box(s.roadHalf * 2, 0.2, depthLen, 0x0b0d12);
        road.position.set(0, -0.1, depthMid);
        g.add(road);
        for (const side of [-1, 1]) {
            const wWalk = s.walkHalf - s.roadHalf;
            const walk = this.box(wWalk, 0.36, depthLen, 0x131720);
            walk.position.set(side * (s.roadHalf + wWalk / 2), -0.08, depthMid);
            g.add(walk);
            // kerb glow line
            const kerb = this.box(0.12, 0.3, depthLen, 0x1e3f46);
            kerb.position.set(side * s.roadHalf, -0.04, depthMid);
            g.add(kerb);
        }
        // centre lane dashes
        for (let y = s.depth[0]; y < s.depth[1]; y += 6) {
            const dash = this.box(0.28, 0.02, 2.6, 0x3a3f2c);
            dash.position.set(0, 0.11, y);
            g.add(dash);
        }

        // buildings + windows + neon
        const windowPts: number[] = [];
        const windowCol: number[] = [];
        const addBuilding = (b: {x: number; y: number; w: number; d: number; h: number; tone: number}, dim: number) => {
            const fill = this.box(b.w, b.h, b.d, BUILDING_TONES[b.tone]!, 0.34 * dim);
            fill.position.set(b.x, b.h / 2, b.y);
            (fill.material as THREE.MeshBasicMaterial).depthWrite = true;
            g.add(fill);
            g.add(this.edges(fill, 0xe07a5f, 0.35 * dim));
            // window dots on the street-facing wall
            const face = b.x > 0 ? b.x - b.w / 2 : b.x + b.w / 2;
            const nx = Math.max(2, Math.floor(b.d / 2.4));
            const ny = Math.max(2, Math.floor(b.h / 2.6));
            for (let i = 0; i < nx; i++) {
                for (let j = 0; j < ny; j++) {
                    if (Math.random() < 0.55) { continue; }
                    windowPts.push(face + (b.x > 0 ? -0.01 : 0.01),
                        1.6 + (j + 0.5) * (b.h - 2) / ny,
                        b.y - b.d / 2 + (i + 0.5) * b.d / nx);
                    const c = new THREE.Color(Math.random() < 0.75 ? 0xd8b06a : 0x6ad2d8);
                    c.multiplyScalar(0.35 + Math.random() * 0.6);
                    windowCol.push(c.r, c.g, c.b);
                }
            }
        };
        s.buildings.forEach((b) => addBuilding(b, 1));
        s.backdrop.forEach((b) => addBuilding(b, 0.7));
        if (windowPts.length) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(windowPts, 3));
            geo.setAttribute("color", new THREE.Float32BufferAttribute(windowCol, 3));
            g.add(new THREE.Points(geo, new THREE.PointsMaterial({
                size: 0.42, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true})));
        }

        // neon signs
        s.signs.forEach((sign) => {
            const mat = new THREE.MeshBasicMaterial({
                color: sign.text ? 0xffffff : sign.color, transparent: true, opacity: 0.92,
                side: THREE.DoubleSide, depthWrite: false,
            });
            if (sign.text) { mat.map = this.signTexture(sign.text, sign.color, sign.vertical); }
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sign.w, sign.tall), mat);
            mesh.position.set(sign.x, sign.h + sign.tall / 2, sign.y);
            mesh.rotation.y = sign.face < 0 ? Math.PI / 2 : -Math.PI / 2;
            g.add(mesh);
            this.signMats.push({mat, base: 0.92, flicker: sign.flicker, phase: Math.random() * 10});
            // glow backing
            const glow = new THREE.Mesh(new THREE.PlaneGeometry(sign.w * 1.25, sign.tall * 1.3),
                new THREE.MeshBasicMaterial({color: sign.color, transparent: true, opacity: 0.1,
                    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending}));
            glow.position.copy(mesh.position);
            glow.rotation.copy(mesh.rotation);
            glow.translateZ(-0.05);
            g.add(glow);
        });

        // street lights
        s.lights.forEach((l) => {
            const pole = this.box(0.14, l.h, 0.14, 0x2a2f38);
            pole.position.set(l.x, l.h / 2, l.y);
            g.add(pole);
            const arm = this.box(1.4, 0.1, 0.12, 0x2a2f38);
            arm.position.set(l.x - Math.sign(l.x) * 0.7, l.h, l.y);
            g.add(arm);
            const head = this.box(0.5, 0.12, 0.24, l.color);
            head.position.set(l.x - Math.sign(l.x) * 1.35, l.h - 0.05, l.y);
            g.add(head);
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: BattleScene.glowTex(), color: l.color, transparent: true, opacity: 0.35,
                blending: THREE.AdditiveBlending, depthWrite: false}));
            glow.position.copy(head.position);
            glow.scale.setScalar(3);
            g.add(glow);
        });

        // sagging cables
        s.cables.forEach((c) => {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= 10; i++) {
                const k = i / 10;
                const x = c.x0 + (c.x1 - c.x0) * k;
                pts.push(new THREE.Vector3(x, c.h - Math.sin(k * Math.PI) * c.sag, c.y));
            }
            g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({color: 0x2c333d, transparent: true, opacity: 0.8})));
        });

        // puddles: additive neon smears on the asphalt
        s.puddles.forEach((p) => {
            const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({
                color: Math.random() < 0.5 ? 0x0d2a2f : 0x291721, transparent: true, opacity: 0.4,
                blending: THREE.AdditiveBlending, depthWrite: false}));
            m.rotation.x = -Math.PI / 2;
            m.scale.set(p.rx, p.ry, 1);
            m.position.set(p.x, 0.02, p.y);
            g.add(m);
        });

        // sidewalk clutter
        s.props.forEach((p) => {
            const grp = new THREE.Group();
            grp.position.set(p.x, 0, p.y);
            grp.rotation.y = p.rot;
            switch (p.kind) {
                case "hydrant": {
                    const b = this.box(0.34, 0.8, 0.34, 0x8c2f24); b.position.y = 0.4; grp.add(b);
                    break;
                }
                case "trash": {
                    for (let i = 0; i < 3; i++) {
                        const b = this.box(0.5 + Math.random() * 0.3, 0.35, 0.5, 0x171b22);
                        b.position.set((Math.random() - 0.5) * 0.9, 0.18, (Math.random() - 0.5) * 0.9);
                        b.rotation.y = Math.random() * 1.5;
                        grp.add(b);
                    }
                    break;
                }
                case "cone": {
                    const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 8),
                        new THREE.MeshBasicMaterial({color: 0xc45a28}));
                    c.position.y = 0.28; grp.add(c);
                    break;
                }
                case "vending": {
                    const b = this.box(0.9, 1.9, 0.7, 0x1d2733); b.position.y = 0.95; grp.add(b);
                    const face = this.box(0.7, 1.2, 0.05, 0x2d94a8); face.position.set(0, 1.15, 0.36); grp.add(face);
                    this.signMats.push({mat: face.material as THREE.MeshBasicMaterial, base: 1, flicker: Math.random() < 0.5, phase: Math.random() * 10});
                    break;
                }
                case "vent": {
                    const b = this.box(0.9, 0.12, 0.9, 0x20242c); b.position.y = 0.06; grp.add(b);
                    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({
                        map: BattleScene.glowTex(), color: 0x5a6672, transparent: true, opacity: 0.16,
                        depthWrite: false}));
                    smoke.position.set(0, 0.8, 0);
                    smoke.scale.setScalar(1.6);
                    grp.add(smoke);
                    this.ventSprites.push({s: smoke, phase: Math.random() * 10});
                    break;
                }
                case "planter": {
                    const b = this.box(1.3, 0.45, 0.5, 0x2a2f38); b.position.y = 0.22; grp.add(b);
                    const veg = this.box(1.1, 0.3, 0.36, 0x2f4c33); veg.position.y = 0.55; grp.add(veg);
                    break;
                }
            }
            g.add(grp);
        });

        // the actual cover objects (gameplay!) — tracked by position so a blast
        // can wipe one off the street mid-fight
        this.coverViews = new Map();
        s.covers.forEach((c) => {
            const grp = this.buildCover(c.x, c.y, c.kind, c.rot);
            this.coverViews.set(this.coverKey(c.x, c.y), grp);
            g.add(grp);
        });
        return g;
    }

    private buildCover(x: number, y: number, kind: string, rot: number): THREE.Group {
        const grp = new THREE.Group();
        grp.position.set(x, 0, y);
        grp.rotation.y = rot;
        const add = (m: THREE.Mesh, edgeOp: number = 0.5) => { grp.add(m); grp.add(this.edges(m, 0x37e1e7, edgeOp)); };
        switch (kind) {
            case "car": {
                const hull = this.box(4.2, 1.0, 1.9, 0x222834); hull.position.y = 0.62; add(hull);
                const cab = this.box(2.2, 0.7, 1.7, 0x1a1f29); cab.position.set(-0.3, 1.35, 0); add(cab, 0.35);
                break;
            }
            case "crate": {
                const a = this.box(1.5, 1.2, 1.5, 0x37414f); a.position.y = 0.6; add(a);
                const b = this.box(1.2, 1.0, 1.2, 0x2c3540); b.position.set(0.9, 0.5, 0.4); add(b, 0.35);
                const c = this.box(1.1, 1.0, 1.1, 0x2c3540); c.position.set(-0.2, 1.7, 0.1); add(c, 0.35);
                break;
            }
            case "barrier": {
                for (let i = -1; i <= 1; i++) {
                    const b = this.box(1.7, 1.05, 0.55, 0x39404d); b.position.set(i * 1.75, 0.52, 0); add(b, i === 0 ? 0.5 : 0.3);
                }
                break;
            }
            case "dumpster": {
                const b = this.box(2.4, 1.35, 1.4, 0x2c4436); b.position.y = 0.72; add(b);
                const lid = this.box(2.4, 0.12, 1.5, 0x243a2e); lid.position.set(0, 1.45, -0.1); lid.rotation.x = -0.18; add(lid, 0.3);
                break;
            }
            default: {   // pillar
                const p = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 5.4, 10),
                    new THREE.MeshBasicMaterial({color: 0x2b313b}));
                p.position.y = 2.7;
                grp.add(p);
                const band = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.16, 10),
                    new THREE.MeshBasicMaterial({color: 0x37e1e7, transparent: true, opacity: 0.6}));
                band.position.y = 1.15;
                grp.add(band);
                break;
            }
        }
        return grp;
    }

    // ---------------------------------------------------------------- rain --

    private buildRain() {
        const N = 420;
        const verts = new Float32Array(N * 6);
        this.rainVel = [];
        for (let i = 0; i < N; i++) {
            const x = -34 + Math.random() * 68, y = Math.random() * 26, z = -20 + Math.random() * 85;
            verts[i * 6] = x; verts[i * 6 + 1] = y; verts[i * 6 + 2] = z;
            verts[i * 6 + 3] = x + 0.12; verts[i * 6 + 4] = y - 0.85; verts[i * 6 + 5] = z;
            this.rainVel.push(20 + Math.random() * 14);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
            color: 0x4b6270, transparent: true, opacity: 0.34}));
        this.scene.add(this.rain);
    }

    private stepRain(dt: number) {
        if (!this.rain || this.reduced) { return; }
        const pos = this.rain.geometry.getAttribute("position") as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        for (let i = 0; i < this.rainVel.length; i++) {
            const fall = this.rainVel[i]! * dt;
            arr[i * 6 + 1]! -= fall;
            arr[i * 6 + 4]! -= fall;
            if (arr[i * 6 + 1]! < 0) {
                const y = 22 + Math.random() * 6;
                arr[i * 6 + 1] = y; arr[i * 6 + 4] = y - 0.85;
                arr[i * 6] = -34 + Math.random() * 68;
                arr[i * 6 + 3] = arr[i * 6]! + 0.12;
                const z = -20 + Math.random() * 85;
                arr[i * 6 + 2] = z; arr[i * 6 + 5] = z;
            }
        }
        pos.needsUpdate = true;
    }

    // ---------------------------------------------------------------- units --

    private static glowCache: THREE.CanvasTexture | null = null;

    private static glowTex(): THREE.CanvasTexture {
        if (this.glowCache) { return this.glowCache; }
        const s = 64;
        const cv = document.createElement("canvas");
        cv.width = s; cv.height = s;
        const ctx = cv.getContext("2d")!;
        const grad = ctx.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.4, "rgba(255,255,255,0.45)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);
        this.glowCache = new THREE.CanvasTexture(cv);
        return this.glowCache;
    }

    private buildUnit(a: Actor, side: "you" | "ally" | "foe"): UnitView {
        const foe = side === "foe";
        // the body itself is shared with every screen that shows a merc (unitModel)
        const fig = buildFigure(a, side);
        const {group, body, legL, legR, gunTip} = fig;
        const color = fig.color;

        // the ground ring is the IFF — team red for hostiles no matter the faction
        const ringCol = foe ? COL.foe : color;
        const ringMat = new THREE.MeshBasicMaterial({color: ringCol, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false});
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.92, 26), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);

        const pick = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.4, 8),
            new THREE.MeshBasicMaterial({visible: false}));
        pick.position.y = 1.2;
        pick.userData["unit"] = a.name;
        group.add(pick);

        this.scene.add(group);

        const tag = document.createElement("div");
        tag.className = "bsTag " + side;
        tag.innerHTML = `<b>${a.name}</b><span class="bsHp"><i></i></span>`;
        this.overlay.current!.appendChild(tag);
        const hpFill = tag.querySelector("i") as HTMLElement;

        const u: UnitView = {
            actor: a, side, color, accent: color, group, body, legL, legR, gunTip, ring, ringMat, pick,
            tag, hpFill, visPos: {x: a.position.x, y: a.position.y},
            yaw: side === "foe" ? Math.PI : 0, targetYaw: side === "foe" ? Math.PI : 0,
            crouch: 0, walk: 0, walking: false, sprinting: false, air: 0, fallen: 0, faded: false, flinch: 0,
            laser: null,
        };
        return u;
    }

    /** Snap a unit's visuals to engine truth (used on build and after playback). */
    private snapUnit(u: UnitView) {
        u.visPos = {x: u.actor.position.x, y: u.actor.position.y};
        u.walking = false;
        u.air = 0;
        // routed units ran off standing up — everyone else down is down
        if (!u.actor.canFight() && !u.actor.routed) { u.fallen = 1; }
        if (!u.actor.alive || u.actor.routed) { u.faded = true; }
    }

    private unitFor(a: Actor): UnitView | null {
        return this.units.find((u) => u.actor === a) || null;
    }

    // ------------------------------------------------------------- framing --

    /** Duel frame: rotate so the two combatants sit across the screen, zoom to fit them. */
    private frameDuel(a: Point, b: Point) {
        this.focusGoal.set((a.x + b.x) / 2, 0, (a.y + b.y) / 2);
        const sep = Math.hypot(b.x - a.x, b.y - a.y);
        let yaw = Math.atan2(b.x - a.x, b.y - a.y) - Math.PI / 2;
        while (yaw > Math.PI) { yaw -= Math.PI * 2; }
        while (yaw < -Math.PI) { yaw += Math.PI * 2; }
        // fold to the near-side equivalent so the camera never swings behind the far wall
        if (yaw > Math.PI / 2) { yaw -= Math.PI; } else if (yaw < -Math.PI / 2) { yaw += Math.PI; }
        this.camYawG = Math.max(-1.15, Math.min(1.15, yaw));
        this.camZoomG = Math.max(0.4, Math.min(1, (sep / 2 + 7) / 27.5));
        this.camElG = 0.5;
    }

    /** Back out to the tactical overview. */
    /**
     * A phone board is narrow and tall, so a flatter angle spreads the street's
     * 44m of depth down the frame instead of foreshortening it into a band.
     */
    private baseElevation(): number {
        return this.camera && this.camera.aspect < 1.2 ? 0.6 : 0.62;
    }

    private frameOverview() {
        this.camYawG = 0;
        this.camZoomG = 1;
        this.camElG = this.baseElevation();
    }

    // ------------------------------------------------------------- playback --

    private beginPlayback(pb: PlaybackBundle) {
        // fast-forward anything still running (shouldn't happen in practice)
        if (this.playingId && this.playingId !== this.doneId) { this.finishPlayback(this.playingId, true); }
        this.playingId = pb.id;
        this.acts = [];
        const sp = Math.max(0.4, this.props.speed || 1);
        const D = (n: number) => this.reduced ? 0.001 : n / sp;

        for (const ev of pb.events) {
            switch (ev.kind) {
                case "turn": {
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        this.acts.push({dur: D(0.32), t: 0, start: () => {
                            this.focusGoal.set(u.visPos.x, 0, u.visPos.y);
                        }});
                    }
                    break;
                }
                case "move": this.pushMoveActs(ev as MoveEvent, D); break;
                case "shot": this.pushShotActs(ev as ShotEvent, D); break;
                case "blast": this.pushBlastActs(ev as BlastEvent, D); break;
                case "mark": {   // sniper paints the target: swing the camera, light the beam
                    const s = this.unitFor(ev.actor);
                    const t = this.unitFor(ev.target);
                    if (s && t) {
                        this.acts.push({dur: D(0.85), t: 0, start: () => {
                            s.targetYaw = Math.atan2(t.visPos.x - s.visPos.x, t.visPos.y - s.visPos.y);
                            this.frameDuel(s.visPos, t.visPos);
                            this.floater(t, "⊕ PAINTED", "mark");
                        }});
                    }
                    break;
                }
                case "crit": {   // a lasting injury lands with its own beat
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        const label = ev.effect === "bleeding" ? "BLEEDING"
                            : ev.effect === "crippled" ? "LEG HIT" : "STUNNED";
                        this.acts.push({dur: D(0.4), t: 0, start: () => {
                            this.floater(u, label, "crit");
                            if (ev.effect === "bleeding") { this.spawnSparks(this.unitAnchor(u, 1.2), 0xc02020, 6); }
                        }});
                    }
                    break;
                }
                case "bleed": {   // the damage-over-time tick: bleed, fire, toxins
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        const burning = ev.sources.indexOf("burn") >= 0;
                        const toxic = !burning && ev.sources.indexOf("toxin") >= 0;
                        this.acts.push({dur: D(0.5), t: 0, start: () => {
                            this.props.onImpact(ev.actor, ev.damage);
                            this.floater(u, String(ev.damage), "tick");
                            this.spawnSparks(this.unitAnchor(u, 1.1),
                                burning ? 0xff8a30 : toxic ? 0x8fd94f : 0xc02020, burning ? 7 : 4);
                            if (ev.dropped) { this.floater(u, "DOWN", "down"); }
                        }});
                    }
                    break;
                }
                case "status": {   // something stuck to someone — say which
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        const def = STATUS[ev.status];
                        this.acts.push({dur: D(0.35), t: 0, start: () => {
                            this.floater(u, ev.warded ? "WARDED" : def.label.toUpperCase(),
                                ev.warded ? "buff" : def.debuff ? "mark" : "buff");
                        }});
                    }
                    break;
                }
                case "skip": {
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        this.acts.push({dur: D(0.45), t: 0, start: () =>
                            this.floater(u, ev.reason === "stunned" ? "✶ STUNNED" : "▼ PINNED", "miss")});
                    }
                    break;
                }
                case "reload": {
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        this.acts.push({dur: D(0.5), t: 0, start: () => {
                            this.floater(u, "RELOADING", "miss");
                            u.crouch = 1;   // dip while the mag swaps
                        }});
                    }
                    break;
                }
                case "suppress": this.pushSuppressActs(ev as SuppressEvent, D); break;
                case "stabilize": {
                    const s = this.unitFor((ev as StabilizeEvent).actor);
                    const t = this.unitFor((ev as StabilizeEvent).target);
                    if (s && t) {
                        this.acts.push({dur: D(0.9), t: 0, start: () => {
                            this.focusGoal.set(t.visPos.x, 0, t.visPos.y);
                            s.crouch = 1;   // kneel over them
                            this.spawnPulse(t, 0x7fd67f);
                            this.props.onMend((ev as StabilizeEvent).target, (ev as StabilizeEvent).hp);
                            this.floater(t, (ev as StabilizeEvent).saved ? "＋ BACK UP" : "＋ PATCHED", "buff");
                        }, end: () => {
                            if ((ev as StabilizeEvent).saved) { t.fallen = 0; t.faded = false; }
                        }});
                    }
                    break;
                }
                case "rout": this.pushRoutActs(ev as RoutEvent, D); break;
                case "ability": {
                    const a = ev as AbilityEvent;
                    const u = this.unitFor(a.actor);
                    if (u && a.name === "leap" && a.to) { this.pushLeapActs(u, a.to, D); }
                    else if (u) {
                        this.acts.push({dur: D(0.5), t: 0, start: () =>
                            this.floater(u, "⌖ SUSTAINED FIRE", "mark")});
                    }
                    break;
                }
                case "hack": {
                    const h = ev as HackEvent;
                    const s = this.unitFor(h.actor);
                    const t = this.unitFor(h.target);
                    if (s && t) {
                        this.acts.push({dur: D(0.8), t: 0, start: () => {
                            this.frameDuel(s.visPos, t.visPos);
                            this.spawnSparks(this.unitAnchor(t, 1.5), 0x66e9ff, 14);
                            this.spawnPulse(t, 0x66e9ff);
                            this.props.onImpact(h.target, h.damage);
                            this.floater(t, "⚡ SHORTED " + (h.damage > 0 ? h.damage : ""), "hack");
                            if (h.stunned) {
                                window.setTimeout(() => this.floater(t, "SYSTEMS LOCKED", "hack"), 300);
                            }
                            if (h.dropped) {
                                window.setTimeout(() => this.floater(t, "DOWN", "down"), 500);
                            }
                        }});
                    }
                    break;
                }
                case "coverGone": {
                    const cg = ev as CoverGoneEvent;
                    this.acts.push({dur: D(cg.exploded ? 0.5 : 0.3), t: 0, start: () =>
                        this.destroyCoverView(cg)});
                    break;
                }
                case "noshot": {
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        this.acts.push({dur: D(0.5), t: 0, start: () =>
                            this.floater(u, "NO SHOT", "miss")});
                    }
                    break;
                }
                case "save": {
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        this.acts.push({dur: D(0.9), t: 0,
                            start: () => {
                                this.focusGoal.set(u.visPos.x, 0, u.visPos.y);
                                this.floater(u, ev.survived ? "CLINGS ON" : "FLATLINED", ev.survived ? "buff" : "dmg-big");
                                if (!ev.survived) { this.spawnPulse(u, 0xe0533f); }
                            },
                            end: () => { if (!ev.survived) { u.faded = true; } }});
                    }
                    break;
                }
                case "level": {
                    const u = this.unitFor(ev.actor);
                    if (u) {
                        this.acts.push({dur: D(0.6), t: 0, start: () => {
                            this.floater(u, "LEVEL UP", "buff");
                            this.spawnPulse(u, 0x37e1e7);
                        }});
                    }
                    break;
                }
            }
        }
        // settle beat, then report done
        this.acts.push({dur: D(0.25), t: 0});
    }

    private finishPlayback(id: number, forced: boolean = false) {
        this.acts = [];
        this.frameOverview();
        this.units.forEach((u) => this.snapUnit(u));
        if (this.playingId === id) { this.playingId = 0; }
        this.doneId = id;
        if (!forced) { this.props.onPlaybackDone(id); }
    }

    /**
     * Walk path that skirts the cover objects instead of clipping through
     * them: if the straight line passes over a cover footprint, insert a
     * detour point pushed out perpendicular from that cover.
     */
    private routeAround(from: Point, to: Point): Point[] {
        const AVOID = 2.1;
        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        let worst: {c: Point; t: number; perp: number} | null = null;
        for (const c of Battlefield.COVER) {
            if (Battlefield.gap(c, to) < 2.6 || Battlefield.gap(c, from) < 2.6) { continue; }
            const t = ((c.x - from.x) * ux + (c.y - from.y) * uy) / len;
            if (t < 0.08 || t > 0.92) { continue; }
            const fx = from.x + ux * t * len, fy = from.y + uy * t * len;
            const perp = Math.hypot(c.x - fx, c.y - fy);
            if (perp < AVOID && (!worst || perp < worst.perp)) { worst = {c, t, perp}; }
        }
        if (!worst) { return [from, to]; }
        const fx = from.x + ux * worst.t * len, fy = from.y + uy * worst.t * len;
        let ax = fx - worst.c.x, ay = fy - worst.c.y;
        const al = Math.hypot(ax, ay);
        if (al < 0.01) { ax = -uy; ay = ux; } else { ax /= al; ay /= al; }
        const detour = Battlefield.clamp({x: worst.c.x + ax * (AVOID + 0.5), y: worst.c.y + ay * (AVOID + 0.5)});
        return [from, detour, to];
    }

    private pushMoveActs(ev: MoveEvent, D: (n: number) => number) {
        const u = this.unitFor(ev.actor);
        if (!u) { return; }
        const pts = this.routeAround(ev.from, ev.to);
        const segLen: number[] = [];
        let total = 0;
        for (let i = 0; i < pts.length - 1; i++) {
            const l = Battlefield.gap(pts[i]!, pts[i + 1]!);
            segLen.push(l);
            total += l;
        }
        // a sprint covers ground half again as fast — it should look desperate
        const dur = D(Math.max(0.35, Math.min(2.2, total / (ev.sprint ? 11.5 : 7.5))));
        let seg = -1;
        this.acts.push({
            dur, t: 0,
            start: () => {
                u.walking = true;
                u.sprinting = !!ev.sprint;
                this.frameOverview();
                this.focusGoal.set(ev.to.x, 0, ev.to.y);
            },
            update: (k) => {
                const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // easeInOut
                let walked = e * total;
                let i = 0;
                while (i < segLen.length - 1 && walked > segLen[i]!) { walked -= segLen[i]!; i += 1; }
                const a = pts[i]!, b = pts[i + 1]!;
                const kk = segLen[i]! > 0 ? walked / segLen[i]! : 1;
                u.visPos = {x: a.x + (b.x - a.x) * kk, y: a.y + (b.y - a.y) * kk};
                if (i !== seg) {   // face down the new leg
                    seg = i;
                    u.targetYaw = Math.atan2(b.x - a.x, b.y - a.y);
                }
            },
            end: () => {
                u.visPos = {x: ev.to.x, y: ev.to.y};
                u.walking = false;
                u.sprinting = false;
                if (ev.cover) { this.floater(u, "IN COVER", "cov"); }
            },
        });
    }

    private pushShotActs(ev: ShotEvent, D: (n: number) => number) {
        const shooter = this.unitFor(ev.actor);
        const target = this.unitFor(ev.target);
        if (!shooter || !target) { return; }

        // square up: shooter turns, camera rotates in to frame the exchange
        this.acts.push({dur: D(0.16), t: 0, start: () => {
            shooter.targetYaw = Math.atan2(target.visPos.x - shooter.visPos.x, target.visPos.y - shooter.visPos.y);
            this.frameDuel(shooter.visPos, target.visPos);
        }});

        if (ev.melee) {
            let struck = false;
            this.acts.push({
                dur: D(0.55), t: 0,
                update: (k) => {
                    // lunge in and back, impact at the top of the swing
                    const swing = Math.sin(Math.min(1, k * 1.15) * Math.PI);
                    shooter.body.position.z = swing * 0.55;
                    shooter.body.rotation.x = swing * 0.25;
                    if (!struck && k >= 0.45) {
                        struck = true;
                        this.spawnSlash(shooter, target, ev.hit);
                        this.impact(ev, target);
                    }
                },
                end: () => {
                    shooter.body.position.z = 0;
                    shooter.body.rotation.x = 0;
                    if (!struck) { this.spawnSlash(shooter, target, ev.hit); this.impact(ev, target); }
                },
            });
            return;
        }

        // every round leaving the barrel gets a tracer: bursts as a stitched
        // string of shots, shotguns as one trigger pull spraying a pellet fan
        const shotgun = ev.actor.weapon.weaponClass === "shotgun";
        const burst = shotgun ? 1 : Math.max(1, ev.rounds || (ev.autofire ? 5 : 1));
        // A burst that drops its target stops on the round that did it. The
        // full string used to walk across the body and only *then* let it fall,
        // which is most of what "the AI is shooting a corpse" actually was.
        const shots = ev.dropped ? Math.min(burst, 2) : burst;
        const pellets = shotgun ? 6 : 1;
        const gapT = ev.autofire ? 0.09 : 0.13;
        const flight = 0.16;
        const total = 0.34 + shots * gapT + flight + (ev.dropped ? 0.55 : 0);
        let elapsed = 0;         // unscaled timeline seconds
        let spawned = 0;
        let impacted = false;
        const sp = Math.max(0.4, this.props.speed || 1);
        this.acts.push({
            dur: D(total), t: 0,
            update: (_k, dt) => {
                elapsed += dt * sp;
                while (spawned < shots && elapsed > 0.05 + spawned * gapT) {
                    for (let p = 0; p < pellets; p++) {
                        this.spawnTracer(shooter, target, ev, shotgun ? 0.55 : 0);
                    }
                    spawned += 1;
                }
                if (!impacted && elapsed > 0.05 + (shots - 1) * gapT + flight) {
                    impacted = true;
                    this.impact(ev, target);
                }
            },
            end: () => { if (!impacted) { this.impact(ev, target); } },
        });
    }

    /** Ordnance: arc the throw over, then let the payload speak (frag/smoke/flash/EMP). */
    private pushBlastActs(ev: BlastEvent, D: (n: number) => number) {
        const thrower = this.unitFor(ev.actor);
        if (!thrower) { return; }
        const at = new THREE.Vector3(ev.at.x, 0.15, ev.at.y);

        // secondary explosions and slams aren't thrown — they just happen
        if (ev.gtype === "car") {
            this.acts.push({dur: D(1.0), t: 0, start: () => this.explode(at, ev)});
            return;
        }
        if (ev.gtype === "slam") {
            this.acts.push({dur: D(0.8), t: 0, start: () => {
                this.shakeT = 0.5;
                this.spawnFlash(at.clone().setY(0.8), 0xbfd6ff);
                this.slamRing(at, 0x8ff7ff);
                this.billVictims(ev);
            }});
            return;
        }

        this.acts.push({dur: D(0.2), t: 0, start: () => {
            thrower.targetYaw = Math.atan2(ev.at.x - thrower.visPos.x, ev.at.y - thrower.visPos.y);
            this.focusGoal.set(ev.at.x, 0, ev.at.y);
            this.camZoomG = ev.gtype === "smoke" ? 0.75 : 0.62;   // lean in for the boom
            this.camElG = 0.55;
        }});

        // the throw: a tumbling grenade on a parabola, then the street answers
        const shell = ev.gtype === "smoke" ? 0x5f7264 : ev.gtype === "flash" ? 0xd8dde3
            : ev.gtype === "emp" ? 0x2a6f7d : 0x9aa4ad;
        let nade: THREE.Mesh | null = null;
        const flightDur = D(0.8);
        this.acts.push({
            dur: flightDur, t: 0,
            start: () => {
                nade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16),
                    new THREE.MeshBasicMaterial({color: shell}));
                this.scene.add(nade);
            },
            update: (k) => {
                if (!nade) { return; }
                const from = this.unitAnchor(thrower, 1.4);
                nade.position.lerpVectors(from, at, k);
                nade.position.y += Math.sin(k * Math.PI) * 4.5;   // arc
                nade.rotation.x += 0.3; nade.rotation.z += 0.2;
            },
            end: () => {
                if (nade) {
                    this.scene.remove(nade);
                    nade.geometry.dispose();
                    (nade.material as THREE.Material).dispose();
                }
                if (ev.gtype === "smoke") { this.smokeBurst(at); }
                else if (ev.gtype === "flash") { this.flashBurst(at, ev); }
                else if (ev.gtype === "emp") { this.empBurst(at, ev); }
                else { this.explode(at, ev); }
            },
        });
        const anyDown = ev.victims.some((v) => v.dropped);
        this.acts.push({dur: D((ev.gtype === "smoke" ? 0.5 : 0.9) + (anyDown ? 0.5 : 0)), t: 0});
    }

    /** Stagger the damage/status floaters off each victim of a blast. */
    private billVictims(ev: BlastEvent) {
        ev.victims.forEach((v, i) => {
            const u = this.unitFor(v.target);
            if (!u) { return; }
            window.setTimeout(() => {
                if (ev.gtype === "flash") {
                    this.floater(u, v.stunned ? "✶ STUNNED" : "SHRUGS IT OFF", v.stunned ? "crit" : "soak");
                } else if (v.damage <= 0) {
                    this.floater(u, v.dodged ? "DIVES CLEAR" : "ARMOR", "soak");
                } else {
                    this.props.onImpact(v.target, v.damage);
                    this.floater(u, (v.dodged ? "½ " : "") + String(v.damage), v.damage >= 15 ? "dmg-big" : "dmg");
                    if (v.stunned) { this.floater(u, "✶ STUNNED", "crit"); }
                }
                if (v.dropped) { this.floater(u, "DOWN", "down"); }
                u.flinch = ev.gtype === "flash" ? 0.1 : 0.25;
            }, 120 + i * 140);
        });
    }

    /** Expanding shockwave ring on the asphalt. */
    private slamRing(at: THREE.Vector3, color: number, radius: number = 4) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.95, side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending, depthWrite: false}));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(at.x, 0.06, at.z);
        this.scene.add(ring);
        let life = 0.6;
        this.fx.push({update: (dt) => {
            life -= dt;
            ring.scale.addScalar(dt * radius * 2.6);
            (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, life / 0.6 * 0.95);
            if (life <= 0) { this.scene.remove(ring); (ring.material as THREE.Material).dispose(); return false; }
            return true;
        }});
    }

    /** Smoke round lands: a hanging cloud that lives as long as its zone does. */
    private smokeBurst(at: THREE.Vector3) {
        const sprites: THREE.Sprite[] = [];
        for (let i = 0; i < 9; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({
                map: BattleScene.glowTex(), color: 0x8b95a0, transparent: true, opacity: 0, depthWrite: false}));
            s.position.set(at.x + (Math.random() - 0.5) * 6, 0.7 + Math.random() * 2.4,
                at.z + (Math.random() - 0.5) * 6);
            s.scale.setScalar(2.6 + Math.random() * 2.6);
            this.scene.add(s);
            sprites.push(s);
        }
        this.smokeClouds.push({x: at.x, y: at.z, sprites, phase: Math.random() * 10, dying: false});
    }

    /** Flashbang: a wall of white, no wounds. */
    private flashBurst(at: THREE.Vector3, ev: BlastEvent) {
        this.shakeT = 0.2;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
            map: BattleScene.glowTex(), color: 0xffffff, transparent: true, opacity: 1,
            blending: THREE.AdditiveBlending, depthWrite: false}));
        s.position.set(at.x, 1.4, at.z);
        s.scale.setScalar(4);
        this.scene.add(s);
        let life = 0.35;
        this.fx.push({update: (dt) => {
            life -= dt;
            s.scale.addScalar(dt * 26);
            (s.material as THREE.SpriteMaterial).opacity = Math.max(0, life / 0.35);
            if (life <= 0) { this.scene.remove(s); (s.material as THREE.Material).dispose(); return false; }
            return true;
        }});
        this.billVictims(ev);
    }

    /** EMP: a cyan discharge that only chrome feels. */
    private empBurst(at: THREE.Vector3, ev: BlastEvent) {
        this.shakeT = 0.25;
        this.spawnFlash(at.clone().setY(1.2), 0x66e9ff);
        this.spawnSparks(at.clone().setY(1.2), 0x66e9ff, 20);
        this.slamRing(at, 0x66e9ff, 5);
        ev.victims.forEach((v) => {
            const u = this.unitFor(v.target);
            if (u) { this.spawnSparks(this.unitAnchor(u, 1.5), 0x66e9ff, 8); }
        });
        this.billVictims(ev);
    }

    /** The boom: flash, shockwave ring, sparks, smoke, a scorch that stays, camera shake. */
    private explode(at: THREE.Vector3, ev: BlastEvent) {
        const car = ev.gtype === "car";
        this.shakeT = car ? 0.7 : 0.55;
        this.spawnFlash(at.clone().setY(1.2), car ? 0xffb060 : 0xffd9a0);
        this.spawnSparks(at.clone().setY(1.0), 0xffa04d, car ? 34 : 26);
        this.spawnSparks(at.clone().setY(0.6), 0xff5a3c, car ? 20 : 14);

        // expanding shockwave ring on the asphalt
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({
            color: 0xffc27d, transparent: true, opacity: 0.95, side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending, depthWrite: false}));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(at.x, 0.06, at.z);
        this.scene.add(ring);
        let life = 0.65;
        this.fx.push({update: (dt) => {
            life -= dt;
            ring.scale.addScalar(dt * (BLAST_RADIUS * 2.4));
            (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, life / 0.65 * 0.95);
            if (life <= 0) { this.scene.remove(ring); (ring.material as THREE.Material).dispose(); return false; }
            return true;
        }});

        // rising smoke
        for (let i = 0; i < 5; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({
                map: BattleScene.glowTex(), color: 0x39404b, transparent: true, opacity: 0.4, depthWrite: false}));
            s.position.set(at.x + (Math.random() - 0.5) * 2, 0.6, at.z + (Math.random() - 0.5) * 2);
            s.scale.setScalar(1.4 + Math.random());
            this.scene.add(s);
            let l = 1.5 + Math.random() * 0.5;
            const rise = 1.6 + Math.random();
            this.fx.push({update: (dt) => {
                l -= dt;
                s.position.y += rise * dt;
                s.scale.addScalar(dt * 2.2);
                (s.material as THREE.SpriteMaterial).opacity = Math.max(0, l / 2 * 0.4);
                if (l <= 0) { this.scene.remove(s); (s.material as THREE.Material).dispose(); return false; }
                return true;
            }});
        }

        // permanent scorch on the street
        const scorch = new THREE.Mesh(new THREE.CircleGeometry(BLAST_RADIUS * 0.55, 24),
            new THREE.MeshBasicMaterial({color: 0x05060a, transparent: true, opacity: 0.6, depthWrite: false}));
        scorch.rotation.x = -Math.PI / 2;
        scorch.position.set(at.x, 0.03, at.z);
        if (this.streetGroup) { this.streetGroup.add(scorch); } else { this.scene.add(scorch); }

        // the bill, staggered off each victim
        this.billVictims(ev);
    }

    /** Suppression: a ten-round hose of tracers over the target's head, then the verdict. */
    private pushSuppressActs(ev: SuppressEvent, D: (n: number) => number) {
        const s = this.unitFor(ev.actor);
        const t = this.unitFor(ev.target);
        if (!s || !t) { return; }
        this.acts.push({dur: D(0.16), t: 0, start: () => {
            s.targetYaw = Math.atan2(t.visPos.x - s.visPos.x, t.visPos.y - s.visPos.y);
            this.frameDuel(s.visPos, t.visPos);
        }});
        const hose = {hit: false, autofire: true, rounds: 10} as unknown as ShotEvent;
        let elapsed = 0;
        let spawned = 0;
        const sp = Math.max(0.4, this.props.speed || 1);
        this.acts.push({
            dur: D(1.0), t: 0,
            update: (_k, dt) => {
                elapsed += dt * sp;
                while (spawned < 10 && elapsed > spawned * 0.07) {
                    this.spawnTracer(s, t, hose, 0.35);
                    spawned += 1;
                }
            },
            end: () => {
                this.floater(t, ev.pinned ? "▼ PINNED" : "HOLDS STEADY", ev.pinned ? "crit" : "soak");
                if (ev.pinned) { t.crouch = 1; }
            },
        });
    }

    /** Morale breaks: sprint for the street's edge and vanish into the rain. */
    private pushRoutActs(ev: RoutEvent, D: (n: number) => number) {
        const u = this.unitFor(ev.actor);
        if (!u) { return; }
        const from = {x: u.visPos.x, y: u.visPos.y};
        const dist = Battlefield.gap(from, ev.to);
        this.acts.push({
            dur: D(Math.max(0.6, Math.min(1.7, dist / 11))), t: 0,
            start: () => {
                u.walking = true;
                u.sprinting = true;
                u.targetYaw = Math.atan2(ev.to.x - from.x, ev.to.y - from.y);
                this.floater(u, "MORALE BROKEN", "miss");
            },
            update: (k) => {
                u.visPos = {x: from.x + (ev.to.x - from.x) * k, y: from.y + (ev.to.y - from.y) * k};
            },
            end: () => {
                u.walking = false;
                u.sprinting = false;
                u.faded = true;
            },
        });
    }

    /** Boss leap: a monstrous arc onto the target's position, slam on landing. */
    private pushLeapActs(u: UnitView, to: {x: number; y: number}, D: (n: number) => number) {
        const from = {x: u.visPos.x, y: u.visPos.y};
        this.acts.push({
            dur: D(0.8), t: 0,
            start: () => {
                this.focusGoal.set(to.x, 0, to.y);
                this.camZoomG = 0.55;
                this.camElG = 0.5;
                this.floater(u, "⚠ LEAP", "crit");
                u.targetYaw = Math.atan2(to.x - from.x, to.y - from.y);
            },
            update: (k) => {
                u.visPos = {x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k};
                u.air = Math.sin(k * Math.PI) * 4.2;
            },
            end: () => {
                u.air = 0;
                u.visPos = {x: to.x, y: to.y};
            },
        });
    }

    /** A cover object dies: debris, dust — and its mesh leaves the street. */
    private destroyCoverView(cg: CoverGoneEvent) {
        const key = this.coverKey(cg.at.x, cg.at.y);
        const grp = this.coverViews.get(key);
        if (grp && this.streetGroup) {
            this.streetGroup.remove(grp);
            this.coverViews.delete(key);
        }
        const at = new THREE.Vector3(cg.at.x, 0.6, cg.at.y);
        this.spawnSparks(at, cg.exploded ? 0xffa04d : 0x9aa4ad, cg.exploded ? 18 : 10);
        this.spawnFlash(at.clone().setY(1), cg.exploded ? 0xffb060 : 0x7d8794);
        if (!this.reduced) { this.shakeT = Math.max(this.shakeT, 0.25); }
    }

    private coverKey(x: number, y: number): string {
        return Math.round(x * 10) + "|" + Math.round(y * 10);
    }

    /**
     * Melee swing arc: an additive blade sweep from the attacker toward the
     * target, sparks on connection. Whiffs sweep through empty air.
     */
    private spawnSlash(shooter: UnitView, target: UnitView, hit: boolean) {
        const color = shooter.side === "foe" ? shooter.accent : 0x9df3f6;
        const arc = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.0, 18, 1, 0, 2.1),
            new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.9,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false}));
        const at = this.unitAnchor(shooter, 1.35);
        const toward = this.unitAnchor(target, 1.35);
        arc.position.copy(at);
        arc.lookAt(toward);
        arc.translateZ(0.55);
        this.scene.add(arc);
        let life = 0.26;
        this.fx.push({update: (dt) => {
            life -= dt;
            arc.rotation.z -= dt * 11;            // the sweep itself
            arc.scale.addScalar(dt * 1.6);
            (arc.material as THREE.MeshBasicMaterial).opacity = Math.max(0, life / 0.26 * 0.9);
            if (life <= 0) {
                this.scene.remove(arc);
                arc.geometry.dispose();
                (arc.material as THREE.Material).dispose();
                return false;
            }
            return true;
        }});
        if (hit) { this.spawnSparks(toward, color, 8); }
    }

    /**
     * Damage numbers, flinch, fall — the moment a volley lands.
     *
     * Every shot produces a number now, so the floater's job changed: it used
     * to distinguish "hit" from "nothing happened", and it now distinguishes
     * how well the shot connected. A graze and a crit are the same event with
     * different weight behind them, and the board should say which it was.
     */
    private impact(ev: ShotEvent, target: UnitView) {
        if (!ev.hit) {
            this.floater(target, "MISS", "miss");
        } else if (ev.damage <= 0) {
            this.floater(target, "ARMOR", "soak");
            this.spawnSparks(this.unitAnchor(target, 1.3), 0x9aa4ad, 5);
        } else if (ev.quality === "graze") {
            this.props.onImpact(ev.target, ev.damage);
            this.floater(target, "GRAZE " + ev.damage, "soak");
            this.spawnSparks(this.unitAnchor(target, 1.3), 0xff9a70, 4);
            target.flinch = 0.1;
        } else {
            this.props.onImpact(ev.target, ev.damage);
            const big = ev.quality === "crit" || ev.damage >= 15 || ev.aimed;
            if (ev.quality === "crit") { this.floater(target, "CRIT", "crit"); }
            // multi-round volleys read as a rain of ticks summing to the roll
            const n = ev.actor.weapon.weaponClass === "shotgun" ? 4
                : Math.max(1, Math.min(ev.rounds || 1, ev.damage));
            if (n > 1 && ev.damage >= n) {
                const cuts = this.splitDamage(ev.damage, n);
                cuts.forEach((c, i) => window.setTimeout(() =>
                    this.floater(target, String(c), "tick"), i * 110));
                window.setTimeout(() => {
                    if (big) { this.floater(target, (ev.aimed ? "◎ " : "") + String(ev.damage), "dmg-big"); }
                }, n * 110 + 60);
            } else {
                this.floater(target, (ev.aimed ? "◎ " : "") + String(ev.damage), big ? "dmg-big" : "dmg");
            }
            this.spawnSparks(this.unitAnchor(target, 1.3), 0xff7a4d, big ? 14 : 8);
            // berserkers walk through small-arms hits — the shrug sells the tank
            target.flinch = target.actor.temperament === "berserker" && ev.damage < 12 ? 0.08 : 0.22;
        }
        if (ev.dropped && target.fallen < 1) {
            this.floater(target, "DOWN", "down");
        }
    }

    // ------------------------------------------------------------------ fx --

    private unitAnchor(u: UnitView, h: number): THREE.Vector3 {
        return new THREE.Vector3(u.visPos.x, h, u.visPos.y);
    }

    private muzzleWorld(u: UnitView): THREE.Vector3 {
        u.group.updateMatrixWorld();
        const v = new THREE.Vector3();
        u.gunTip.getWorldPosition(v);
        return v;
    }

    private spawnTracer(shooter: UnitView, target: UnitView, ev: ShotEvent, extraSpread: number = 0) {
        const from = this.muzzleWorld(shooter);
        const jitter = (ev.autofire ? 0.35 : ev.rounds > 1 ? 0.22 : 0.12) + extraSpread;
        let to = this.unitAnchor(target, 1.25).add(new THREE.Vector3(
            (Math.random() - 0.5) * jitter * 2, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter * 2));
        if (!ev.hit) {
            // sail past: overshoot with lateral spread
            const dir = to.clone().sub(from).normalize();
            const side = new THREE.Vector3(-dir.z, 0, dir.x);
            to = to.add(side.multiplyScalar((Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random())))
                .add(dir.multiplyScalar(4 + Math.random() * 5))
                .setY(0.6 + Math.random() * 1.6);
        }
        // hostile fire glows in the faction's colour — Maelstrom red, MaxTac blue
        const color = shooter.side === "foe" ? shooter.accent : COL.tracerFriend;
        this.spawnFlash(from, color);

        const dir = to.clone().sub(from);
        const len = dir.length();
        dir.normalize();
        const geo = new THREE.BoxGeometry(0.05, 0.05, 1.7);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false}));
        mesh.position.copy(from);
        mesh.lookAt(to);
        this.scene.add(mesh);
        const speed = 105;
        let travelled = 0;
        this.fx.push({
            update: (dt) => {
                travelled += speed * dt;
                if (travelled >= len) {
                    // each round that connects lands its own little spark
                    if (ev.hit) { this.spawnSparks(to.clone(), 0xffb066, 3); }
                    this.scene.remove(mesh);
                    geo.dispose();
                    (mesh.material as THREE.Material).dispose();
                    return false;
                }
                mesh.position.copy(from.clone().add(dir.clone().multiplyScalar(travelled)));
                return true;
            },
        });
    }

    private spawnFlash(at: THREE.Vector3, color: number) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
            map: BattleScene.glowTex(), color, transparent: true, opacity: 0.95,
            blending: THREE.AdditiveBlending, depthWrite: false}));
        s.position.copy(at);
        s.scale.setScalar(0.9);
        this.scene.add(s);
        let life = 0.09;
        this.fx.push({
            update: (dt) => {
                life -= dt;
                s.scale.multiplyScalar(1 + dt * 9);
                (s.material as THREE.SpriteMaterial).opacity = Math.max(0, life / 0.09);
                if (life <= 0) { this.scene.remove(s); (s.material as THREE.Material).dispose(); return false; }
                return true;
            },
        });
    }

    private spawnSparks(at: THREE.Vector3, color: number, n: number) {
        const sprites: Array<{s: THREE.Sprite; v: THREE.Vector3}> = [];
        for (let i = 0; i < n; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({
                map: BattleScene.glowTex(), color, transparent: true, opacity: 1,
                blending: THREE.AdditiveBlending, depthWrite: false}));
            s.position.copy(at);
            s.scale.setScalar(0.22 + Math.random() * 0.2);
            this.scene.add(s);
            sprites.push({s, v: new THREE.Vector3(
                (Math.random() - 0.5) * 7, Math.random() * 5, (Math.random() - 0.5) * 7)});
        }
        let life = 0.5;
        this.fx.push({
            update: (dt) => {
                life -= dt;
                for (const p of sprites) {
                    p.v.y -= 14 * dt;
                    p.s.position.add(p.v.clone().multiplyScalar(dt));
                    (p.s.material as THREE.SpriteMaterial).opacity = Math.max(0, life / 0.5);
                }
                if (life <= 0) {
                    sprites.forEach((p) => { this.scene.remove(p.s); (p.s.material as THREE.Material).dispose(); });
                    return false;
                }
                return true;
            },
        });
    }

    private spawnPulse(u: UnitView, color: number) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 28),
            new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false}));
        m.rotation.x = -Math.PI / 2;
        m.position.set(u.visPos.x, 0.08, u.visPos.y);
        this.scene.add(m);
        let life = 0.7;
        this.fx.push({
            update: (dt) => {
                life -= dt;
                m.scale.multiplyScalar(1 + dt * 5.5);
                (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, life / 0.7 * 0.9);
                if (life <= 0) { this.scene.remove(m); (m.material as THREE.Material).dispose(); return false; }
                return true;
            },
        });
    }

    /** Split a rolled total into `n` positive chunks that sum back to it (cosmetic per-round ticks). */
    private splitDamage(total: number, n: number): number[] {
        const cuts: number[] = new Array(n).fill(1);
        let left = total - n;
        for (let i = 0; i < n && left > 0; i++) {
            const take = i === n - 1 ? left : Math.floor(Math.random() * (left + 1));
            cuts[i]! += take;
            left -= take;
        }
        return cuts.sort(() => Math.random() - 0.5);
    }

    /** HTML damage/status floater above a unit. */
    /**
     * HTML damage/status floater above a unit.
     *
     * Everything used to anchor at the same height, so a hit that also started
     * a bleed printed "34" and "BLEEDING" on top of one another — the two most
     * important words on screen, illegible. Floaters still alive on the same
     * unit stack upwards instead.
     */
    private floater(u: UnitView, text: string, cls: string) {
        const host = this.overlay.current;
        if (!host) { return; }
        const el = document.createElement("div");
        el.className = "bsFloat f-" + cls;
        el.textContent = text;
        const p = this.toScreen(this.unitAnchor(u, 2.4));
        if (!p) { return; }
        const live = this.floaters.get(u.actor.name) || 0;
        this.floaters.set(u.actor.name, live + 1);
        el.style.left = p.x + "px";
        el.style.top = (p.y - live * 18) + "px";
        host.appendChild(el);
        window.setTimeout(() => {
            el.remove();
            const n = (this.floaters.get(u.actor.name) || 1) - 1;
            if (n > 0) { this.floaters.set(u.actor.name, n); } else { this.floaters.delete(u.actor.name); }
        }, 1300);
    }

    // --------------------------------------------------------------- camera --

    private fitCamera(w: number, h: number) {
        this.camera.aspect = w / Math.max(1, h);
        this.camera.updateProjectionMatrix();
        const halfV = Math.tan((50 * Math.PI / 180) / 2);
        const halfH = halfV * this.camera.aspect;
        // Pull back until the street fits the horizontal frustum — but on a
        // portrait board, fitting all 48m of it put the camera 90 units out and
        // squeezed every unit into a thin band across the middle with the rest
        // of the frame empty asphalt. Frame the width units actually fight over
        // and let the canyon walls crop instead.
        const half = this.camera.aspect < 1.2 ? 16 : 27.5;
        this.camDist = Math.max(30, half / halfH + 12);
        this.camElG = this.baseElevation();
    }

    private toScreen(v: THREE.Vector3): {x: number; y: number} | null {
        const p = v.clone().project(this.camera);
        if (p.z > 1) { return null; }
        const rect = this.renderer.domElement;
        return {x: (p.x * 0.5 + 0.5) * rect.clientWidth, y: (-p.y * 0.5 + 0.5) * rect.clientHeight};
    }

    private resize = () => {
        const host = this.mount.current;
        if (!host || !this.renderer) { return; }
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 500;
        this.renderer.setSize(w, h);
        this.fitCamera(w, h);
    };

    // ----------------------------------------------------------------- loop --

    private animate = () => {
        this.raf = requestAnimationFrame(this.animate);
        const now = performance.now();
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        this.t += dt;

        // acts (playback timeline)
        const act = this.acts[0];
        if (act) {
            if (act.t === 0 && act.start) { act.start(); }
            act.t += dt;
            const k = Math.min(1, act.t / Math.max(0.001, act.dur));
            if (act.update) { act.update(k, dt); }
            if (act.t >= act.dur) {
                if (act.end) { act.end(); }
                this.acts.shift();
                if (!this.acts.length && this.playingId) { this.finishPlayback(this.playingId); }
            }
        }

        // effects
        this.fx = this.fx.filter((f) => f.update(dt));

        // smoke clouds: swell in, drift while their zone lives, thin out after
        for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
            const cloud = this.smokeClouds[i]!;
            if (!cloud.dying && !Battlefield.SMOKE.some((z) =>
                Math.hypot(z.x - cloud.x, z.y - cloud.y) < 2)) {
                cloud.dying = true;
            }
            let gone = true;
            cloud.sprites.forEach((s, j) => {
                const m = s.material as THREE.SpriteMaterial;
                m.opacity = cloud.dying ? Math.max(0, m.opacity - dt * 0.25)
                    : Math.min(0.36, m.opacity + dt * 0.5);
                if (m.opacity > 0.01) { gone = false; }
                if (!this.reduced) {
                    s.position.y += Math.sin(this.t * 0.7 + cloud.phase + j) * dt * 0.12;
                    s.position.x += Math.sin(this.t * 0.3 + j * 2.1) * dt * 0.05;
                }
            });
            if (cloud.dying && gone) {
                cloud.sprites.forEach((s) => {
                    this.scene.remove(s);
                    (s.material as THREE.Material).dispose();
                });
                this.smokeClouds.splice(i, 1);
            }
        }

        // ambient: sign flicker, vent smoke, rain
        if (!this.reduced) {
            for (const s of this.signMats) {
                if (!s.flicker) { continue; }
                const w = Math.sin(this.t * 11 + s.phase * 7) + Math.sin(this.t * 23 + s.phase);
                s.mat.opacity = s.base * (w < -1.55 ? 0.15 : 0.82 + 0.18 * Math.sin(this.t * 3 + s.phase));
            }
            for (const v of this.ventSprites) {
                const k = ((this.t * 0.25 + v.phase) % 1);
                v.s.position.y = 0.4 + k * 2.6;
                (v.s.material as THREE.SpriteMaterial).opacity = 0.2 * (1 - k);
                v.s.scale.setScalar(1.2 + k * 2.2);
            }
        }
        this.stepRain(dt);

        // units
        for (const u of this.units) {
            const a = u.actor;
            // outside playback, trust the engine's position
            if (!this.playingId) {
                u.visPos = {x: a.position.x, y: a.position.y};
                if (a.routed) { u.faded = true; }
                else if (!a.canFight() && u.fallen < 1) { u.fallen = Math.min(1, u.fallen + dt * 2.5); }
                if (!a.alive) { u.faded = true; }
            } else if (!a.canFight() && !a.routed && u.fallen < 1) {
                u.fallen = Math.min(1, u.fallen + dt * 2.5);
            }
            u.group.position.set(u.visPos.x, u.air, u.visPos.y);

            // facing: outside a move/shot, idle-face the nearest live foe
            let dy = u.targetYaw - u.yaw;
            while (dy > Math.PI) { dy -= Math.PI * 2; }
            while (dy < -Math.PI) { dy += Math.PI * 2; }
            u.yaw += dy * Math.min(1, dt * 10);
            u.body.rotation.y = u.yaw;

            // crouch toward cover pose
            const wantCrouch = a.canFight() && Battlefield.nearCover(u.visPos) && !u.walking ? 1 : 0;
            u.crouch += (wantCrouch - u.crouch) * Math.min(1, dt * 6);

            // walk cycle (sprints pump harder and faster; a shot leg drags)
            const limp = a.crippled && !u.sprinting;
            if (u.walking) {
                u.walk += dt * (u.sprinting ? 16 : limp ? 7 : 11);
                const swing = u.sprinting ? 0.95 : 0.75;
                u.legL.rotation.x = Math.sin(u.walk) * swing * (limp ? 1.1 : 1);
                u.legR.rotation.x = -Math.sin(u.walk) * swing * (limp ? 0.35 : 1);   // the bad leg drags
                u.body.position.y = Math.abs(Math.sin(u.walk)) * (u.sprinting ? 0.09 : 0.06);
                u.body.rotation.z = limp ? Math.sin(u.walk) * 0.08 : 0;              // lurching roll
            } else {
                u.legL.rotation.x *= 1 - Math.min(1, dt * 10);
                u.legR.rotation.x *= 1 - Math.min(1, dt * 10);
                u.body.position.y = 0;
                u.body.rotation.z *= 1 - Math.min(1, dt * 8);
            }

            // flinch kick (sprinters otherwise hold a forward lean)
            if (u.flinch > 0) {
                u.flinch -= dt;
                u.body.rotation.x = -Math.sin(Math.max(0, u.flinch) / 0.22 * Math.PI) * 0.3;
            } else if (u.fallen === 0) {
                u.body.rotation.x = u.walking && u.sprinting ? 0.18 : 0;
            }

            // fall / crouch pose (fall wins)
            if (u.fallen > 0) {
                u.body.rotation.x = -u.fallen * Math.PI / 2;
                u.body.position.y = u.fallen * 0.25;
            } else {
                const c = u.crouch;
                u.body.scale.y = 1 - c * 0.24;
            }
            const targetOpacity = u.faded ? 0.15 : 1;
            u.group.traverse((o) => {
                const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
                if (m && m.transparent !== undefined && u.faded && m.opacity > targetOpacity) {
                    m.transparent = true;
                    m.opacity = Math.max(targetOpacity, m.opacity - dt * 2);
                }
            });

            // active ring pulse; rank-5 heavies carry a slow heartbeat even at rest
            const active = this.props.activeName === a.name && a.canFight();
            const boss = u.side === "foe" && (a.rank || 0) >= 5 && a.canFight();
            const pulse = active && !this.reduced ? 1 + Math.sin(this.t * 5) * 0.12
                : boss && !this.reduced ? 1 + Math.max(0, Math.sin(this.t * 3.2)) * 0.16 : 1;
            u.ring.scale.setScalar(pulse * (active ? 1.25 : 1));
            u.ringMat.opacity = u.fallen > 0 ? 0.12 : active ? 0.95 : boss ? 0.62 : 0.45;

            // sniper paint beam: alive exactly as long as the laser lock is
            const lockTarget = a.marking && a.marking.canFight() && a.canFight() ? a.marking : null;
            const lockView = lockTarget ? this.unitFor(lockTarget) : null;
            if (lockView) {
                if (!u.laser) {
                    const geo = new THREE.BufferGeometry();
                    const attr = new THREE.Float32BufferAttribute(new Float32Array(6), 3);
                    geo.setAttribute("position", attr);
                    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
                        color: 0xff2a2a, transparent: true, opacity: 0.7,
                        blending: THREE.AdditiveBlending, depthWrite: false}));
                    const dot = new THREE.Sprite(new THREE.SpriteMaterial({
                        map: BattleScene.glowTex(), color: 0xff2a2a, transparent: true, opacity: 0.85,
                        blending: THREE.AdditiveBlending, depthWrite: false}));
                    dot.scale.setScalar(0.5);
                    this.scene.add(line);
                    this.scene.add(dot);
                    u.laser = {line, attr, dot};
                }
                const from = this.muzzleWorld(u);
                const to = this.unitAnchor(lockView, 1.45);
                u.laser.attr.setXYZ(0, from.x, from.y, from.z);
                u.laser.attr.setXYZ(1, to.x, to.y, to.z);
                u.laser.attr.needsUpdate = true;
                u.laser.line.geometry.computeBoundingSphere();
                u.laser.dot.position.copy(to);
                const wobble = this.reduced ? 0.7 : 0.55 + 0.25 * Math.sin(this.t * 9);
                (u.laser.line.material as THREE.LineBasicMaterial).opacity = wobble;
            } else if (u.laser) {
                this.dropLaser(u);
            }

            // idle facing
            if (!this.playingId && a.canFight()) {
                const foes = (u.side === "foe" ? this.props.party : this.props.enemies).filter((f) => f.canFight());
                if (foes.length) {
                    const nf = foes.reduce((x, y) =>
                        Battlefield.gap(u.visPos, {x: x.position.x, y: x.position.y})
                        < Battlefield.gap(u.visPos, {x: y.position.x, y: y.position.y}) ? x : y);
                    u.targetYaw = Math.atan2(nf.position.x - u.visPos.x, nf.position.y - u.visPos.y);
                }
            }

            // overlay tag — names only while a unit is on the move (keeps the
            // street readable; the HUD and the hostile rail name everyone else)
            const anchor = this.toScreen(this.unitAnchor(u, u.fallen > 0.5 ? 1.0 : 2.35));
            if (anchor && u.walking && !u.faded) {
                u.tag.style.display = "block";
                u.tag.style.left = anchor.x + "px";
                u.tag.style.top = anchor.y + "px";
                // the nameplate draws the board's health too, or it would drop
                // ahead of the round that emptied it
                const shownHp = this.props.shown.of(a);
                const hp = Math.max(0, Math.min(100, (shownHp / Math.max(1, a.maxHealth)) * 100));
                u.hpFill.style.width = hp + "%";
                u.tag.classList.toggle("hurt", shownHp > 0 && shownHp <= a.maxHealth / 2);
                u.tag.classList.toggle("downed", !this.props.shown.up(a));
                u.tag.classList.toggle("cov", a.canFight() && Battlefield.nearCover(u.visPos));
                u.tag.classList.toggle("on", this.props.activeName === a.name);
            } else {
                u.tag.style.display = "none";
            }
        }

        // camera rig: an elevated view from the squad side that eases between an
        // overview and an engagement frame (yaw'd so shooter and target sit on
        // opposite sides of the screen, zoomed to fit them)
        this.focus.lerp(this.focusGoal, Math.min(1, dt * 3));
        const ease = Math.min(1, dt * 2.4);
        this.camYaw += (this.camYawG - this.camYaw) * ease;
        this.camZoom += (this.camZoomG - this.camZoom) * ease;
        this.camEl += (this.camElG - this.camEl) * ease;
        // Duel frames zoom in by shrinking camZoom. On a portrait board the base
        // distance is already close, so an unfloored duel zoom put units through
        // the bottom edge — hold a floor so the frame tightens without cropping.
        const minDist = this.camera.aspect < 1.2 ? 42 : 0;
        const dist = Math.max(minDist, this.camDist * this.camZoom);
        const drift = this.reduced ? 0 : Math.sin(this.t * 0.12) * 1.6;
        // duel frames look at the action dead-centre; the overview biases ahead
        const duel = Math.min(1, Math.abs(this.camYaw) / 0.25 + (1 - this.camZoom) * 2);
        const lookX = this.focus.x * (0.8 + 0.2 * duel);
        // The focus chases whoever is acting, which on a portrait board threw a
        // third of the frame away on empty tarmac: a squad member on the near
        // line dragged the view off the bottom of the arena, a hostile on the
        // far line pushed everyone up into a band. Damp the follow toward the
        // middle of the street — the camera still leans toward the action, but
        // the fight stays composed inside the 0-44m the units live in.
        const raw = this.focus.z + 4 * (1 - duel);
        const lookZ = this.camera.aspect < 1.2 ? ARENA_MID + (raw - ARENA_MID) * 0.45 : raw;
        let cx = lookX + drift - Math.sin(this.camYaw) * Math.cos(this.camEl) * dist;
        const cz = lookZ - Math.cos(this.camYaw) * Math.cos(this.camEl) * dist;
        let cy = Math.sin(this.camEl) * dist;
        if (this.shakeT > 0 && !this.reduced) {
            this.shakeT = Math.max(0, this.shakeT - dt);
            const amp = this.shakeT * 1.6;
            cx += (Math.random() - 0.5) * amp;
            cy += (Math.random() - 0.5) * amp;
        }
        this.camera.position.set(cx, cy, cz);
        this.camera.lookAt(lookX, 1 + duel * 0.4, lookZ);

        this.renderer.render(this.scene, this.camera);
    };

    public override render() {
        return (
            <div className={"bs"}>
                <div className={"bsCanvas"} ref={this.mount}/>
                <div className={"bsOverlay"} ref={this.overlay}/>
            </div>);
    }
}
