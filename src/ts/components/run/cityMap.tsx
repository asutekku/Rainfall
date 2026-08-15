import * as React from "react";
import * as THREE from "three";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {Actor} from "../../actors/Actor";
import {NodeType, RunNode, RunState, edgeKey} from "../../interact/runMap";
import {Pt} from "../../interact/cityGen";

// node type -> [colour, label, glyph]
const TYPE: { [k in NodeType]: [number, string, string] } = {
    combat: [0x37e1e7, "Firefight", "✦"],
    elite: [0xf0a830, "Elite", "☠"],
    merchant: [0x7fd67f, "Black Market", "▤"],
    rest: [0x8be0ff, "Safehouse", "☾"],
    event: [0xc56bff, "Encounter", "◈"],
    boss: [0xe0533f, "Boss", "⚑"],
};

const DISTRICT_FILL = [0xa03428, 0x86392e, 0x5f2c26];
const GREY_FILL = 0x2c3138;
const WHITE = 0xf2f5f7;

const css = (hex: number): string => "#" + hex.toString(16).padStart(6, "0");

export interface CityMapProps {
    run: RunState;
    party: Actor[];
    onPick: (node: RunNode) => void;
}

interface Marker {
    node: RunNode;
    group: THREE.Group;          // halo + solid + wire, all billboard-ish at the hover point
    halo: THREE.Sprite;          // dark backing disc — the pick target (generous tap area)
    solid: THREE.Mesh;
    wire: THREE.Mesh;
    beam: Line2;
    beamMat: LineMaterial;
    baseScale: number;
    pulse: boolean;
    spin: number;                // rad/s — fast for actionable, idle for ambient
}
interface Route { key: string; a: string; b: string; line: Line2; pts: THREE.Vector3[]; len: number; own: LineMaterial | null; dir: number; }

/**
 * The holographic run map, UX pass. One visual language:
 * - colour = meaning: dim cyan is city infrastructure, WHITE is "you / where
 *   you can go now", red is the boss, grey is unknown or dormant;
 * - motion = actionable: only tappable things animate (marching route dashes,
 *   breathing markers) — everything else is still;
 * - solidity = knowledge: fog of war hides a waypoint's nature (grey hollow
 *   diamond) until the squad is adjacent; cleared nodes shrink to checkmarks.
 * Moving is animated: the squad beacon slides along the actual streets to the
 * tapped waypoint before its encounter fires (tap again to skip).
 */
export class CityMap extends React.Component<CityMapProps, {}> {

    private mount = React.createRef<HTMLDivElement>();
    private overlay = React.createRef<HTMLDivElement>();
    private hintRef = React.createRef<HTMLDivElement>();
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private markers: Marker[] = [];
    private routes: Route[] = [];
    private lineMats: LineMaterial[] = [];
    private sharedMats!: { walked: LineMaterial; unknown: LineMaterial; trail: LineMaterial };
    private posRing!: THREE.Mesh;
    private travelDot!: THREE.Mesh;
    private travelAnim: { node: RunNode; pts: THREE.Vector3[]; seg: number; segT: number; speed: number } | null = null;
    private labels: { [id: string]: HTMLDivElement } = {};
    private texCache: { [key: string]: THREE.CanvasTexture } = {};
    private raf = 0;
    private t = 0;
    private last = 0;
    private baseY = 150;
    private hoverY = 40;
    private reduced = false;
    private ro: ResizeObserver | null = null;

    public override componentDidMount() { this.init(); }

    public override componentDidUpdate() { this.applyStates(); }

    public override componentWillUnmount() {
        cancelAnimationFrame(this.raf);
        if (this.ro) { this.ro.disconnect(); }
        window.removeEventListener("resize", this.resize);
        if (this.renderer) {
            this.renderer.domElement.removeEventListener("pointerdown", this.onPick);
            this.renderer.dispose();
            const el = this.renderer.domElement;
            if (el.parentNode) { el.parentNode.removeChild(el); }
        }
    }

