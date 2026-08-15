import * as React from "react";
import * as THREE from "three";
import {Actor} from "../../actors/Actor";
import {MapNode, NodeType, RunState} from "../../interact/runMap";
import {City, Pt, generateCity} from "../../interact/cityGen";

// node type -> [marker colour, label]
const TYPE: { [k in NodeType]: [number, string] } = {
    combat: [0x37e1e7, "Firefight"],
    elite: [0xf0a830, "Elite"],
    merchant: [0x7fd67f, "Black Market"],
    rest: [0x8be0ff, "Safehouse"],
    boss: [0xe0533f, "Boss"],
};

// district -> building fill colour (downtown hot, sprawl dim) — all in the rust family
const DISTRICT_FILL = [0xa03428, 0x86392e, 0x5f2c26];

export interface CityMapProps {
    run: RunState;
    party: Actor[];
    onPick: (node: MapNode) => void;
}

interface Marker { node: MapNode; mesh: THREE.Mesh; beam: THREE.Line; base: number; }

/**
 * The run map as a holographic city (three.js). The city itself comes from
 * cityGen — recursive angled subdivision: glowing cyan arterials and side
 * streets carving translucent rust blocks, with building heights driven by
 * districts (a downtown high-rise core falling off to low sprawl). The whole
 * city fits the frame at a near-top-down angle; the run's nodes hover above it
 * as glowing waypoints. Tapping a reachable waypoint enters that node.
 */
export class CityMap extends React.Component<CityMapProps, {}> {

    private mount = React.createRef<HTMLDivElement>();
    private overlay = React.createRef<HTMLDivElement>();
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private city!: City;
    private markers: Marker[] = [];
    private labels: { [id: string]: HTMLDivElement } = {};
    private pos: { [id: string]: THREE.Vector3 } = {};
    private raf = 0;
    private t = 0;
    private baseY = 120;   // fitted camera height (recomputed on resize)
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

    // ---- world position for a node: col → depth, row → spread, above the skyline ----
    private nodePos(node: MapNode): THREE.Vector3 {
        const cached = this.pos[node.id];
        if (cached) { return cached; }
        const cols = this.props.run.map.length;
        const tz = cols <= 1 ? 0.5 : node.col / (cols - 1);
        const z = (0.5 - tz) * this.city.extentZ * 1.5;
        const col = this.props.run.map[node.col]!;
        const tx = col.length <= 1 ? 0.5 : node.row / (col.length - 1);
        const x = (tx - 0.5) * this.city.extentX * 1.4;
        const y = this.city.maxHeight + 7 + ((node.id.charCodeAt(node.id.length - 1) % 5)) * 0.9;
        const v = new THREE.Vector3(x, y, z);
        this.pos[node.id] = v;
        return v;
    }

    private init() {
        const host = this.mount.current;
        if (!host) { return; }
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 500;

        this.city = generateCity();
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 900);

        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(w, h);
        this.renderer.setClearColor(0x08080b, 0);
        host.appendChild(this.renderer.domElement);

        this.scene.add(this.buildGround());
        this.scene.add(this.buildRoads());
        this.scene.add(this.buildBuildings());
        this.buildNodes();
        this.fitCamera(w, h);

