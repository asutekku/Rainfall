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
        const z = 26 - (cols <= 1 ? 0 : node.col / (cols - 1)) * 52;
        const col = this.props.run.map[node.col]!;
        const x = col.length <= 1 ? 0 : (node.row / (col.length - 1) - 0.5) * 46;
        const y = 15 + ((node.id.charCodeAt(node.id.length - 1) % 5)) * 0.8;
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
        this.scene.fog = new THREE.Fog(0x08080b, 55, 150);
        this.camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 400);
        this.camera.position.set(0, 34, 62);
        this.camera.lookAt(0, 6, 0);

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

    /** Faint street grid on the ground plane. */
    private buildStreets(): THREE.Object3D {
        const g = new THREE.Group();
        const grid = new THREE.GridHelper(160, 40, 0x1f9aa0, 0x14343a);
        (grid.material as THREE.Material).opacity = 0.35;
        (grid.material as THREE.Material).transparent = true;
        g.add(grid);
        return g;
    }

    /** Procedural wireframe high-rises as one merged LineSegments (cheap). */
    private buildCity(): THREE.Object3D {
        const verts: number[] = [];
        const step = 8;
        for (let gx = -72; gx <= 72; gx += step) {
            for (let gz = -60; gz <= 60; gz += step) {
                if (Math.random() < 0.28) { continue; }                 // gaps for streets/plazas
                const near = Math.abs(gx) < 26 && gz > 10;              // keep the near-camera area open
                if (near && Math.random() < 0.6) { continue; }
                const bw = step * (0.4 + Math.random() * 0.32);
                const bd = step * (0.4 + Math.random() * 0.32);
                const bh = 3 + Math.random() * Math.random() * 22;      // mostly low, a few towers
                this.pushBox(verts, gx + (Math.random() - 0.5) * 2, gz + (Math.random() - 0.5) * 2, bw, bd, bh);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        const mat = new THREE.LineBasicMaterial({color: 0x1f9aa0, transparent: true, opacity: 0.5});
        return new THREE.LineSegments(geo, mat);
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
        // gentle camera sway keeps the route readable while feeling alive
        this.camera.position.x = Math.sin(this.t * 0.15) * 10;
        this.camera.position.y = 34 + Math.sin(this.t * 0.23) * 2;
        this.camera.lookAt(0, 7, 0);
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
                label.style.left = ((v.x * 0.5 + 0.5) * rect.width) + "px";
                label.style.top = ((-v.y * 0.5 + 0.5) * rect.height - 26) + "px";
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
