import * as React from "react";
import * as THREE from "three";
import {Actor} from "../../actors/Actor";
import {MapNode, NodeType, RunState} from "../../interact/runMap";

// node type -> [marker colour, label]
const TYPE: { [k in NodeType]: [number, string] } = {
    combat: [0x37e1e7, "Firefight"],
    elite: [0xf0a830, "Elite"],
    merchant: [0x7fd67f, "Black Market"],
    rest: [0x8be0ff, "Safehouse"],
    boss: [0xe0533f, "Boss"],
};

export interface CityMapProps {
    run: RunState;
    party: Actor[];
    onPick: (node: MapNode) => void;
}

interface Marker { node: MapNode; mesh: THREE.Mesh; beam: THREE.Line; base: number; }

/**
 * The run map as a lean holographic cityscape (three.js): a procedurally
 * generated wireframe grid of streets and high-rises, with the run's nodes as
 * glowing waypoints hovering over the city, linked by lit routes. Reachable
 * nodes pulse and carry a floating label; the rest are dim. Tapping a reachable
 * waypoint enters that node.
 */
export class CityMap extends React.Component<CityMapProps, {}> {

    private mount = React.createRef<HTMLDivElement>();
    private overlay = React.createRef<HTMLDivElement>();
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private markers: Marker[] = [];
    private labels: { [id: string]: HTMLDivElement } = {};
    private pos: { [id: string]: THREE.Vector3 } = {};
    private raf = 0;
    private t = 0;
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

    // ---- world position for a node: col → depth, row → spread, hovering high ----
    private nodePos(node: MapNode): THREE.Vector3 {
        const cached = this.pos[node.id];
        if (cached) { return cached; }
        const cols = this.props.run.map.length;
        const z = 18 - (cols <= 1 ? 0 : node.col / (cols - 1)) * 42;
        const col = this.props.run.map[node.col]!;
        const x = col.length <= 1 ? 0 : (node.row / (col.length - 1) - 0.5) * 40;
        const y = 34 + ((node.id.charCodeAt(node.id.length - 1) % 5)) * 0.8;   // hover above the skyline
        const v = new THREE.Vector3(x, y, z);
        this.pos[node.id] = v;
        return v;
    }

    private init() {
        const host = this.mount.current;
        if (!host) { return; }
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 500;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x08080b, 90, 260);
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
        this.camera.position.set(0, 90, 24);   // near top-down, slight tilt
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(w, h);
        this.renderer.setClearColor(0x08080b, 0);
        host.appendChild(this.renderer.domElement);

        this.scene.add(this.buildStreets());
        this.scene.add(this.buildCity());
        this.buildNodes();

