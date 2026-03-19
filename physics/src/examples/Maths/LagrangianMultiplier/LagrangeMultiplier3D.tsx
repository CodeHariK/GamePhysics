import { onMount, onCleanup, createSignal, createEffect } from 'solid-js';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function LagrangeMultiplier3D() {
    let containerRef: HTMLDivElement | undefined;
    const [t, setT] = createSignal(1.0);
    
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    
    // Dynamic Objects
    let sphere3D: THREE.Mesh;
    let sphere2D: THREE.Mesh;
    let dropLine: THREE.Line;
    let arrowF: THREE.ArrowHelper;
    let arrowG: THREE.ArrowHelper;

    const mathX = () => t();
    const mathY = () => 5 - t();
    const mathZ = () => mathX() * mathX() + mathY() * mathY();
    const gradF = () => ({ x: 2 * mathX(), y: 2 * mathY() });
    const isAtOptimum = () => Math.abs(t() - 2.5) < 0.1;
    const lambda = () => isAtOptimum() ? gradF().x : null;

    const updateVisuals = (currentT: number) => {
        const mx = currentT;
        const my = 5 - mx;
        const mz = mx * mx + my * my;

        const pos3D = new THREE.Vector3(mx, mz, my);
        const pos2D = new THREE.Vector3(mx, 0, my);

        if (sphere3D) sphere3D.position.copy(pos3D);
        if (sphere2D) sphere2D.position.copy(pos2D);

        if (dropLine) {
            const positions = dropLine.geometry.attributes.position;
            positions.setXYZ(0, pos3D.x, pos3D.y, pos3D.z);
            positions.setXYZ(1, pos2D.x, pos2D.y, pos2D.z);
            positions.needsUpdate = true;
            dropLine.computeLineDistances();
        }

        // Gradients
        const gf = { x: 2 * mx, y: 2 * my };
        const dirF = new THREE.Vector3(gf.x, 0, gf.y);
        const lengthF = dirF.length();

        if (arrowF) {
            arrowF.position.copy(pos2D);
            if (lengthF > 0.01) {
                arrowF.setDirection(dirF.clone().normalize());
                arrowF.setLength(lengthF * 0.3, 0.8, 0.4);
            }
        }

        if (arrowG) {
            arrowG.position.copy(pos2D);
        }

        // Check Optimum
        const optimal = Math.abs(currentT - 2.5) < 0.1;
        if (sphere3D) {
            (sphere3D.material as THREE.MeshBasicMaterial).color.setHex(optimal ? 0x34d399 : 0xffffff);
        }
    };

    createEffect(() => {
        updateVisuals(t());
    });

    onMount(() => {
        if (!containerRef) return;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color('#0a0a0a');

        // Camera
        camera = new THREE.PerspectiveCamera(45, containerRef.clientWidth / containerRef.clientHeight, 0.1, 1000);
        camera.position.set(15, 20, 15);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.clientWidth, containerRef.clientHeight);
        containerRef.appendChild(renderer.domElement);

        // Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(2.5, 5, 2.5);
        controls.enableDamping = true;

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        // Static Content
        scene.add(new THREE.GridHelper(20, 20, 0x333333, 0x222222));

        // 1. Paraboloid
        const resolution = 40;
        const size = 6;
        const bowlGeo = new THREE.PlaneGeometry(size * 2, size * 2, resolution, resolution);
        const posAttr = bowlGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            posAttr.setZ(i, x * x + y * y);
        }
        bowlGeo.computeVertexNormals();
        // Rotate to match math (Y is UP in Three.js)
        const bowl = new THREE.Mesh(bowlGeo, new THREE.MeshPhongMaterial({
            color: 0x1e40af, transparent: true, opacity: 0.5, side: THREE.DoubleSide
        }));
        bowl.rotation.x = -Math.PI / 2;
        scene.add(bowl);

        // 2. Constraint Plane (Vertical)
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(15, 30),
            new THREE.MeshBasicMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
        );
        plane.rotation.y = Math.PI / 4;
        plane.position.set(2.5, 10, 2.5);
        scene.add(plane);

        // 3. Dynamic Elements
        sphere3D = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        scene.add(sphere3D);

        sphere2D = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshBasicMaterial({ color: 0x34d399 }));
        scene.add(sphere2D);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        dropLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.5, gapSize: 0.5 }));
        scene.add(dropLine);

        arrowF = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xfbbf24, 0.8, 0.4);
        arrowG = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 1).normalize(), new THREE.Vector3(), 3, 0x22c55e, 0.8, 0.4);
        scene.add(arrowF);
        scene.add(arrowG);

        // Animation Loop
        let frame: number;
        const animate = () => {
            frame = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Initial setup
        updateVisuals(t());

        const handleResize = () => {
            if (!containerRef) return;
            camera.aspect = containerRef.clientWidth / containerRef.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(containerRef.clientWidth, containerRef.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        onCleanup(() => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            scene.clear();
        });
    });

    return (
        <div class="lagrange-3d-wrapper" style="background: #1a1a1a; border-radius: 12px; border: 1px solid #333; overflow: hidden; display: flex;">
            {/* Left: 3D Canvas */}
            <div style="flex: 1; position: relative;">
                <div ref={containerRef} style="width: 100%; height: 500px; cursor: move;" />
                <div style="position: absolute; bottom: 15px; left: 20px; background: rgba(0, 0, 0, 0.7); padding: 8px 15px; border-radius: 20px; color: #fff; font-size: 11px; pointer-events: none; border: 1px solid #333;">
                    🖱️ Drag to Rotate | 📜 Scroll to Zoom
                </div>
            </div>

            {/* Right: UI Panel */}
            <div style="width: 320px; background: #171717; border-left: 1px solid #333; padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                <div style="margin-bottom: 5px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #aaa; font-size: 13px;">Move Point (t)</label>
                    <input type="range" min="0" max="5" step="0.01" value={t()} onInput={(e) => setT(parseFloat(e.currentTarget.value))} style="width: 100%; cursor: pointer; accent-color: #fbbf24;" />
                </div>

                <div style="background: #222; padding: 12px; border-radius: 8px; border: 1px solid #333;">
                    <span style="font-size: 11px; color: #888; display: block; margin-bottom: 4px;">Point (x, y, z)</span>
                    <div style="font-family: monospace; font-size: 14px; color: #60a5fa;">
                        ({mathX().toFixed(2)}, {mathY().toFixed(2)}, {mathZ().toFixed(2)})
                    </div>
                </div>

                <div style="background: #222; padding: 12px; border-radius: 8px; border: 1px solid #333;">
                    <span style="font-size: 11px; color: #888; display: block; margin-bottom: 4px;">2D Floor Gradients</span>
                    <div style="color: #fbbf24; font-family: monospace; font-size: 13px; margin-top: 4px;">∇f: [{gradF().x.toFixed(2)}, {gradF().y.toFixed(2)}]</div>
                    <div style="color: #22c55e; font-family: monospace; font-size: 13px;">∇g: [1.00, 1.00]</div>
                </div>

                <div style={{
                    background: isAtOptimum() ? 'rgba(52, 211, 153, 0.05)' : '#222',
                    padding: '12px',
                    'border-radius': '8px',
                    border: `1px solid ${isAtOptimum() ? '#34d39966' : '#333'}`
                }}>
                    <span style="font-size: 11px; color: #888; display: block; margin-bottom: 4px;">Multiplier Ratio (λ)</span>
                    <div style={{
                        'font-family': 'monospace',
                        'font-size': '16px',
                        color: isAtOptimum() ? '#34d399' : '#444'
                    }}>
                        {isAtOptimum() ? lambda()?.toFixed(2) : 'Searching...'}
                    </div>
                    <span style={{
                        'font-size': '10px',
                        color: isAtOptimum() ? '#34d399' : '#666',
                        display: 'block',
                        'margin-top': '4px'
                    }}>
                        {isAtOptimum() ? 'Minimum Reached! ∇f || ∇g' : 'Gradients not parallel'}
                    </span>
                </div>

                <div class="legend" style="margin-top: auto; font-size: 11px; border-top: 1px solid #333; padding-top: 15px; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 12px; height: 12px; background: #1e40af; border-radius: 3px; opacity: 0.6;" /> Paraboloid f(x,y)</div>
                    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 12px; height: 12px; background: #b91c1c; border-radius: 3px; opacity: 0.3;" /> Constraint x + y = 5</div>
                    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 12px; height: 12px; background: #fbbf24; border-radius: 3px;" /> ∇f (Gradient)</div>
                    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 12px; height: 12px; background: #22c55e; border-radius: 3px;" /> ∇g (Constraint Normal)</div>
                </div>
            </div>
        </div>
    );
}
