import * as React from "react";
import * as THREE from "three";
import {Actor} from "../../actors/Actor";
import {NodeType, RunNode, RunState, edgeKey} from "../../interact/runMap";
import {Pt} from "../../interact/cityGen";

// node type -> [marker colour, label]
const TYPE: { [k in NodeType]: [number, string] } = {
    combat: [0x37e1e7, "Firefight"],
    elite: [0xf0a830, "Elite"],
    merchant: [0x7fd67f, "Black Market"],
    rest: [0x8be0ff, "Safehouse"],
    boss: [0xe0533f, "Boss"],
};

// district -> building fill colour (downtown hot, sprawl dim) — rust family
const DISTRICT_FILL = [0xa03428, 0x86392e, 0x5f2c26];
const GREY_FILL = 0x2c3138;

export interface CityMapProps {
    run: RunState;
    party: Actor[];
    onPick: (node: RunNode) => void;
}

interface Marker { node: RunNode; mesh: THREE.Mesh; beam: THREE.Line; base: number; }
interface RouteLine { key: string; a: string; b: string; line: THREE.Line; }

/**
 * The run map as a holographic city (three.js). cityGen carves a large city
 * with angled streets; only the ACTIVE district glows (cyan roads, rust
 * blocks) while the surrounding city sits grey and dormant — future acts.
 * Waypoints sit ON street junctions, connected by routes traced ALONG the
 * streets; the squad's position is ringed, and any adjacent waypoint can be
 * tapped (dungeon-style free movement, backtracking included).
 */
export class CityMap extends React.Component<CityMapProps, {}> {

    private mount = React.createRef<HTMLDivElement>();
    private overlay = React.createRef<HTMLDivElement>();
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private markers: Marker[] = [];
    private routes: RouteLine[] = [];
    private posRing!: THREE.Mesh;
    private labels: { [id: string]: HTMLDivElement } = {};
    private raf = 0;
    private t = 0;
    private baseY = 120;
    private hoverY = 40;
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

