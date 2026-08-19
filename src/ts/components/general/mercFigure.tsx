import * as React from "react";
import * as THREE from "three";
import {Actor} from "../../actors/Actor";
import {buildFigure} from "../combat/unitModel";

export interface MercFigureProps {
    actor: Actor;
    /** Ink: your own colour or the crew green. */
    you?: boolean | undefined;
}

/**
 * The merc, in the flesh — the same 3D figure the battle scene fields, facing
 * the player and swaying gently on the spot. Built from live actor state, so
 * a helmet strapped on in the loadout editor is on the head when the sheet
 * reopens, and the gun in the little hands is the class of the gun in the
 * big list.
 */
export class MercFigure extends React.Component<MercFigureProps, {}> {

    private mount = React.createRef<HTMLDivElement>();
    private renderer: THREE.WebGLRenderer | null = null;
    private raf = 0;
    private figure: THREE.Group | null = null;
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;

    public override componentDidMount() {
        const host = this.mount.current;
        if (!host) { return; }
        const w = host.clientWidth || 150;
        const h = host.clientHeight || 190;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 50);
        this.camera.position.set(0, 1.7, 4.6);
        this.camera.lookAt(0, 1.05, 0);
        try {
            this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        } catch {
            return;   // no WebGL: the stat sheet still stands on its own
        }
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        this.renderer.setSize(w, h);
        host.appendChild(this.renderer.domElement);
        this.build();
        const tick = (t: number) => {
            // face front, sway a little — a body at ease, not a shop turntable
            if (this.figure) { this.figure.rotation.y = Math.sin(t / 1600) * 0.38; }
            this.renderer!.render(this.scene!, this.camera!);
            this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
    }

    public override componentDidUpdate(prev: MercFigureProps) {
        if (prev.actor !== this.props.actor) { this.build(); }
    }

    public override componentWillUnmount() {
        cancelAnimationFrame(this.raf);
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
            this.renderer = null;
        }
    }

    /** (Re)build the figure from the actor as they stand right now. */
    private build() {
        if (!this.scene) { return; }
        if (this.figure) { this.scene.remove(this.figure); }
        const fig = buildFigure(this.props.actor, this.props.you ? "you" : "ally");
        // the ground disc, in the figure's own ink
        const ringMat = new THREE.MeshBasicMaterial({
            color: fig.color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false});
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.92, 26), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        fig.group.add(ring);
        this.figure = fig.group;
        this.scene.add(fig.group);
    }

    public override render() {
        return <div className={"mercFig"} ref={this.mount}/>;
    }
}
