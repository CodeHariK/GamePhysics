import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../../lib/math/Vector2';
import { Canvas } from '../../lib/render/Canvas';
import { CanvasView } from '../../components/CanvasView';
import { SAT } from '../../lib/collision/LegacySAT';

export default function InteractiveImpulseDiagram() {
    // Physical Properties
    const [massA, setMassA] = createSignal(1);
    const [massB, setMassB] = createSignal(2);
    const [restitutionA, setRestitutionA] = createSignal(0.5);
    const [restitutionB, setRestitutionB] = createSignal(0.5);
    const [omegaA, setOmegaA] = createSignal(0);
    const [omegaB, setOmegaB] = createSignal(0);

    // Velocity Signals
    const [velAx, setVelAx] = createSignal(50);
    const [velAy, setVelAy] = createSignal(0);
    const [velBx, setVelBx] = createSignal(-30);
    const [velBy, setVelBy] = createSignal(0);

    const velA = () => new Vector2(velAx(), velAy());
    const velB = () => new Vector2(velBx(), velBy());

    // Interaction State
    const [posA, setPosA] = createSignal(new Vector2(300, 150));
    const [posB, setPosB] = createSignal(new Vector2(480, 200));
    const [angleA] = createSignal(Math.PI / 6);
    const [angleB] = createSignal(0);
    const [dragging, setDragging] = createSignal<null | 'A' | 'B'>(null);

    let canvasRef: Canvas | undefined;

    // ... (Rigid Body vertices same as before)
    const getVerticesA = () => {
        const w = 100, h = 60;
        const rect = [
            new Vector2(-w / 2, -h / 2),
            new Vector2(w / 2, -h / 2),
            new Vector2(w / 2, h / 2),
            new Vector2(-w / 2, h / 2),
        ];
        return rotateVertices(rect, angleA()).map(v => v.add(posA()));
    };

    const getVerticesB = () => {
        const radius = 60;
        const hex = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            hex.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
        }
        return rotateVertices(hex, angleB()).map(v => v.add(posB()));
    };

    const rotateVertices = (verts: Vector2[], angle: number) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return verts.map(v => new Vector2(
            v.x * cos - v.y * sin,
            v.x * sin + v.y * cos
        ));
    };

    const onReady = (canvas: Canvas) => {
        canvasRef = canvas;
        canvas.element.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        const loop = () => {
            render(canvas);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    };

    onCleanup(() => {
        if (canvasRef) {
            canvasRef.element.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    });

    const handleMouseDown = (e: MouseEvent) => {
        if (!canvasRef) return;
        const mouse = canvasRef.getMousePos(e);
        if (SAT.isPointInPoly(mouse, getVerticesA())) setDragging('A');
        else if (SAT.isPointInPoly(mouse, getVerticesB())) setDragging('B');
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!canvasRef || !dragging()) return;
        const mouse = canvasRef.getMousePos(e);
        if (dragging() === 'A') setPosA(mouse);
        else setPosB(mouse);
    };

    const handleMouseUp = () => setDragging(null);

    const render = (canvas: Canvas) => {
        canvas.clear();
        canvas.grid(50, 'rgba(255, 255, 255, 0.05)');

        const vertsA = getVerticesA();
        const vertsB = getVerticesB();
        const manifold = SAT.testPolygons(vertsA, vertsB);

        // Draw Bodies
        canvas.polygon(vertsA, {
            fill: dragging() === 'A' ? 'rgba(78, 168, 222, 0.3)' : 'rgba(78, 168, 222, 0.15)',
            stroke: '#4ea8de',
            lineWidth: 2
        });
        canvas.polygon(vertsB, {
            fill: dragging() === 'B' ? 'rgba(86, 207, 225, 0.3)' : 'rgba(86, 207, 225, 0.15)',
            stroke: '#56cfe1',
            lineWidth: 2
        });

        // Combined e
        const e = Math.min(restitutionA(), restitutionB());

        if (manifold.isColliding) {
            const n = manifold.normal;

            manifold.contacts.forEach((cp) => {
                const rA = cp.clone().sub(posA());
                const rB = cp.clone().sub(posB());

                // Relative Velocity at point
                const vpA = new Vector2(velA().x - omegaA() * rA.y, velA().y + omegaA() * rA.x);
                const vpB = new Vector2(velB().x - omegaB() * rB.y, velB().y + omegaB() * rB.x);
                const vRel = vpB.clone().sub(vpA);
                const vRelN = vRel.dot(n);

                // Visualize v_rel
                canvas.arrow(cp, cp.clone().add(vRel), 6, { stroke: 'rgba(255, 255, 255, 0.5)', lineWidth: 1 });
                canvas.text(`v_rel: ${vRel.mag().toFixed(1)}`, cp.clone().add(vRel), { fill: 'rgba(255, 255, 255, 0.5)', font: '10px Inter' });

                if (vRelN < 0) {
                    const rAn = rA.cross(n);
                    const rBn = rB.cross(n);
                    const IA = (1 / 12) * massA() * (100 * 100 + 60 * 60);
                    const IB = (1 / 12) * massB() * (60 * 60 * 2);

                    const invMassSum = (1 / massA()) + (1 / massB()) + (rAn * rAn / IA) + (rBn * rBn / IB);
                    const j = -(1 + e) * vRelN / invMassSum;

                    const impulseVec = n.clone().mult(j * 0.5);
                    canvas.arrow(cp, cp.clone().add(impulseVec), 8, { stroke: '#ff4d6d', lineWidth: 3 });
                    canvas.text(`J: ${j.toFixed(1)}`, cp.clone().add(impulseVec).add(new Vector2(10, 0)), { fill: '#ff4d6d', font: 'bold 12px Inter' });
                }

                canvas.point(cp, 5, { fill: '#ffee32', stroke: '#000', lineWidth: 1 });
            });

            // Draw Normal (at manifold center)
            const manifoldCenter = manifold.contacts.reduce((acc, c) => acc.add(c.clone()), new Vector2(0, 0)).mult(1 / manifold.contacts.length);
            canvas.arrow(manifoldCenter, manifoldCenter.clone().add(n.clone().mult(40)), 10, { stroke: '#fff', lineWidth: 2 });
            canvas.text('shared normal (n)', manifoldCenter.clone().add(n.clone().mult(55)), { fill: '#fff', font: 'bold 12px Inter', align: 'center' });

            // --- SAT AXIS VISUALIZATION ---
            // The Projection Axis IS the collision normal. 
            // We draw it as a line passing through axisOrigin, parallel to n.
            const axisOrigin = new Vector2(100, 300);
            const axisDir = n.clone();

            // Draw Infinite Axis Line (Parallel to Normal)
            canvas.line(
                axisOrigin.clone().sub(axisDir.clone().mult(150)),
                axisOrigin.clone().add(axisDir.clone().mult(150)),
                { stroke: 'rgba(255,255,255,0.1)', lineWidth: 1, dashed: true }
            );

            // Project Polygons onto Axis
            const projA = SAT.projectVertices(vertsA, axisDir);
            const projB = SAT.projectVertices(vertsB, axisDir);

            // To visualize these absolute projection values on our local axisOrigin:
            // We use the projection relative to a reference point (e.g., 0)
            const pStart = axisOrigin.clone();
            const pA_min = pStart.clone().add(axisDir.clone().mult(projA.min - projA.min));
            const pA_max = pStart.clone().add(axisDir.clone().mult(projA.max - projA.min));
            const pB_min = pStart.clone().add(axisDir.clone().mult(projB.min - projA.min));
            const pB_max = pStart.clone().add(axisDir.clone().mult(projB.max - projA.min));

            // Calculate overlap bounds
            const overlapMin = Math.max(projA.min, projB.min);
            const overlapMax = Math.min(projA.max, projB.max);

            // Draw projections (slightly offset from each other so they don't overlap perfectly)
            const perp = new Vector2(-axisDir.y, axisDir.x).mult(6);
            canvas.line(pA_min.clone().sub(perp), pA_max.clone().sub(perp), { stroke: '#4ea8de', lineWidth: 4, alpha: 0.8 });
            canvas.line(pB_min.clone().add(perp), pB_max.clone().add(perp), { stroke: '#56cfe1', lineWidth: 4, alpha: 0.8 });

            if (overlapMax > overlapMin) {
                const pO_min = pStart.clone().add(axisDir.clone().mult(overlapMin - projA.min));
                const pO_max = pStart.clone().add(axisDir.clone().mult(overlapMax - projA.min));
                canvas.line(pO_min, pO_max, { stroke: '#ffee32', lineWidth: 4 });
                canvas.text(`DEPTH: ${manifold.depth.toFixed(1)}`, pO_max.clone().add(axisDir.clone().mult(10)), { fill: '#ffee32', font: 'bold 10px Inter' });
            }

            canvas.text('SAT AXIS (NORMAL)', axisOrigin.clone().sub(axisDir.clone().mult(160)), { fill: '#666', font: 'bold 10px Inter', align: 'center' });
        }

        canvas.text('DRAG BODIES TO COLLIDE', new Vector2(20, 30), { fill: '#888', font: '12px Inter' });
    };

    return (
        <div class="interactive-diagram" style="background: #111; border-radius: 12px; border: 1px solid #333; overflow: hidden; display: flex; flex-direction: column;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; padding: 20px; background: rgba(0,0,0,0.3); border-bottom: 1px solid #333;">
                <div class="control-group">
                    <label style="display: block; font-size: 11px; color: #4ea8de; text-transform: uppercase;">Body A Properties</label>
                    <div style="display: flex; gap: 10px; margin-top: 5px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">Mass: {massA()}</span>
                        <input type="range" min="0.1" max="10" step="0.1" value={massA()} onInput={e => setMassA(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">Vel X: {velAx()}</span>
                        <input type="range" min="-100" max="100" step="1" value={velAx()} onInput={e => setVelAx(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">Vel Y: {velAy()}</span>
                        <input type="range" min="-100" max="100" step="1" value={velAy()} onInput={e => setVelAy(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">e: {restitutionA()}</span>
                        <input type="range" min="0" max="1" step="0.05" value={restitutionA()} onInput={e => setRestitutionA(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">ω: {omegaA()}</span>
                        <input type="range" min="-10" max="10" step="0.1" value={omegaA()} onInput={e => setOmegaA(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                </div>

                <div class="control-group">
                    <label style="display: block; font-size: 11px; color: #56cfe1; text-transform: uppercase;">Body B Properties</label>
                    <div style="display: flex; gap: 10px; margin-top: 5px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">Mass: {massB()}</span>
                        <input type="range" min="0.1" max="10" step="0.1" value={massB()} onInput={e => setMassB(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">Vel X: {velBx()}</span>
                        <input type="range" min="-100" max="100" step="1" value={velBx()} onInput={e => setVelBx(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">Vel Y: {velBy()}</span>
                        <input type="range" min="-100" max="100" step="1" value={velBy()} onInput={e => setVelBy(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">e: {restitutionB()}</span>
                        <input type="range" min="0" max="1" step="0.05" value={restitutionB()} onInput={e => setRestitutionB(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <span style="font-size: 10px; color: #666; width: 40px;">ω: {omegaB()}</span>
                        <input type="range" min="-10" max="10" step="0.1" value={omegaB()} onInput={e => setOmegaB(parseFloat(e.currentTarget.value))} style="flex: 1;" />
                    </div>
                </div>
            </div>

            <CanvasView width={800} height={400} onReady={onReady} showOverlay={false} style={{ cursor: dragging() ? 'grabbing' : 'grab' }} />

            <div style="padding: 15px 20px; background: rgba(0,0,0,0.5); font-size: 12px; color: #aaa; border-top: 1px solid #333;">
                <div style="font-family: monospace; color: #ff4d6d;">
                    Effective Restitution [min(eA, eB)]: {Math.min(restitutionA(), restitutionB()).toFixed(2)} | Formula: j = - (1 + e) * (v_rel · n) / K
                </div>
            </div>
        </div>
    );
}
