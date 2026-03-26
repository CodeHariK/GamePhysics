import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../../../lib/math/Vector2';
import { Body } from '../../../lib/bodies/Body';
import { World } from '../../../lib/dynamics/World';
import { Engine } from '../../../lib/dynamics/Engine';
import { RevoluteConstraint } from '../../../lib/constraints/RevoluteConstraint';
import { MouseConstraint } from '../../../lib/constraints/MouseConstraint';
import type { ConstraintSettings } from '../../../lib/constraints/Constraint';
import { Canvas } from '../../../lib/render/Canvas';
import { CanvasView } from '../../../components/CanvasView';

export default function RevoluteIterativeDemo() {
    const [iterations, setIterations] = createSignal(20);
    const [numLinks, setNumLinks] = createSignal(7);
    const [warmStart, setWarmStart] = createSignal(true);
    const [mode, setMode] = createSignal<ConstraintSettings['mode']>('soft');
    const [hertz, setHertz] = createSignal(60.0);
    const [damping, setDamping] = createSignal(0.1);
    const [baumgarte, setBaumgarte] = createSignal(0.1);
    
    let world: World;
    let engine: Engine;
    let renderer: Canvas;
    let mouseConstraint: MouseConstraint | null = null;

    const onCanvasReady = (canvas: Canvas) => {
        renderer = canvas;
        world = new World();
        engine = new Engine(world);
        
        setupScene();
        
        engine.onUpdate(() => {
            render();
        });
        
        engine.start();

        const handleMouseDown = (e: MouseEvent) => {
            const mousePos = renderer.getMousePos(e);
            for (const body of world.bodies) {
                if (body.isStatic) continue;
                if (mousePos.x >= body.aabb.min.x && mousePos.x <= body.aabb.max.x &&
                    mousePos.y >= body.aabb.min.y && mousePos.y <= body.aabb.max.y) {
                    mouseConstraint = new MouseConstraint(body, mousePos);
                    world.addConstraint(mouseConstraint);
                    break;
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (mouseConstraint) {
                mouseConstraint.setTarget(renderer.getMousePos(e));
            }
        };

        const handleMouseUp = () => {
            if (mouseConstraint) {
                world.removeConstraint(mouseConstraint);
                mouseConstraint = null;
            }
        };

        renderer.element.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        onCleanup(() => {
            renderer.element.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        });
    };

    const setupScene = () => {
        world.clear();
        
        const centerX = 400;
        const centerY = 50; // Ceiling
        const n = numLinks();
        const size = 30;
        const sqrt2 = Math.sqrt(2);
        const diagonal = size * sqrt2;

        let prevBody: Body | null = null;

        for (let i = 0; i < n; i++) {
            const isStatic = i === 0;
            const x = centerX;
            const y = centerY + i * diagonal;
            
            // reference simple_phys: mass = density * w * h
            // for 15x15 box rotated 45 deg, w=15, h=15. density=1. mass=225.
            // inertia = (mass * (w*w + h*h)) / 12 = 225 * (450) / 12 = 8437.5
            const m = isStatic ? 0 : size * size;
            const inertia = isStatic ? 0 : (m * (size * size + size * size)) / 12;
            
            const body = new Body(x, y, m, inertia, isStatic);
            body.rotation = Math.PI / 4; // 45 degrees
            if (!isStatic) {
                const hue = Math.random() * 360;
                body.color = `hsl(${hue}, 80%, 75%)`;
            }
            
            const s = size / 2;
            body.setVertices([
                new Vector2(-s, -s),
                new Vector2(s, -s),
                new Vector2(s, s),
                new Vector2(-s, s)
            ]);
            
            world.addBody(body);

            if (prevBody) {
                const jointPos = new Vector2(x, y - diagonal / 2);
                const constraint = new RevoluteConstraint(prevBody, body, jointPos);
                constraint.constraintSettings = {
                    mode: mode(),
                    warmStarting: warmStart(),
                    contactSoft: { hertz: hertz(), dampingRatio: damping() },
                    jointSoft: { hertz: hertz(), dampingRatio: damping() },
                    baumgarteFactor: baumgarte(),
                    contactSpeed: 0
                };
                world.addConstraint(constraint);
                
                // Add initial swing to the last link
                if (i === n - 1) {
                    body.velocity.set(1000, 0); // initial kick
                }
            }

            prevBody = body;
        }
    };

    const render = () => {
        renderer.clear();
        
        world.constraintIterations = iterations();
        engine.hz = 240;
        
        world.constraints.forEach(c => {
            if (c instanceof RevoluteConstraint) {
                c.constraintSettings = {
                    mode: mode() as any,
                    warmStarting: warmStart(),
                    contactSoft: { hertz: hertz(), dampingRatio: damping() },
                    jointSoft: { hertz: hertz(), dampingRatio: damping() },
                    baumgarteFactor: baumgarte(),
                    contactSpeed: 0
                };
            }
        });

        // Draw bodies
        world.bodies.forEach(body => {
            renderer.polygon(body.vertices, {
                fill: body.isStatic ? '#34495e' : (body.color || '#3498db'),
                stroke: '#2c3e50',
                lineWidth: 1.5
            });
            renderer.circle(body.position, 2, { fill: '#fff' });
        });

        // Draw constraints
        world.constraints.forEach(c => {
            if (c instanceof RevoluteConstraint) {
                const worldA = c.bodyA.localToWorld(c.localA);
                renderer.circle(worldA, 3, { fill: '#e74c3c' });
            } else if (c instanceof MouseConstraint) {
                const worldPos = c.bodyA.localToWorld(c.localPoint);
                renderer.line(worldPos, c.target, { stroke: '#3498db', lineWidth: 2, dashed: true });
                renderer.circle(worldPos, 4, { fill: '#3498db' });
            }
        });
    };

    onCleanup(() => {
        if (engine) engine.stop();
    });

    return (
        <div style="background: #f8f9fa; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0; font-family: 'Inter', monospace;">
            <div style="padding: 15px; background: #fff; border-bottom: 1px solid #eee; display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; font-weight: 700; color: #666;">ITERATIONS: {iterations()}</label>
                    <input type="range" min="1" max="50" value={iterations()} onInput={(e) => setIterations(parseInt(e.currentTarget.value))} style="width: 100px;" />
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; font-weight: 700; color: #666;">FPS (HZ): 240</label>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; font-weight: 700; color: #666;">LINKS: {numLinks()}</label>
                    <input type="range" min="1" max="50" value={numLinks()} onInput={(e) => {
                        setNumLinks(parseInt(e.currentTarget.value));
                        setupScene();
                    }} style="width: 80px;" />
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; font-weight: 700; color: #666;">SOLVER MODE</label>
                    <select value={mode()} onChange={(e) => setMode(e.currentTarget.value as any)} style="padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
                        <option value="soft">Soft (Damper)</option>
                        <option value="baumgarte">Baumgarte</option>
                    </select>
                </div>

                {mode() === 'soft' ? (
                    <>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 11px; font-weight: 700; color: #666;">HERTZ: {hertz()}</label>
                            <input type="range" min="1" max="120" value={hertz()} onInput={(e) => setHertz(parseInt(e.currentTarget.value))} style="width: 80px;" />
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 11px; font-weight: 700; color: #666;">DAMPING: {damping()}</label>
                            <input type="range" min="0" max="2" step="0.1" value={damping()} onInput={(e) => setDamping(parseFloat(e.currentTarget.value))} style="width: 80px;" />
                        </div>
                    </>
                ) : (
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 11px; font-weight: 700; color: #666;">BETA: {baumgarte()}</label>
                        <input type="range" min="0" max="1" step="0.05" value={baumgarte()} onInput={(e) => setBaumgarte(parseFloat(e.currentTarget.value))} style="width: 80px;" />
                    </div>
                )}

                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <input type="checkbox" checked={warmStart()} onChange={(e) => setWarmStart(e.currentTarget.checked)} />
                    Warm Start
                </label>

                <button onClick={setupScene} style="padding: 6px 12px; background: #3498db; color: #fff; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px;">Reset</button>
            </div>
            
            <div style="background: #111; position: relative;">
                <CanvasView width={800} height={400} onReady={onCanvasReady} />
                <div style="position: absolute; top: 10px; right: 10px; color: #3498db; font-size: 10px; font-weight: 800; letter-spacing: 1px;">SI SOLVER V2</div>
            </div>
            
            <div style="padding: 12px 15px; background: #fff; border-top: 1px solid #eee; font-size: 13px; color: #555; line-height: 1.4;">
                {mode() === 'soft' 
                    ? "Soft Constraints use a mass-spring-damper formulation. Higher Hertz is stiffer; Damping = 1 is critically damped (less bounce)."
                    : "Baumgarte adds a velocity bias proportional to position error. Effective but can be stiff or explosive at high gains."}
            </div>
        </div>
    );
}

