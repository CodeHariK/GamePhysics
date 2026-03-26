import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../../lib/math/Vector2';
import { SimpleSAT, RobustSAT, SATUtils } from '../../lib/collision/LegacySAT';
import { Canvas } from '../../lib/render/Canvas';
import { CanvasView } from '../../components/CanvasView';

export default function SATLab() {
    // UI Signals
    const [selectedAxisIndex, setSelectedAxisIndex] = createSignal(0);
    const [isColliding, setIsColliding] = createSignal(false);
    const [method, setMethod] = createSignal<'simple' | 'robust'>('simple');
    let canvasInstance: Canvas | null = null;

    // Polygon State (Hexagon A and Rotated Rect B)
    const [polyA, setPolyA] = createSignal<Vector2[]>([
        ...Array.from({length: 6}, (_, i) => {
            const a = i * 60 * (Math.PI / 180);
            return new Vector2(250 + Math.cos(a) * 70, 225 + Math.sin(a) * 70);
        })
    ]);

    const [polyB, setPolyB] = createSignal<Vector2[]>([
        ...[
            new Vector2(-60, -30), new Vector2(60, -30),
            new Vector2(60, 30), new Vector2(-60, 30)
        ].map(v => {
            const a = Math.PI / 6;
            const s = Math.sin(a), c = Math.cos(a);
            return new Vector2(450 + (v.x * c - v.y * s), 225 + (v.x * s + v.y * c));
        })
    ]);

    const onCanvasReady = (render: Canvas) => {
        canvasInstance = render;
        let animationId: number;

        let draggingPoly: 'A' | 'B' | null = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        const loop = () => {
            render.clear();

            const currentPolyA = polyA();
            const currentPolyB = polyB();

            // 1. Gather all axes for visualization
            const getAxes = (poly: Vector2[]) => {
                const axes: Vector2[] = [];
                for (let i = 0; i < poly.length; i++) axes.push(SATUtils.getNormal(poly, i));
                return axes;
            };

            const axesA = getAxes(currentPolyA);
            const axesB = getAxes(currentPolyB);
            const allAxes = [...axesA, ...axesB];
            const testAxis = allAxes[selectedAxisIndex() % allAxes.length];

            // 2. Perform SAT based on method
            const result = method() === 'simple' 
                ? SimpleSAT.testPolygons(currentPolyA, currentPolyB)
                : RobustSAT.testPolygons(currentPolyA, currentPolyB);
            
            setIsColliding(result.isColliding);

            // 3. Rendering Polygons
            render.polygon(currentPolyA, { fill: 'rgba(52, 152, 219, 0.4)', stroke: draggingPoly === 'A' ? '#fff' : '#3498db', lineWidth: 2 });
            render.polygon(currentPolyB, { fill: 'rgba(231, 76, 60, 0.4)', stroke: draggingPoly === 'B' ? '#fff' : '#e74c3c', lineWidth: 2 });

            // --- Visualization: Projection ---
            const cx = render.width / 2, cy = render.height / 2;
            const center = new Vector2(cx, cy);
            const centerProj = center.dot(testAxis);
            
            render.line(new Vector2(cx - testAxis.x * 1000, cy - testAxis.y * 1000), new Vector2(cx + testAxis.x * 1000, cy + testAxis.y * 1000), { stroke: 'rgba(255, 255, 255, 0.1)', lineWidth: 1 });

            const drawShadow = (poly: Vector2[], color: string, offset: number) => {
                const { min, max } = SATUtils.projectVertices(poly, testAxis);
                const start2D = new Vector2(cx + testAxis.x * (min - centerProj), cy + testAxis.y * (min - centerProj));
                const end2D = new Vector2(cx + testAxis.x * (max - centerProj), cy + testAxis.y * (max - centerProj));
                const pAxis = new Vector2(-testAxis.y, testAxis.x);
                render.line(start2D.add(pAxis.clone().mult(offset)), end2D.add(pAxis.clone().mult(offset)), { stroke: color, lineWidth: 6 });
            };

            drawShadow(currentPolyA, '#3498db', -15);
            drawShadow(currentPolyB, '#e74c3c', 15);

            // --- Visualization: Contacts ---
            if (result.isColliding) {
                if (method() === 'simple') {
                    // Method 1: Point in Poly (Red dots)
                    for (const contact of result.contacts) {
                        render.circle(contact, 6, { fill: '#e74c3c', stroke: '#fff', lineWidth: 2 });
                    }
                    render.text("POINT-IN-POLY MODE", new Vector2(cx, 80), { fill: '#e74c3c', font: 'bold 12px "JetBrains Mono", monospace', align: 'center' });
                } else {
                    // Method 2: Robust Clipping (Cyan dots)
                    for (const contact of result.contacts) {
                        render.circle(contact, 6, { fill: '#00fbff', stroke: '#fff', lineWidth: 2 });
                    }
                    render.text("ROBUST CLIPPING MODE", new Vector2(cx, 80), { fill: '#00fbff', font: 'bold 12px "JetBrains Mono", monospace', align: 'center' });
                    
                    // Show a glimpse of the MTV
                    const centerA = SATUtils.getCenter(currentPolyA);
                    render.arrow(centerA, centerA.clone().add(result.normal.clone().mult(result.depth * 5)), 8, { stroke: '#2ecc71', lineWidth: 3 });
                }
            }

            animationId = requestAnimationFrame(loop);
        };

        // --- Interaction ---
        const handleMouseDown = (e: MouseEvent) => {
            const mouse = render.getMousePos(e);
            if (SATUtils.isPointInPoly(mouse, polyA())) draggingPoly = 'A';
            else if (SATUtils.isPointInPoly(mouse, polyB())) draggingPoly = 'B';
            if (draggingPoly) { dragOffsetX = mouse.x; dragOffsetY = mouse.y; e.preventDefault(); }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingPoly) return;
            const mouse = render.getMousePos(e);
            const dx = mouse.x - dragOffsetX;
            const dy = mouse.y - dragOffsetY;
            if (draggingPoly === 'A') setPolyA(prev => prev.map(v => new Vector2(v.x + dx, v.y + dy)));
            else setPolyB(prev => prev.map(v => new Vector2(v.x + dx, v.y + dy)));
            dragOffsetX = mouse.x; dragOffsetY = mouse.y;
        };

        render.element.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', () => draggingPoly = null);

        loop();
        onCleanup(() => {
            cancelAnimationFrame(animationId);
            render.element.removeEventListener('mousedown', handleMouseDown);
        });
    };

    return (
        <div style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #333; background: #0a0a0a;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(0,0,0,0.5); border-bottom: 1px solid #222; position: absolute; top: 0; left: 0; right: 0; z-index: 10; backdrop-filter: blur(5px);">
                <div style="display: flex; gap: 20px; align-items: center;">
                    <h2 style="margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 14px; letter-spacing: 2px; color: #3498db;">01. SAT LAB</h2>
                    <div style="display: flex; background: #111; padding: 2px; border-radius: 4px; border: 1px solid #222;">
                        <button onClick={() => setMethod('simple')} style={`padding: 4px 10px; border-radius: 3px; border: none; cursor: pointer; font-size: 9px; font-family: 'JetBrains Mono', monospace; ${method() === 'simple' ? 'background: #e74c3c; color: white;' : 'background: transparent; color: #555;'}`}>SIMPLE</button>
                        <button onClick={() => setMethod('robust')} style={`padding: 4px 10px; border-radius: 3px; border: none; cursor: pointer; font-size: 9px; font-family: 'JetBrains Mono', monospace; ${method() === 'robust' ? 'background: #00fbff; color: #000; font-weight: bold;' : 'background: transparent; color: #555;'}`}>ROBUST</button>
                    </div>
                </div>
                <div style={`font-weight: bold; padding: 4px 12px; border-radius: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; ${isColliding() ? 'background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #e74c3c;' : 'background: rgba(46, 204, 113, 0.1); border: 1px solid #2ecc71; color: #2ecc71;'}`}>
                    {isColliding() ? 'Collision' : 'Clear'}
                </div>
            </div>

            <CanvasView width={800} height={450} onReady={onCanvasReady} class="sat-canvas" style={{ width: "100%", height: "auto" }} />

            <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,0.8); padding: 10px 15px; border-radius: 6px; border: 1px solid #222;">
                <button onClick={() => setSelectedAxisIndex(prev => prev + 1)} style="padding: 6px 12px; background: #333; color: #fff; border: 1px solid #444; border-radius: 4px; cursor: pointer; font-size: 10px; font-family: 'JetBrains Mono', monospace;">Next Axis</button>
                <button onClick={() => {
                    if (!canvasInstance) return;
                    const rect = canvasInstance.element.getBoundingClientRect();
                    const vertices: Vector2[] = [];
                    const angles: number[] = [];
                    const cx = (rect.width / 2) / canvasInstance.zoom - canvasInstance.offset.x;
                    const cy = (rect.height / 2) / canvasInstance.zoom - canvasInstance.offset.y;
                    
                    for (let i = 0; i < 4; i++) angles.push(Math.random() * Math.PI * 2);
                    angles.sort((a, b) => a - b);
                    for (const a of angles) {
                        const r = 40 + Math.random() * 50;
                        vertices.push(new Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
                    }
                    setPolyB(vertices);
                }} style="padding: 6px 12px; background: #333; color: #fff; border: 1px solid #444; border-radius: 4px; cursor: pointer; font-size: 10px; font-family: 'JetBrains Mono', monospace;">Shuffle B</button>
                <div style="flex: 1; text-align: right; font-size: 10px; color: #555; font-family: 'JetBrains Mono', monospace;">
                    METHOD: <span style={`color: ${method() === 'simple' ? '#e74c3c' : '#00fbff'}`}>{method().toUpperCase()}</span>
                </div>
            </div>
        </div>
    );
}