    private init() {
        const host = this.mount.current;
        if (!host) { return; }
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 500;
        this.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        this.hoverY = this.props.run.city.maxActiveHeight + 7;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1200);

        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(w, h);
        this.renderer.setClearColor(0x08080b, 0);
        host.appendChild(this.renderer.domElement);

        this.scene.add(this.buildGround());
        this.scene.add(this.buildRoads());
        this.scene.add(this.buildBuildings());
        this.buildRoutes();
        this.buildMarkers();
        this.fitCamera(w, h);

        this.renderer.domElement.addEventListener("pointerdown", this.onPick);
        window.addEventListener("resize", this.resize);
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(host);
        this.applyStates();
        this.last = performance.now();
        this.animate();
    }

    // ------------------------------------------------------------- camera --

    private fitCamera(w: number, h: number) {
        const c = this.props.run.city;
        const aspect = w / Math.max(1, h);
        const halfFov = Math.tan((50 * Math.PI / 180) / 2);
        // fit to the actual waypoint bounds so no marker (or its label) clips
        let hx = 24, hz = 24;
        this.props.run.nodes.forEach((n) => {
            hx = Math.max(hx, Math.abs(n.pos.x - c.activeCenter.x));
            hz = Math.max(hz, Math.abs(n.pos.z - c.activeCenter.z));
        });
        hx += 14; hz += 16;
        const needed = Math.max(hz * 1.35, hx / aspect * 1.08, c.activeRadius * 1.0);
        this.baseY = (needed / halfFov) * 1.06;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.scene.fog = new THREE.Fog(0x08080b, this.baseY * 1.0, this.baseY * 2.6);
        this.lineMats.forEach((m) => m.resolution.set(w, h));
        const ms = this.markerScale();
        this.markers.forEach((m) => { m.baseScale = this.baseScaleFor(m) * ms; });
    }

    private markerScale(): number { return Math.max(1.5, this.baseY * 0.019); }

    private baseScaleFor(m: Marker): number {
        return m.node.type === "boss" ? 4.2 : 3.1;   // refined per-state in applyStates
    }

    // -------------------------------------------------------------- world --

    private buildGround(): THREE.Object3D {
        const g = new THREE.Group();
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400),
            new THREE.MeshBasicMaterial({color: 0x06060d}));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.2;
        g.add(ground);
        const grid = new THREE.GridHelper(900, 90, 0x11262c, 0x0b161b);
        (grid.material as THREE.Material).opacity = 0.3;
        (grid.material as THREE.Material).transparent = true;
        g.add(grid);
        return g;
    }

    /**
     * Road strips — uniformly DIM (width, not brightness, separates arterials
     * from side streets) so white "go" routes own the highlight. Opaque, drawn
     * before the translucent buildings: no bright overlap seams, streets pass
     * behind towers.
     */
    private buildRoads(): THREE.Object3D {
        const g = new THREE.Group();
        const build = (roads: Array<{a: Pt; b: Pt; width: number}>, colour: number, y: number): THREE.Mesh | null => {
            const verts: number[] = [];
            roads.forEach((r) => {
                const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z;
                const l = Math.hypot(dx, dz) || 1;
                const nx = (-dz / l) * (r.width / 2), nz = (dx / l) * (r.width / 2);
                verts.push(
                    r.a.x + nx, y, r.a.z + nz, r.b.x + nx, y, r.b.z + nz, r.b.x - nx, y, r.b.z - nz,
                    r.a.x + nx, y, r.a.z + nz, r.b.x - nx, y, r.b.z - nz, r.a.x - nx, y, r.a.z - nz,
                );
            });
            if (!verts.length) { return null; }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
            return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: colour, side: THREE.DoubleSide}));
        };
        const roads = this.props.run.city.roads;
        const greys = build(roads.filter((r) => !r.active), 0x1c2127, 0.04);
        const active = build(roads.filter((r) => r.active), 0x0f5058, 0.06);   // arterials as dim as the rest
        if (greys) { g.add(greys); }
        if (active) { g.add(active); }
        g.renderOrder = 0;
        return g;
    }

    private buildBuildings(): THREE.Object3D {
        const g = new THREE.Group();
        const tri: number[][] = [[], [], []];
        const greyTri: number[] = [];
        const edge: number[] = [];
        const greyEdge: number[] = [];
        this.props.run.city.buildings.forEach((b) => {
            const p = b.poly, n = p.length, h = b.height;
            const fill = b.active ? tri[b.district]! : greyTri;
            const eg = b.active ? edge : greyEdge;
            const put = (v: number[], a: Pt, ya: number, bb: Pt, yb: number, c: Pt, yc: number) =>
                v.push(a.x, ya, a.z, bb.x, yb, bb.z, c.x, yc, c.z);
            for (let i = 1; i < n - 1; i++) {
                put(fill, p[0]!, h, p[i]!, h, p[i + 1]!, h);
            }
            for (let i = 0; i < n; i++) {
                const a = p[i]!, c = p[(i + 1) % n]!;
                put(fill, a, 0, c, 0, c, h);
                put(fill, a, 0, c, h, a, h);
                eg.push(a.x, h, a.z, c.x, h, c.z);
                eg.push(a.x, 0, a.z, a.x, h, a.z);
            }
        });
        const addFill = (verts: number[], colour: number, opacity: number) => {
            if (!verts.length) { return; }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
            const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
                color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
            }));
            m.renderOrder = 1;
            g.add(m);
        };
        addFill(greyTri, GREY_FILL, 0.32);
        tri.forEach((verts, d) => addFill(verts, DISTRICT_FILL[d]!, 0.42));
        const addEdges = (verts: number[], colour: number, opacity: number) => {
            if (!verts.length) { return; }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
            const l = new THREE.LineSegments(geo,
                new THREE.LineBasicMaterial({color: colour, transparent: true, opacity}));
            l.renderOrder = 2;
            g.add(l);
        };
        addEdges(greyEdge, 0x3d444d, 0.35);
        addEdges(edge, 0xe07a5f, 0.4);
        return g;
    }

    // -------------------------------------------------------------- routes --

    private makeLineMat(cfg: {color: number; width: number; opacity: number; dashed?: boolean}): LineMaterial {
        const m = new LineMaterial({
            color: cfg.color, linewidth: cfg.width, transparent: true, opacity: cfg.opacity,
            dashed: !!cfg.dashed, dashSize: 2.4, gapSize: 1.8, depthTest: true,
        });
        const host = this.mount.current;
        m.resolution.set(host ? host.clientWidth : 800, host ? host.clientHeight : 500);
        this.lineMats.push(m);
        return m;
    }

    /** Street-following route lines between linked waypoints (fat lines). */
    private buildRoutes() {
        this.sharedMats = {
            walked: this.makeLineMat({color: WHITE, width: 2.2, opacity: 0.55}),        // solid white = been there
            unknown: this.makeLineMat({color: 0x4d5761, width: 2, opacity: 0.65}),      // grey = known network
            trail: this.makeLineMat({color: 0xe0533f, width: 2.2, opacity: 0.6, dashed: true}),  // static dashes → objective
        };
        const run = this.props.run;
        const done = new Set<string>();
        run.nodes.forEach((a) => (run.adj[a.id] || []).forEach((bid) => {
            const key = edgeKey(a.id, bid);
            if (done.has(key)) { return; }
            done.add(key);
            const path = run.paths[key];
            if (!path || path.length < 2) { return; }
            const pts = path.map((p) => new THREE.Vector3(p.x, 0.6, p.z));
            let len = 0;
            for (let i = 0; i < pts.length - 1; i++) { len += pts[i]!.distanceTo(pts[i + 1]!); }
            const geo = new LineGeometry();
            const flat: number[] = [];
            pts.forEach((p) => flat.push(p.x, p.y, p.z));
            geo.setPositions(flat);
            const line = new Line2(geo, this.sharedMats.unknown);
            line.computeLineDistances();
            this.scene.add(line);
            this.routes.push({key, a: a.id, b: bid, line, pts, len, own: null, dir: 1});
        }));
        // squad beacon: ground ring + travel dot
        this.posRing = new THREE.Mesh(
            new THREE.RingGeometry(1.4, 2.0, 28),
            new THREE.MeshBasicMaterial({color: WHITE, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false}));
        this.posRing.rotation.x = -Math.PI / 2;
        this.posRing.renderOrder = 5;
        this.scene.add(this.posRing);
        this.travelDot = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 12, 12),
            new THREE.MeshBasicMaterial({color: WHITE, depthTest: false}));
        this.travelDot.renderOrder = 5;
        this.travelDot.visible = false;
        this.scene.add(this.travelDot);
    }

    // ------------------------------------------------------------- markers --

    /** Soft dark halo disc — sits behind each 3D marker so it reads on any background. */
    private haloTex(): THREE.CanvasTexture {
        const cached = this.texCache["halo"];
        if (cached) { return cached; }
        const s = 128;
        const cv = document.createElement("canvas");
        cv.width = s; cv.height = s;
        const ctx = cv.getContext("2d")!;
        const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.5);
        g.addColorStop(0, "rgba(6,6,13,0.92)");
        g.addColorStop(0.72, "rgba(6,6,13,0.78)");
        g.addColorStop(1, "rgba(6,6,13,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        const t = new THREE.CanvasTexture(cv);
        this.texCache["halo"] = t;
        return t;
    }

    private static icoGeo = new THREE.IcosahedronGeometry(1, 0);
    private static octaGeo = new THREE.OctahedronGeometry(1, 0);
    private static tetraGeo = new THREE.TetrahedronGeometry(1.25, 0);
    private static boxGeo = new THREE.BoxGeometry(1.35, 1.35, 1.35);
    private static torusGeo = new THREE.TorusGeometry(0.85, 0.3, 6, 10);
    private static dodecaGeo = new THREE.DodecahedronGeometry(1.05, 0);
    private static knotGeo = new THREE.TorusKnotGeometry(0.7, 0.24, 48, 8);
    private static checkGeo = CityMap.buildCheckGeo();

    /** A chunky 3D checkmark for cleared waypoints. */
    private static buildCheckGeo(): THREE.ExtrudeGeometry {
        const pts: Array<[number, number]> = [
            [-0.9, 0.1], [-0.35, -0.45], [0.8, 0.7], [0.55, 0.95], [-0.35, 0.0], [-0.65, 0.35],
        ];
        const shape = new THREE.Shape();
        shape.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length; i++) { shape.lineTo(pts[i]![0], pts[i]![1]); }
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, {depth: 0.35, bevelEnabled: false});
        geo.center();
        return geo;
    }

    /** The 3D silhouette for each waypoint type. */
    private static typeGeo(type: NodeType): THREE.BufferGeometry {
        switch (type) {
            case "elite": return CityMap.tetraGeo;      // spike
            case "merchant": return CityMap.boxGeo;     // crate
            case "rest": return CityMap.torusGeo;       // safe ring
            case "event": return CityMap.knotGeo;       // tangled question
            case "boss": return CityMap.dodecaGeo;      // heavy core
            default: return CityMap.icoGeo;             // firefight
        }
    }

    private buildMarkers() {
        const ms = this.markerScale();
        this.props.run.nodes.forEach((node) => {
            const p = new THREE.Vector3(node.pos.x, this.hoverY, node.pos.z);
            const group = new THREE.Group();
            group.position.copy(p);

            const halo = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.haloTex(), depthTest: false, transparent: true, opacity: 0.7}));
            halo.scale.setScalar(2.8);
            halo.renderOrder = 9;
            halo.userData["nodeId"] = node.id;
            group.add(halo);

            const solid = new THREE.Mesh(CityMap.icoGeo, new THREE.MeshBasicMaterial({
                color: 0x8b949e, transparent: true, opacity: 0.15, depthTest: false}));
            solid.renderOrder = 10;
            solid.userData["nodeId"] = node.id;
            group.add(solid);

            const wire = new THREE.Mesh(CityMap.icoGeo, new THREE.MeshBasicMaterial({
                color: 0x8b949e, wireframe: true, transparent: true, opacity: 0.55, depthTest: false}));
            wire.renderOrder = 11;
            wire.userData["nodeId"] = node.id;
            group.add(wire);

            this.scene.add(group);
            // beam: a fat vertical line tying the marker to its street junction
            const beamGeo = new LineGeometry();
            beamGeo.setPositions([p.x, 0, p.z, p.x, this.hoverY, p.z]);
            const beamMat = this.makeLineMat({color: 0x4a525c, width: 2, opacity: 0.3});
            const beam = new Line2(beamGeo, beamMat);
            beam.computeLineDistances();
            this.scene.add(beam);
            this.markers.push({node, group, halo, solid, wire, beam, beamMat, baseScale: 3.1 * ms, pulse: false, spin: 0.25});
            const el = document.createElement("div");
            el.className = "cityLabel";
            this.overlay.current!.appendChild(el);
            this.labels[node.id] = el;
        });
    }

    // ---------------------------------------------------------- run states --

    /**
     * Project run state onto the scene. Fog of war: a waypoint only shows its
     * nature when adjacent (the boss is always the visible landmark). Motion is
     * reserved for what's tappable right now.
     */
    private applyStates() {
        const run = this.props.run;
        const ms = this.markerScale();

        this.markers.forEach((m) => {
            const id = m.node.id;
            const t = TYPE[m.node.type];
            const current = id === run.position;
            const reachable = run.reachableIds.indexOf(id) >= 0;
            const cleared = run.clearedIds.indexOf(id) >= 0;
            const revealed = run.revealedIds.indexOf(id) >= 0;
            const boss = m.node.type === "boss";
            const label = this.labels[id]!;
            const beamMat = m.beamMat;
            const solidMat = m.solid.material as THREE.MeshBasicMaterial;
            const wireMat = m.wire.material as THREE.MeshBasicMaterial;
            const haloMat = m.halo.material as THREE.SpriteMaterial;
            m.pulse = false;
            label.style.display = "none";
            // apply(colour, solidOp, wireOp, haloOp, scale, spin)
            const apply = (colour: number, so: number, wo: number, ho: number, scale: number, spin: number) => {
                solidMat.color.setHex(colour); solidMat.opacity = so;
                wireMat.color.setHex(colour); wireMat.opacity = wo;
                haloMat.opacity = ho;
                m.baseScale = scale * ms;
                m.spin = spin;
            };

            if (current) {
                apply(WHITE, 0.35, 1.0, 0.9, 1.5, 0.9);
                beamMat.color.setHex(WHITE); beamMat.opacity = 0.8; beamMat.linewidth = 3;
                label.style.display = "block";
                label.textContent = "You";
                label.style.borderColor = css(WHITE);
            } else if (reachable && !cleared) {
                // adjacency reveals the node's nature — this is a tappable target
                apply(t[0], 0.32, 1.0, 0.9, boss ? 2.4 : 1.8, 1.3);
                m.pulse = true;
                beamMat.color.setHex(t[0]); beamMat.opacity = 0.85; beamMat.linewidth = 3;
                label.style.display = "block";
                label.textContent = `${t[1]} · ${Math.round(this.routeLen(run.position, id))}m`;
                label.style.borderColor = css(t[0]);
            } else if (reachable && cleared) {
                apply(0x9aa4ad, 0.16, 0.7, 0.6, 1.15, 0.45);
                beamMat.color.setHex(0x9aa4ad); beamMat.opacity = 0.4; beamMat.linewidth = 2;
            } else if (cleared) {
                apply(0x3d444d, 0.1, 0.45, 0.35, 1.0, 0.2);
                beamMat.color.setHex(0x3d444d); beamMat.opacity = 0.2; beamMat.linewidth = 1.5;
            } else if (boss) {
                // the goal stays on the map even through fog of war
                apply(t[0], 0.2, 0.65, 0.7, 2.0, 0.35);
                beamMat.color.setHex(t[0]); beamMat.opacity = 0.5; beamMat.linewidth = 2.5;
                label.style.display = "block";
                label.textContent = "Boss";
                label.style.borderColor = css(t[0]);
            } else if (revealed) {
                // bought/earned intel: the type shows through the fog, dimmed —
                // knowledge without motion (it's not tappable from here)
                apply(t[0], 0.14, 0.55, 0.5, 1.3, 0.25);
                beamMat.color.setHex(t[0]); beamMat.opacity = 0.35; beamMat.linewidth = 2;
            } else {
                // fog of war: unknown until you stand next to it
                apply(0x8b949e, 0.0, 0.5, 0.45, 1.05, 0.25);
                beamMat.color.setHex(0x4a525c); beamMat.opacity = 0.3; beamMat.linewidth = 1.5;
            }
            // silhouette: type shape when revealed, checkmark when cleared,
            // octahedron for the squad and for fog-of-war unknowns
            const isCheck = !current && cleared;
            const geo = current ? CityMap.octaGeo
                : isCheck ? CityMap.checkGeo
                : (reachable || boss || revealed) ? CityMap.typeGeo(m.node.type)
                : CityMap.octaGeo;
            m.solid.geometry = geo;
            m.wire.geometry = geo;
            if (isCheck) {                     // extruded check reads best as a solid
                wireMat.opacity = 0;
                solidMat.opacity = reachable ? 0.65 : 0.35;
            }
            m.group.scale.setScalar(m.baseScale);
            m.halo.scale.setScalar(2.8);   // relative to the group scale — wider than the shape
        });

        // routes: white marching dashes out of the current node; calm elsewhere
        const trail = this.bossTrailKeys(run);
        this.routes.forEach((r) => {
            const touches = r.a === run.position || r.b === run.position;
            const otherId = r.a === run.position ? r.b : r.a;
            const otherCleared = run.clearedIds.indexOf(otherId) >= 0;
            const bothCleared = run.clearedIds.indexOf(r.a) >= 0 && run.clearedIds.indexOf(r.b) >= 0;
            if (touches) {
                // goable right now = white marching dashes (fresh target or backtrack)
                if (!r.own) { r.own = this.makeLineMat({color: WHITE, width: 3, opacity: otherCleared ? 0.7 : 0.95, dashed: true}); }
                r.own.opacity = otherCleared ? 0.7 : 0.95;
                r.line.material = r.own;
                // march away from the squad: flip by which end the squad stands on
                const start = r.pts[0]!;
                const cur = this.nodeById(run.position);
                r.dir = cur && Math.hypot(start.x - cur.pos.x, start.z - cur.pos.z) < 1.5 ? 1 : -1;
            } else if (trail.has(r.key)) {
                r.line.material = this.sharedMats.trail;   // the way toward the boss
            } else if (bothCleared) {
                r.line.material = this.sharedMats.walked;  // solid white = been there
            } else {
                r.line.material = this.sharedMats.unknown; // grey = known network
            }
        });

        const at = this.nodeById(run.position);
        if (at && this.posRing && !this.travelAnim) { this.posRing.position.set(at.pos.x, 0.35, at.pos.z); }
        this.setHint();
    }

    private nodeById(id: string): RunNode | null {
        return this.props.run.nodes.find((n) => n.id === id) || null;
    }

    /** Edge keys of the shortest run-graph path from the squad to the boss —
     *  rendered as a red dashed objective trail so the far side is navigable. */
    private bossTrailKeys(run: RunState): Set<string> {
        const out = new Set<string>();
        const boss = run.nodes.find((n) => n.type === "boss");
        if (!boss || boss.id === run.position) { return out; }
        const dist: { [id: string]: number } = {};
        const prev: { [id: string]: string } = {};
        const done: { [id: string]: boolean } = {};
        run.nodes.forEach((n) => dist[n.id] = Infinity);
        dist[run.position] = 0;
        for (;;) {
            let u: string | null = null, du = Infinity;
            run.nodes.forEach((n) => { if (!done[n.id] && dist[n.id]! < du) { du = dist[n.id]!; u = n.id; } });
            if (u === null) { break; }
            done[u] = true;
            (run.adj[u] || []).forEach((v) => {
                const nd = du + this.routeLen(u!, v);
                if (nd < dist[v]!) { dist[v] = nd; prev[v] = u!; }
            });
        }
        let cur = boss.id;
        let guard = run.nodes.length + 2;
        while (cur !== run.position && prev[cur] !== undefined && guard-- > 0) {
            out.add(edgeKey(cur, prev[cur]!));
            cur = prev[cur]!;
        }
        return out;
    }

    private routeLen(a: string, b: string): number {
        const r = this.routes.find((x) => x.key === edgeKey(a, b));
        return r ? r.len : 0;
    }

    private setHint() {
        const el = this.hintRef.current;
        if (!el) { return; }
        if (this.travelAnim) { el.textContent = "◤ EN ROUTE — tap to skip"; return; }
        const run = this.props.run;
        const fresh = run.reachableIds.filter((id) => run.clearedIds.indexOf(id) < 0).length;
        const back = run.reachableIds.length - fresh;
        el.textContent = `◤ ${fresh} route${fresh === 1 ? "" : "s"} open` + (back > 0 ? ` · ${back} back` : "");
    }

    // -------------------------------------------------------------- travel --

    /** Slide the beacon along the street to the tapped node, then resolve it. */
    private startTravel(node: RunNode) {
        const run = this.props.run;
        const path = run.paths[edgeKey(run.position, node.id)];
        const cur = this.nodeById(run.position);
        if (!path || path.length < 2 || !cur || this.reduced) { this.props.onPick(node); return; }
        let pts = path.map((p) => new THREE.Vector3(p.x, 0.6, p.z));
        const d0 = Math.hypot(pts[0]!.x - cur.pos.x, pts[0]!.z - cur.pos.z);
        const dN = Math.hypot(pts[pts.length - 1]!.x - cur.pos.x, pts[pts.length - 1]!.z - cur.pos.z);
        if (dN < d0) { pts = pts.slice().reverse(); }
        let total = 0;
        for (let i = 0; i < pts.length - 1; i++) { total += pts[i]!.distanceTo(pts[i + 1]!); }
        this.travelAnim = {node, pts, seg: 0, segT: 0, speed: Math.min(90, Math.max(30, total / 0.9))};
        this.travelDot.visible = true;
        this.setHint();
    }

    private finishTravel() {
        const anim = this.travelAnim;
        if (!anim) { return; }
        this.travelAnim = null;
        this.travelDot.visible = false;
        this.props.onPick(anim.node);
        this.setHint();
    }

    private stepTravel(dt: number) {
        const anim = this.travelAnim;
        if (!anim) { return; }
        let move = anim.speed * dt;
        while (move > 0 && anim.seg < anim.pts.length - 1) {
            const a = anim.pts[anim.seg]!, b = anim.pts[anim.seg + 1]!;
            const segLen = a.distanceTo(b) || 0.0001;
            const remain = (1 - anim.segT) * segLen;
            if (move < remain) { anim.segT += move / segLen; move = 0; }
            else { move -= remain; anim.seg += 1; anim.segT = 0; }
        }
        if (anim.seg >= anim.pts.length - 1) { this.finishTravel(); return; }
        const a = anim.pts[anim.seg]!, b = anim.pts[anim.seg + 1]!;
        const x = a.x + (b.x - a.x) * anim.segT;
        const z = a.z + (b.z - a.z) * anim.segT;
        this.posRing.position.set(x, 0.35, z);
        this.travelDot.position.set(x, 0.8, z);
    }

    // ---------------------------------------------------------------- input --

    private onPick = (ev: PointerEvent) => {
        if (this.travelAnim) { this.finishTravel(); return; }   // tap to skip
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((ev.clientX - rect.left) / rect.width) * 2 - 1,
            -((ev.clientY - rect.top) / rect.height) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, this.camera);
        const hits = ray.intersectObjects(this.markers.map((m) => m.halo));   // halo = generous tap area
        const first = hits[0];
        if (!first) { return; }
        const id = first.object.userData["nodeId"];
        const m = this.markers.find((mk) => mk.node.id === id);
        if (m && this.props.run.reachableIds.indexOf(id) >= 0 && id !== this.props.run.position) {
            this.startTravel(m.node);
        }
    };

    private resize = () => {
        const host = this.mount.current;
        if (!host || !this.renderer) { return; }
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 500;
        this.renderer.setSize(w, h);
        this.fitCamera(w, h);
        this.applyStates();
    };

    // -------------------------------------------------------------- render --

    private animate = () => {
        this.raf = requestAnimationFrame(this.animate);
        const now = performance.now();
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        this.t += dt;

        const c = this.props.run.city.activeCenter;
        this.camera.position.x = c.x + Math.sin(this.t * 0.1) * this.baseY * 0.035;
        this.camera.position.y = this.baseY + Math.sin(this.t * 0.16) * this.baseY * 0.02;
        this.camera.position.z = c.z + this.baseY * 0.24;
        this.camera.lookAt(c.x, 0, c.z);

        // motion hierarchy: actionable markers spin fast + breathe, ambient ones idle
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.markers.forEach((m) => {
            const s = m.baseScale * (m.pulse && !this.reduced ? 1 + Math.sin(this.t * 2.6) * 0.09 : 1);
            m.group.scale.setScalar(s);
            if (!this.reduced) {
                m.solid.rotation.y += m.spin * dt;
                m.wire.rotation.y += m.spin * dt;
            }
            const label = this.labels[m.node.id];
            if (label && label.style.display !== "none") {
                const v = m.group.position.clone().project(this.camera);
                const half = (label.offsetWidth || 90) / 2 + 6;   // keep the whole chip on screen
                const lx = Math.max(half, Math.min(rect.width - half, (v.x * 0.5 + 0.5) * rect.width));
                const ly = Math.max(18, Math.min(rect.height - 12, (-v.y * 0.5 + 0.5) * rect.height - 30));
                label.style.left = lx + "px";
                label.style.top = ly + "px";
            }
        });
        if (!this.reduced) {
            this.routes.forEach((r) => {
                if (r.own && r.line.material === r.own) { r.own.dashOffset -= dt * 7 * r.dir; }
            });
            const pulse = 1 + Math.sin(this.t * 2.4) * 0.14;
            this.posRing.scale.setScalar(pulse * this.markerScale() * 0.85);
        } else {
            this.posRing.scale.setScalar(this.markerScale() * 0.85);
        }
        this.stepTravel(dt);
        this.renderer.render(this.scene, this.camera);
    };

    public override render() {
        return (
            <section id={"stage"} className={"cityStage"}>
                <div className={"cityCanvas"} ref={this.mount}/>
                <div className={"cityOverlay"} ref={this.overlay}/>
                <div className={"cityHint"} ref={this.hintRef}>◤ NIGHT CITY</div>
            </section>);
    }
}
