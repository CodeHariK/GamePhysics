import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../lib/math/Vector2';
import { SAT } from '../lib/collision/SAT';
import { Canvas } from '../lib/render/Canvas';
import { CanvasView } from '../components/CanvasView';

export default function SATVisualization() {
    // UI Signals
    const [selectedAxisIndex, setSelectedAxisIndex] = createSignal(0);
    const [isColliding, setIsColliding] = createSignal(false);
    let canvasInstance: Canvas | null = null;

    // Polygon State
    const [polyA, setPolyA] = createSignal<Vector2[]>([
        new Vector2(200, 200), new Vector2(300, 200),
        new Vector2(300, 300), new Vector2(200, 300)
    ]);
    const [polyB, setPolyB] = createSignal<Vector2[]>([
        new Vector2(400, 250), new Vector2(500, 150), new Vector2(450, 350)
    ]);

    const onCanvasReady = (render: Canvas) => {
        canvasInstance = render;
        let animationId: number;

        let draggingPoly: 'A' | 'B' | null = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        // --- Main Loop ---
        const loop = () => {
            render.clear();

            // 1. Gather all axes to test (Normals of all edges) for the visualization "Light"
            const getAxes = (poly: Vector2[]) => {
                const axes: Vector2[] = [];
                for (let i = 0; i < poly.length; i++) {
                    const p1 = poly[i];
                    const p2 = poly[(i + 1) % poly.length];
                    const edge = p2.clone().sub(p1);
                    axes.push(new Vector2(-edge.y, edge.x).normalize());
                }
                return axes;
            };

            const currentPolyA = polyA();
            const currentPolyB = polyB();

            const axesA = getAxes(currentPolyA);
            const axesB = getAxes(currentPolyB);
            const allAxes = [...axesA, ...axesB];

            // Wrap the UI index so it doesn't break if it goes out of bounds
            const currentAxisIndex = selectedAxisIndex() % allAxes.length;
            const testAxis = allAxes[currentAxisIndex];

            // Determine which edge we are currently projecting from
            const isPolyA = currentAxisIndex < axesA.length;
            const sourcePoly = isPolyA ? currentPolyA : currentPolyB;
            const edgeIdx = isPolyA ? currentAxisIndex : currentAxisIndex - axesA.length;

            // 2. Perform SAT using the library
            const result = SAT.testPolygons(currentPolyA, currentPolyB);
            setIsColliding(result.isColliding);

            // --- Rendering ---
            const drawPoly = (poly: Vector2[], color: string, isDragging: boolean) => {
                render.polygon(poly, {
                    fill: color,
                    stroke: isDragging ? '#fff' : '#555',
                    lineWidth: 2
                });
            };

            drawPoly(currentPolyA, 'rgba(52, 152, 219, 0.5)', draggingPoly === 'A');
            drawPoly(currentPolyB, 'rgba(231, 76, 60, 0.5)', draggingPoly === 'B');

            // --- Highlight Source Edge & Normal ---
            const p1 = sourcePoly[edgeIdx];
            const p2 = sourcePoly[(edgeIdx + 1) % sourcePoly.length];
            const edgeMid = p1.clone().add(p2).mult(0.5);

            // 1. Highlight the edge itself
            render.line(p1, p2, { stroke: '#f1c40f', lineWidth: 6 });

            // 2. Draw the Normal Vector Arrow (The "Flashlight" direction)
            const arrowLen = 50;
            const arrowTip = edgeMid.clone().add(testAxis.clone().mult(arrowLen));
            render.arrow(edgeMid, arrowTip, 10, { stroke: '#f1c40f', lineWidth: 3 });

            // --- Draw "Light" Projection Axis ---
            const cx = render.width / 2;
            const cy = render.height / 2;
            const center = new Vector2(cx, cy);
            const centerProj = center.dot(testAxis); // The scalar projection of the canvas center

            const axisLineStart = new Vector2(cx - testAxis.x * 1000, cy - testAxis.y * 1000);
            const axisLineEnd = new Vector2(cx + testAxis.x * 1000, cy + testAxis.y * 1000);

            render.line(axisLineStart, axisLineEnd, { stroke: 'rgba(255, 255, 255, 0.2)', lineWidth: 1 });

            // --- Draw Projections (Shadows) ---
            const drawShadow = (poly: Vector2[], color: string, offset: number) => {
                const { min, max } = SAT.projectVertices(poly, testAxis);

                // Map the 1D min/max to 2D screen coordinates, but center it on the canvas center axis
                const start2D = new Vector2(
                    cx + testAxis.x * (min - centerProj),
                    cy + testAxis.y * (min - centerProj)
                );
                const end2D = new Vector2(
                    cx + testAxis.x * (max - centerProj),
                    cy + testAxis.y * (max - centerProj)
                );

                // We offset the shadows slightly so they don't draw exactly on top of each other
                const pAxis = new Vector2(-testAxis.y, testAxis.x);
                const offsetX = pAxis.x * offset;
                const offsetY = pAxis.y * offset;

                render.line(
                    new Vector2(start2D.x + offsetX, start2D.y + offsetY),
                    new Vector2(end2D.x + offsetX, end2D.y + offsetY),
                    { stroke: color, lineWidth: 8 }
                );

                // Draw dotted lines from vertices to shadow
                for (let v of poly) {
                    const vProj = v.dot(testAxis);
                    render.line(v, new Vector2(
                        cx + testAxis.x * (vProj - centerProj) + offsetX,
                        cy + testAxis.y * (vProj - centerProj) + offsetY
                    ), {
                        stroke: 'rgba(255,255,255,0.1)',
                        lineWidth: 1,
                        dashed: true
                    });
                }
            };

            // Draw shadows slightly offset from the axis line so we can see overlaps
            drawShadow(currentPolyA, '#3498db', -10);
            drawShadow(currentPolyB, '#e74c3c', 10);

            // --- Draw MTV (Minimum Translation Vector) ---
            if (result.isColliding) {
                const centerA = SAT.getCenter(currentPolyA);
                const mtvScaled = result.normal.clone().mult(result.depth);
                render.line(centerA, centerA.clone().sub(mtvScaled), { stroke: '#2ecc71', lineWidth: 4 });

                // --- NEW: Draw Contact Points ---
                for (const contact of result.contacts) {
                    render.circle(contact, 5, { fill: '#ff4444', stroke: '#fff', alpha: 1 });
                }
            }

            animationId = requestAnimationFrame(loop);
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0) { // Left click
                const mouse = render.getMousePos(e);
                if (SAT.isPointInPoly(mouse, polyA())) {
                    draggingPoly = 'A';
                    e.preventDefault();
                } else if (SAT.isPointInPoly(mouse, polyB())) {
                    draggingPoly = 'B';
                    e.preventDefault();
                }

                if (draggingPoly) {
                    dragOffsetX = mouse.x;
                    dragOffsetY = mouse.y;
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingPoly) return;
            const mouse = render.getMousePos(e);

            const dx = mouse.x - dragOffsetX;
            const dy = mouse.y - dragOffsetY;

            if (draggingPoly === 'A') {
                setPolyA(prev => prev.map(v => new Vector2(v.x + dx, v.y + dy)));
            } else {
                setPolyB(prev => prev.map(v => new Vector2(v.x + dx, v.y + dy)));
            }

            dragOffsetX = mouse.x;
            dragOffsetY = mouse.y;
        };

        const handleMouseUp = () => {
            draggingPoly = null;
        };

        render.element.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        loop();
        onCleanup(() => {
            cancelAnimationFrame(animationId);
            render.element.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        });
    };

    return (
        <div style="font-family: 'Rajdhani', sans-serif; background: #0a0a0a; color: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; gap: 30px; max-width: 1200px; margin: 0 auto;">

            {/* --- Left Column: Visualization --- */}
            <div style="flex: 1.5; display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-family: 'Orbitron', sans-serif; letter-spacing: 2px; background: linear-gradient(90deg, #3498db, #2ecc71); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">SAT VISUALIZER</h2>
                    <div style={`font-weight: bold; padding: 8px 16px; border-radius: 6px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; ${isColliding() ? 'background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #e74c3c;' : 'background: rgba(46, 204, 113, 0.1); border: 1px solid #2ecc71; color: #2ecc71;'}`}>
                        {isColliding() ? '⚠️ Collision Detected' : '✅ No Collision'}
                    </div>
                </div>

                <div style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #333; background: #111;">
                    <CanvasView
                        width={700}
                        height={500}
                        onReady={onCanvasReady}
                        class="sat-canvas"
                        style={{ width: "100%", height: "auto" }}
                    />

                    <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 8px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button
                                onClick={() => setSelectedAxisIndex(prev => prev + 1)}
                                style="padding: 10px 15px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: transform 0.2s; font-size: 12px;"
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Cycle Test Axis
                            </button>
                            <button
                                onClick={() => {
                                    const vertexCount = Math.floor(Math.random() * 5) + 3;
                                    const vertices: Vector2[] = [];
                                    const angles: number[] = [];
                                    const rect = canvasInstance!.element.getBoundingClientRect();
                                    const cx = (rect.width / 2) / canvasInstance!.zoom - canvasInstance!.offset.x;
                                    const cy = (rect.height / 2) / canvasInstance!.zoom - canvasInstance!.offset.y;

                                    for (let i = 0; i < vertexCount; i++) angles.push(Math.random() * Math.PI * 2);
                                    angles.sort((a, b) => a - b);
                                    for (const a of angles) {
                                        const r = 40 + Math.random() * 60;
                                        vertices.push(new Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
                                    }
                                    setPolyB(vertices);
                                }}
                                style="padding: 10px 15px; background: #e67e22; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: transform 0.2s; font-size: 12px;"
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Random Polygon
                            </button>
                            <span style="font-size: 12px; color: #888;">Drag shapes to explore shadows</span>
                        </div>
                        <div style="font-size: 12px; color: #aaa;">
                            Axis Count: <span style="color: #3498db; font-weight: bold;">{polyA().length + polyB().length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Right Column: Educational Blog --- */}
            <div style="flex: 1; padding: 20px; background: #151515; border-radius: 8px; border-left: 4px solid #3498db; overflow-y: auto; max-height: 600px;">
                <h3 style="font-family: 'Orbitron', sans-serif; color: #3498db; margin-top: 0;">Separating Axis Theorem</h3>
                <p style="font-size: 15px; line-height: 1.6; color: #ccc;">
                    The <strong>Separating Axis Theorem (SAT)</strong> is the gold standard for convex polygon collision detection. It states that if you can find an axis upon which the projections of two convex shapes do not overlap, then the shapes are not colliding.
                </p>

                <h4 style="color: #2ecc71; margin-bottom: 5px;">The Logic</h4>
                <p style="font-size: 14px; line-height: 1.5; color: #aaa;">
                    To check for a collision, we must test all the unique "face normals" (perpendicular vectors to the edges) of both polygons. If we find even one gap, we exit early with a <em>clear</em> result.
                </p>

                <div style="background: #000; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; margin: 15px 0; border: 1px solid #333;">
                    <div style="color: #3498db;">function</div> checkCollision(A, B):<br />
                    &nbsp;&nbsp;<span style="color: #6a92b0;">for</span> each edge <span style="color: #6a92b0;">in</span> (A + B):<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;axis = perp(edge).norm()<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&#123;minA, maxA&#125; = project(A, axis)<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&#123;minB, maxB&#125; = project(B, axis)<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #6a92b0;">if</span> maxA &lt; minB <span style="color: #6a92b0;">or</span> maxB &lt; minA:<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #e67e22;">return</span> false <span style="color: #555;">// Separation!</span><br />
                    &nbsp;&nbsp;<br />
                    &nbsp;&nbsp;<span style="color: #e67e22;">return</span> true <span style="color: #555;">// All axes overlap</span>
                </div>

                <h4 style="color: #f1c40f; margin-bottom: 5px;">Minimum Translation Vector (MTV)</h4>
                <p style="font-size: 14px; line-height: 1.5; color: #aaa;">
                    If all axes show an overlap, a collision exists. The <strong>MTV</strong> is the smallest overlap found during the loop. It represents the shortest path to move Polygon A so that it no longer touches Polygon B.
                </p>

                <div style="background: #000; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 12px; margin: 15px 0; border: 1px solid #333; line-height: 1.4;">
                    <div style="color: #f1c40f;">// Finding the MTV</div>
                    <span style="color: #3498db;">let</span> minOverlap = Infinity;<br />
                    <span style="color: #3498db;">let</span> bestAxis = null;<br />
                    <br />
                    <span style="color: #6a92b0;">for</span> each axis:<br />
                    &nbsp;&nbsp;overlap = overlapAmount(A, B, axis)<br />
                    &nbsp;&nbsp;<span style="color: #6a92b0;">if</span> overlap &lt; minOverlap:<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;minOverlap = overlap<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;bestAxis = axis<br />
                    <br />
                    <span style="color: #3498db;">const</span> mtv = bestAxis.mult(minOverlap)<br />
                    <span style="color: #f1c40f;">// Always push AWAY from A</span><br />
                    <span style="color: #6a92b0;">if</span> (mtv.dot(centerB - centerA) &lt; 0) mtv.negate()
                </div>

                <ul style="font-size: 14px; color: #888; padding-left: 20px;">
                    <li style="margin-bottom: 5px;"><strong>Depth:</strong> The magnitude of the smallest overlap.</li>
                    <li><strong>Normal:</strong> The axis direction of that smallest overlap.</li>
                </ul>

                <h4 style="color: #ff4444; margin-bottom: 5px;">Contact Points (Manifold)</h4>
                <p style="font-size: 14px; line-height: 1.5; color: #aaa;">
                    To calculate rotation and torque, we need to know exactly <em>where</em> the shapes are touching. This demo uses a <strong>Vertex-in-Polygon</strong> search:
                </p>

                <div style="background: #000; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 12px; margin: 15px 0; border: 1px solid #333; line-height: 1.4;">
                    <span style="color: #6a92b0;">for</span> each vertex <span style="color: #6a92b0;">in</span> A:<br />
                    &nbsp;&nbsp;<span style="color: #6a92b0;">if</span> isInside(vertex, B) contacts.push(vertex)<br />
                    <span style="color: #6a92b0;">for</span> each vertex <span style="color: #6a92b0;">in</span> B:<br />
                    &nbsp;&nbsp;<span style="color: #6a92b0;">if</span> isInside(vertex, A) contacts.push(vertex)
                </div>

                <p style="font-size: 13px; color: #888;">
                    While fast, this simplified method can miss edge-to-edge contacts. Industry engines use <strong>Sutherland-Hodgman Clipping</strong> for a 100% robust manifold.
                </p>

                <p style="font-size: 13px; font-style: italic; color: #555; margin-top: 20px;">
                    Note: This algorithm only works for <strong>convex</strong> shapes. Concave shapes must be decomposed into convex pieces first.
                </p>
            </div>
        </div>
    );
}