        this.renderer.domElement.addEventListener("pointerdown", this.onPick);
        window.addEventListener("resize", this.resize);
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(host);
        this.applyStates();
        this.animate();
    }

    /** Fit the camera height so the whole city is in frame at any aspect. */
    private fitCamera(w: number, h: number) {
        const aspect = w / Math.max(1, h);
        const halfFov = Math.tan((50 * Math.PI / 180) / 2);
        const needed = Math.max(this.city.extentZ * 1.28, this.city.extentX / aspect * 1.12);
        this.baseY = (needed / halfFov) * 1.08;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.scene.fog = new THREE.Fog(0x08080b, this.baseY * 0.9, this.baseY * 2.4);
        // markers keep a readable on-screen size regardless of camera distance
        const ms = Math.max(1.6, this.baseY * 0.02);
        this.markers.forEach((m) => { m.base = (m.node.type === "boss" ? 1.7 : 1) * ms; });
    }

    /** Dark ground with a faint survey grid. */
    private buildGround(): THREE.Object3D {
        const g = new THREE.Group();
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900),
            new THREE.MeshBasicMaterial({color: 0x06060d}));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.2;
        g.add(ground);
        const grid = new THREE.GridHelper(700, 70, 0x11262c, 0x0b161b);
        (grid.material as THREE.Material).opacity = 0.3;
        (grid.material as THREE.Material).transparent = true;
        g.add(grid);
        return g;
    }

    /** Glowing road strips along every cut segment — arterials wide and bright. */
    private buildRoads(): THREE.Object3D {
        const g = new THREE.Group();
        const build = (major: boolean): THREE.Mesh | null => {
            const verts: number[] = [];
            this.city.roads.filter((r) => r.major === major).forEach((r) => {
                const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z;
                const l = Math.hypot(dx, dz) || 1;
                const nx = (-dz / l) * (r.width / 2), nz = (dx / l) * (r.width / 2);
                const y = major ? 0.1 : 0.06;
                const p = [
                    r.a.x + nx, y, r.a.z + nz, r.b.x + nx, y, r.b.z + nz, r.b.x - nx, y, r.b.z - nz,
                    r.a.x + nx, y, r.a.z + nz, r.b.x - nx, y, r.b.z - nz, r.a.x - nx, y, r.a.z - nz,
                ];
                verts.push(...p);
            });
            if (!verts.length) { return null; }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
            return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
                color: major ? 0x37e1e7 : 0x1f9aa0,
                transparent: true, opacity: major ? 0.75 : 0.4,
                depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
            }));
        };
        const majors = build(true), minors = build(false);
        if (minors) { g.add(minors); }
        if (majors) { g.add(majors); }
        return g;
    }

    /** All buildings as merged translucent prisms + rust edge lines (3 draw calls). */
    private buildBuildings(): THREE.Object3D {
        const g = new THREE.Group();
        const tri: number[][] = [[], [], []];   // per-district fill vertices
        const edge: number[] = [];
        this.city.buildings.forEach((b) => {
            const p = b.poly, n = p.length, h = b.height, d = b.district;
            const put = (v: number[], a: Pt, ya: number, bb: Pt, yb: number, c: Pt, yc: number) =>
                v.push(a.x, ya, a.z, bb.x, yb, bb.z, c.x, yc, c.z);
            for (let i = 1; i < n - 1; i++) {              // top face fan
                put(tri[d]!, p[0]!, h, p[i]!, h, p[i + 1]!, h);
            }
            for (let i = 0; i < n; i++) {                   // side quads + edges
                const a = p[i]!, c = p[(i + 1) % n]!;
                put(tri[d]!, a, 0, c, 0, c, h);
                put(tri[d]!, a, 0, c, h, a, h);
                edge.push(a.x, h, a.z, c.x, h, c.z);        // roof outline
                edge.push(a.x, 0, a.z, a.x, h, a.z);        // corner riser
            }
        });
        tri.forEach((verts, d) => {
            if (!verts.length) { return; }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
            const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
                color: DISTRICT_FILL[d]!, transparent: true, opacity: 0.42,
                depthWrite: false, side: THREE.DoubleSide,
            }));
            m.renderOrder = -1;
            g.add(m);
        });
        const egeo = new THREE.BufferGeometry();
        egeo.setAttribute("position", new THREE.Float32BufferAttribute(edge, 3));
        g.add(new THREE.LineSegments(egeo,
            new THREE.LineBasicMaterial({color: 0xe07a5f, transparent: true, opacity: 0.4})));
        return g;
    }

    /** Waypoint markers + ground beams + route lines between linked nodes. */
    private buildNodes() {
        const geo = new THREE.IcosahedronGeometry(1, 0);
        this.props.run.map.forEach((col) => col.forEach((node) => {
            const p = this.nodePos(node);
            const colour = TYPE[node.type][0];
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: colour, wireframe: true}));
            mesh.position.copy(p);
            mesh.userData["nodeId"] = node.id;
            this.scene.add(mesh);
            const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, 0, p.z), p]);
            const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({color: colour, transparent: true, opacity: 0.3}));
            this.scene.add(beam);
            this.markers.push({node, mesh, beam, base: node.type === "boss" ? 1.7 : 1});
            node.next.forEach((id) => {
                const t = this.findNode(id);
                if (!t) { return; }
                const line = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([p, this.nodePos(t)]),
                    new THREE.LineBasicMaterial({color: 0x2e2e3b, transparent: true, opacity: 0.65}));
                this.scene.add(line);
            });
            const el = document.createElement("div");
            el.className = "cityLabel";
            el.textContent = TYPE[node.type][1];
            this.overlay.current!.appendChild(el);
            this.labels[node.id] = el;
        }));
    }

    private findNode(id: string): MapNode | null {
        for (const col of this.props.run.map) { for (const n of col) { if (n.id === id) { return n; } } }
        return null;
    }

    /** Recolour / dim markers by reachable / cleared, and toggle labels. */
    private applyStates() {
        const {reachableIds, clearedIds} = this.props.run;
        this.markers.forEach((m) => {
            const reachable = reachableIds.indexOf(m.node.id) >= 0;
            const cleared = clearedIds.indexOf(m.node.id) >= 0;
            const mat = m.mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = reachable ? 1 : cleared ? 0.25 : 0.6;
            mat.transparent = true;
            (m.beam.material as THREE.Material).opacity = reachable ? 0.55 : cleared ? 0.08 : 0.22;
            const label = this.labels[m.node.id];
            if (label) { label.style.display = reachable ? "block" : "none"; }
        });
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
        // near top-down with a slow drift; the whole city stays in frame
        this.camera.position.x = Math.sin(this.t * 0.1) * this.baseY * 0.04;
        this.camera.position.y = this.baseY + Math.sin(this.t * 0.16) * this.baseY * 0.02;
        this.camera.position.z = this.baseY * 0.24;
        this.camera.lookAt(0, 0, 0);
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.markers.forEach((m) => {
            m.mesh.rotation.y += 0.01;
            const reachable = this.props.run.reachableIds.indexOf(m.node.id) >= 0;
            const s = m.base * (reachable ? 1 + Math.sin(this.t * 3) * 0.12 : 1);
            m.mesh.scale.setScalar(s);
            const label = this.labels[m.node.id];
            if (label && reachable) {
                const v = m.mesh.position.clone().project(this.camera);
                const lx = Math.max(48, Math.min(rect.width - 48, (v.x * 0.5 + 0.5) * rect.width));
                const ly = Math.max(18, Math.min(rect.height - 12, (-v.y * 0.5 + 0.5) * rect.height - 26));
                label.style.left = lx + "px";
                label.style.top = ly + "px";
            }
        });
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
