import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../../lib/math/Vector2';
import { RobustSAT, SATUtils } from '../../lib/collision/SAT';
import { Canvas } from '../../lib/render/Canvas';
import { CanvasView } from '../../components/CanvasView';

export default function ClippingLab() {
    const [isColliding, setIsColliding] = createSignal(false);
    
    const [polyA, setPolyA] = createSignal<Vector2[]>([
        new Vector2(200, 200), new Vector2(350, 200),
        new Vector2(350, 350), new Vector2(200, 350)
    ]);
    const [polyB, setPolyB] = createSignal<Vector2[]>([
        new Vector2(400, 280), new Vector2(500, 180), new Vector2(450, 380)
    ]);

    const onCanvasReady = (render: Canvas) => {
        let animationId: number;
        let draggingPoly: 'A' | 'B' | null = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        const loop = () => {
            render.clear();
            const currentPolyA = polyA();
            const currentPolyB = polyB();

            // 1. Perform Robust SAT for manifold data
            const result = RobustSAT.testPolygons(currentPolyA, currentPolyB);
            setIsColliding(result.isColliding);

            // Draw Polygons
            render.polygon(currentPolyA, { fill: '#3498db', alpha: 0.2, stroke: '#3498db', lineWidth: 1 });
            render.polygon(currentPolyB, { fill: '#e74c3c', alpha: 0.2, stroke: '#e74c3c', lineWidth: 1 });

            if (result.isColliding) {
                // We use the same logic as the solver to find the faces for visualization
                // Note: result.normal points from A to B
                const refNormal = result.normal.clone();
                
                // For visualization, we need the actual face index. 
                // We'll re-run a small part of the logic to identify the reference face on A.
                let maxSep = -Infinity;
                let refIdx = 0;
                for (let i = 0; i < currentPolyA.length; i++) {
                    const n = SATUtils.getNormal(currentPolyA, i);
                    const dot = n.dot(refNormal);
                    if (dot > maxSep) { maxSep = dot; refIdx = i; }
                }

                const p1 = currentPolyA[refIdx];
                const p2 = currentPolyA[(refIdx + 1) % currentPolyA.length];
                
                // Incident face on B (most anti-parallel to refNormal)
                let minDot = Infinity;
                let incIdx = 0;
                for (let i = 0; i < currentPolyB.length; i++) {
                    const n = SATUtils.getNormal(currentPolyB, i);
                    const dot = n.dot(refNormal);
                    if (dot < minDot) { minDot = dot; incIdx = i; }
                }
                const v1 = currentPolyB[incIdx];
                const v2 = currentPolyB[(incIdx + 1) % currentPolyB.length];

                // --- Visualizing Clipping Planes ---
                const tangent = Vector2.sub(p2, p1, new Vector2()).normalize();
                
                const drawPlane = (p: Vector2, n: Vector2, color: string) => {
                    const t = new Vector2(-n.y, n.x);
                    const s = p.clone().add(t.clone().mult(1000));
                    const e = p.clone().sub(t.clone().mult(1000));
                    render.line(s, e, { stroke: color, lineWidth: 1, dashed: true });
                };
                drawPlane(p1, tangent, 'rgba(255,255,255,0.15)');
                drawPlane(p2, tangent.clone().mult(-1), 'rgba(255,255,255,0.15)');

                // --- Clipping pipeline (Visualization) ---
                render.line(v1, v2, { stroke: 'rgba(255,255,255,0.4)', lineWidth: 8 }); // Original Incident face
                
                // Show Reference Face
                render.line(p1, p2, { stroke: '#2ecc71', lineWidth: 6 }); 
                render.text("REFERENCE FACE", p1.clone().add(p2).mult(0.5).add(refNormal.clone().mult(-25)), { fill: '#2ecc71', font: 'bold 10px Orbitron', align: 'center' });

                // Draw Contacts from result
                for (const contact of result.contacts) {
                    render.circle(contact, 8, { fill: '#00fbff', stroke: '#fff', lineWidth: 2 });
                }
                
                // Draw normal vector from manifold
                const centerA = SATUtils.getCenter(currentPolyA);
                render.arrow(centerA, centerA.clone().add(result.normal.clone().mult(result.depth * 5)), 8, { stroke: '#2ecc71', lineWidth: 2 });
            }

            animationId = requestAnimationFrame(loop);
        };

        const handleMouseDown = (e: MouseEvent) => {
            const mouse = render.getMousePos(e);
            if (SATUtils.isPointInPoly(mouse, polyA())) draggingPoly = 'A';
            else if (SATUtils.isPointInPoly(mouse, polyB())) draggingPoly = 'B';
            if (draggingPoly) { dragOffsetX = mouse.x; dragOffsetY = mouse.y; e.preventDefault(); }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingPoly) return;
            const mouse = render.getMousePos(e);
            const dx = mouse.x - dragOffsetX, dy = mouse.y - dragOffsetY;
            if (draggingPoly === 'A') setPolyA(prev => prev.map(v => new Vector2(v.x + dx, v.y + dy)));
            else setPolyB(prev => prev.map(v => new Vector2(v.x + dx, v.y + dy)));
            dragOffsetX = mouse.x; dragOffsetY = mouse.y;
        };

        render.element.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', () => draggingPoly = null);

        loop();
        onCleanup(() => cancelAnimationFrame(animationId));
    };

    return (
        <div style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #333; background: #0a0a0a;">
            <div style="position: absolute; top: 15px; left: 20px; z-index: 10; display: flex; align-items: center; gap: 15px;">
                <h3 style="margin: 0; font-family: 'Orbitron', sans-serif; font-size: 14px; letter-spacing: 2px; color: #00fbff;">CLIPPING DEEP-DIVE</h3>
                <div style={`font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px; border: 1px solid ${isColliding() ? '#e74c3c' : '#2ecc71'}; color: ${isColliding() ? '#e74c3c' : '#2ecc71'};`}>
                    {isColliding() ? 'PENETRATING' : 'CLEAR'}
                </div>
            </div>

            <CanvasView width={800} height={400} onReady={onCanvasReady} style={{ width: "100%", height: "auto" }} />
            
            <div style="position: absolute; bottom: 15px; left: 20px; color: #555; font-size: 10px; display: flex; gap: 20px; font-family: 'Orbitron'; letter-spacing: 1px;">
                <span><span style="color: #2ecc71; font-weight: bold;">■</span> REF FACE</span>
                <span><span style="color: #00fbff; font-weight: bold;">■</span> INC FACE</span>
                <span><span style="color: #fff; font-weight: bold;">○</span> CONTACT</span>
            </div>
        </div>
    );
}