        this.hoverY = this.props.run.city.maxActiveHeight + 7;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1200);

        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(w, h);
        this.renderer.setClearColor(0x08080b, 0);
        host.appendChild(this.renderer.domElement);

        this.scene.add(this.buildGround());
        this.scene.add(this.buildRoads());      // opaque, drawn before buildings
        this.scene.add(this.buildBuildings());  // translucent, over the roads
        this.buildRoutes();
        this.buildNodes();
        this.fitCamera(w, h);

        this.renderer.domElement.addEventListener("pointerdown", this.onPick);
        window.addEventListener("resize", this.resize);
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(host);
        this.applyStates();
        this.animate();
    }

    /** Fit the camera to the ACTIVE district (grey city stays visible around it). */
    private fitCamera(w: number, h: number) {
        const c = this.props.run.city;
        const aspect = w / Math.max(1, h);
        const halfFov = Math.tan((50 * Math.PI / 180) / 2);
        const r = c.activeRadius;
        const needed = Math.max(r * 1.22, r / aspect * 1.1);
        this.baseY = (needed / halfFov) * 1.06;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.scene.fog = new THREE.Fog(0x08080b, this.baseY * 1.0, this.baseY * 2.6);
        const ms = Math.max(1.5, this.baseY * 0.019);
        this.markers.forEach((m) => { m.base = (m.node.type === "boss" ? 1.7 : 1) * ms; });
    }

    /** Dark ground with a faint survey grid. */
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
     * Road strips. OPAQUE materials: overlapping strips overdraw with the same
     * flat colour (no transparent stacking → no bright seams), and because
     * they render before the translucent buildings they read as passing BEHIND
     * them. Active streets are cyan; the dormant city's streets are dim slate.
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
        const greys = build(roads.filter((r) => !r.active), 0x23282e, 0.04);
        const minors = build(roads.filter((r) => r.active && !r.major), 0x116d76, 0.06);
        const majors = build(roads.filter((r) => r.active && r.major), 0x25b9c4, 0.08);
        if (greys) { g.add(greys); }
        if (minors) { g.add(minors); }
        if (majors) { g.add(majors); }
        g.renderOrder = 0;
        return g;
    }

    /** All buildings as merged translucent prisms + edge lines. */
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

    /** Route polylines that trace the streets between linked waypoints. */
    private buildRoutes() {
        const run = this.props.run;
        const done = new Set<string>();
        run.nodes.forEach((a) => (run.adj[a.id] || []).forEach((bid) => {
            const key = edgeKey(a.id, bid);
            if (done.has(key)) { return; }
            done.add(key);
            const path = run.paths[key];
            if (!path || path.length < 2) { return; }
            const pts = path.map((p) => new THREE.Vector3(p.x, 0.5, p.z));
            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({color: 0x2e3b40, transparent: true, opacity: 0.9}));
            line.renderOrder = 3;
            this.scene.add(line);
            this.routes.push({key, a: a.id, b: bid, line});
        }));
        // squad position ring
        this.posRing = new THREE.Mesh(
            new THREE.RingGeometry(1.6, 2.4, 24),
            new THREE.MeshBasicMaterial({color: 0x37e1e7, transparent: true, opacity: 0.9, side: THREE.DoubleSide}));
        this.posRing.rotation.x = -Math.PI / 2;
        this.posRing.renderOrder = 4;
        this.scene.add(this.posRing);
    }

    /** Waypoint markers hovering over their street junction + ground beams. */
    private buildNodes() {
        const geo = new THREE.IcosahedronGeometry(1, 0);
        this.props.run.nodes.forEach((node) => {
            const p = new THREE.Vector3(node.pos.x, this.hoverY, node.pos.z);
            const colour = TYPE[node.type][0];
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: colour, wireframe: true}));
            mesh.position.copy(p);
            mesh.userData["nodeId"] = node.id;
            this.scene.add(mesh);
            const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, 0, p.z), p]);
            const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({color: colour, transparent: true, opacity: 0.3}));
            this.scene.add(beam);
            this.markers.push({node, mesh, beam, base: node.type === "boss" ? 1.7 : 1});
            const el = document.createElement("div");
            el.className = "cityLabel";
            el.textContent = TYPE[node.type][1];
            this.overlay.current!.appendChild(el);
            this.labels[node.id] = el;
        });
    }

    /** Reflect run state: reachable pulse+label, cleared dim, routes lit from the squad. */
    private applyStates() {
        const run = this.props.run;
        this.markers.forEach((m) => {
            const reachable = run.reachableIds.indexOf(m.node.id) >= 0;
            const cleared = run.clearedIds.indexOf(m.node.id) >= 0;
            const mat = m.mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = reachable ? 1 : cleared ? 0.3 : 0.55;
            mat.transparent = true;
            (m.beam.material as THREE.Material).opacity = reachable ? 0.55 : cleared ? 0.1 : 0.2;
            const label = this.labels[m.node.id];
            if (label) { label.style.display = reachable && !cleared ? "block" : "none"; }
        });
        this.routes.forEach((r) => {
            const touches = r.a === run.position || r.b === run.position;
            const mat = r.line.material as THREE.LineBasicMaterial;
            mat.color.setHex(touches ? 0x37e1e7 : 0x2e3b40);
            mat.opacity = touches ? 1 : 0.55;
        });
        const at = RunMapPos(run);
        if (at && this.posRing) { this.posRing.position.set(at.x, 0.35, at.z); }
    }

    private resize = () => {
        const host = this.mount.current;
        if (!host || !this.renderer) { return; }
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 500;
        this.renderer.setSize(w, h);
        this.fitCamera(w, h);
    };

    private onPick = (ev: PointerEvent) => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((ev.clientX - rect.left) / rect.width) * 2 - 1,
            -((ev.clientY - rect.top) / rect.height) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, this.camera);
        const hits = ray.intersectObjects(this.markers.map((m) => m.mesh));
        const first = hits[0];
        if (!first) { return; }
        const id = first.object.userData["nodeId"];
        const m = this.markers.find((mk) => mk.node.id === id);
        if (m && this.props.run.reachableIds.indexOf(id) >= 0) { this.props.onPick(m.node); }
    };

    private animate = () => {
        this.raf = requestAnimationFrame(this.animate);
        this.t += 0.016;
        const c = this.props.run.city.activeCenter;
        this.camera.position.x = c.x + Math.sin(this.t * 0.1) * this.baseY * 0.035;
        this.camera.position.y = this.baseY + Math.sin(this.t * 0.16) * this.baseY * 0.02;
        this.camera.position.z = c.z + this.baseY * 0.24;
        this.camera.lookAt(c.x, 0, c.z);
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.markers.forEach((m) => {
            m.mesh.rotation.y += 0.01;
            const reachable = this.props.run.reachableIds.indexOf(m.node.id) >= 0;
            const s = m.base * (reachable ? 1 + Math.sin(this.t * 3) * 0.12 : 1);
            m.mesh.scale.setScalar(s);
            const label = this.labels[m.node.id];
            if (label && label.style.display !== "none") {
                const v = m.mesh.position.clone().project(this.camera);
                const lx = Math.max(48, Math.min(rect.width - 48, (v.x * 0.5 + 0.5) * rect.width));
                const ly = Math.max(18, Math.min(rect.height - 12, (-v.y * 0.5 + 0.5) * rect.height - 26));
                label.style.left = lx + "px";
                label.style.top = ly + "px";
            }
        });
        if (this.posRing) {
            const pulse = 1 + Math.sin(this.t * 2.4) * 0.15;
            const ms = Math.max(1.5, this.baseY * 0.019);
            this.posRing.scale.setScalar(pulse * ms * 0.9);
        }
        this.renderer.render(this.scene, this.camera);
    };

    public override render() {
        return (
            <section id={"stage"} className={"cityStage"}>
                <div className={"cityCanvas"} ref={this.mount}/>
                <div className={"cityOverlay"} ref={this.overlay}/>
                <div className={"cityHint"}>◤ NIGHT CITY — tap a lit waypoint to move</div>
            </section>);
    }
}

/** Ground position of the squad's current node. */
function RunMapPos(run: RunState): Pt | null {
    const node = run.nodes.find((n) => n.id === run.position);
    return node ? node.pos : null;
}