        this.renderer.domElement.addEventListener("pointerdown", this.onPick);
        window.addEventListener("resize", this.resize);
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(host);
        this.applyStates();
        this.animate();
    }

    /** Dark ground plane with a faint reference grid. */
    private buildStreets(): THREE.Object3D {
        const g = new THREE.Group();
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(360, 360),
            new THREE.MeshBasicMaterial({color: 0x06060d}));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.15;
        g.add(ground);
        const grid = new THREE.GridHelper(320, 64, 0x143038, 0x0d1a20);
        (grid.material as THREE.Material).opacity = 0.25;
        (grid.material as THREE.Material).transparent = true;
        g.add(grid);
        return g;
    }

    /** Glowing cyan road network on the grid lines + rust city blocks between them. */
    private buildCity(): THREE.Object3D {
        const group = new THREE.Group();
        const XE = 82, ZE = 68, BLOCK = 18, ROADW = 2.6;
        const xs = this.gridLines(XE, BLOCK);
        const zs = this.gridLines(ZE, BLOCK);

        // roads: glowing cyan strips along every grid line
        const roadMat = new THREE.MeshBasicMaterial({color: 0x37e1e7, transparent: true, opacity: 0.5,
            depthWrite: false, blending: THREE.AdditiveBlending});
        const roads = new THREE.Group();
        xs.forEach((gx) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(ROADW, ZE * 2), roadMat);
            m.rotation.x = -Math.PI / 2; m.position.set(gx, 0.06, 0); roads.add(m);
        });
        zs.forEach((gz) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(XE * 2, ROADW), roadMat);
            m.rotation.x = -Math.PI / 2; m.position.set(0, 0.06, gz); roads.add(m);
        });
        group.add(roads);

        // one rust high-rise per block, inset from the roads, random height
        const boxes: Array<[number, number, number, number, number]> = [];
        const verts: number[] = [];
        for (let i = 0; i < xs.length - 1; i++) {
            for (let j = 0; j < zs.length - 1; j++) {
                if (Math.random() < 0.12) { continue; }              // occasional plaza
                const inset = ROADW / 2 + 1.6;
                const x0 = xs[i]! + inset, x1 = xs[i + 1]! - inset;
                const z0 = zs[j]! + inset, z1 = zs[j + 1]! - inset;
                const cx = (x0 + x1) / 2 + (Math.random() - 0.5) * 1.5;
                const cz = (z0 + z1) / 2 + (Math.random() - 0.5) * 1.5;
                const bw = ((x1 - x0) / 2) * (0.68 + Math.random() * 0.26);
                const bd = ((z1 - z0) / 2) * (0.68 + Math.random() * 0.26);
                const bh = 3 + Math.random() * Math.random() * 28;
                boxes.push([cx, cz, bw, bd, bh]);
                this.pushBox(verts, cx, cz, bw, bd, bh);
            }
        }
        const faces = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({color: 0x8a2e26, transparent: true, opacity: 0.4, depthWrite: false}),
            boxes.length);
        const mtx = new THREE.Matrix4();
        const rot = new THREE.Quaternion();
        boxes.forEach((b, i) => {
            mtx.compose(new THREE.Vector3(b[0], b[4] / 2, b[1]), rot, new THREE.Vector3(b[2] * 2, b[4], b[3] * 2));
            faces.setMatrixAt(i, mtx);
        });
        faces.instanceMatrix.needsUpdate = true;
        faces.renderOrder = -1;
        group.add(faces);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({color: 0xd06a52, transparent: true, opacity: 0.5})));
        return group;
    }

    private gridLines(extent: number, step: number): number[] {
        const out: number[] = [];
        const n = Math.floor(extent / step);
        for (let i = -n; i <= n; i++) { out.push(i * step); }
        return out;
    }

    /** Push the 12 edges of a box (base on the ground) into a line-vertex buffer. */
    private pushBox(v: number[], cx: number, cz: number, bw: number, bd: number, bh: number) {
        const x0 = cx - bw, x1 = cx + bw, z0 = cz - bd, z1 = cz + bd, y0 = 0, y1 = bh;
        const c = [
            [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
            [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
        ];
        const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        e.forEach(([a, b]) => { v.push(...c[a!]!, ...c[b!]!); });
    }

    /** Waypoint markers + ground beams + route lines between linked nodes. */
    private buildNodes() {
        const geo = new THREE.IcosahedronGeometry(1.5, 0);
        this.props.run.map.forEach((col) => col.forEach((node) => {
            const p = this.nodePos(node);
            const colour = TYPE[node.type][0];
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: colour, wireframe: true}));
            mesh.position.copy(p);
            mesh.userData["nodeId"] = node.id;
            if (node.type === "boss") { mesh.scale.setScalar(1.7); }
            this.scene.add(mesh);
            const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, 0, p.z), p]);
            const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({color: colour, transparent: true, opacity: 0.3}));
            this.scene.add(beam);
            this.markers.push({node, mesh, beam, base: node.type === "boss" ? 1.7 : 1});
            // route lines to the next column
            node.next.forEach((id) => {
                const t = this.findNode(id);
                if (!t) { return; }
                const line = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([p, this.nodePos(t)]),
                    new THREE.LineBasicMaterial({color: 0x2e2e3b, transparent: true, opacity: 0.6}));
                this.scene.add(line);
            });
            // floating HTML label
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
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
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
        // gentle top-down sway keeps the route readable while feeling alive
        this.camera.position.x = Math.sin(this.t * 0.1) * 6;
        this.camera.position.y = 90 + Math.sin(this.t * 0.16) * 3;
        this.camera.position.z = 24;
        this.camera.lookAt(0, 0, 0);
        // pulse reachable markers + spin all
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.markers.forEach((m) => {
            m.mesh.rotation.y += 0.01;
            const reachable = this.props.run.reachableIds.indexOf(m.node.id) >= 0;
            const s = m.base * (reachable ? 1 + Math.sin(this.t * 3) * 0.12 : 1);
            m.mesh.scale.setScalar(s);
            const label = this.labels[m.node.id];
            if (label && reachable) {
                const v = m.mesh.position.clone().project(this.camera);
                // clamp inside the canvas so edge waypoints keep a readable label
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
