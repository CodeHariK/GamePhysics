import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../../../lib/math/Vector2';
import { Body } from '../../../lib/bodies/Body';
import { World } from '../../../lib/dynamics/World';
import { Engine } from '../../../lib/dynamics/Engine';
import { RevoluteConstraint } from '../../../lib/constraints/RevoluteConstraint';
import { MouseConstraint } from '../../../lib/constraints/MouseConstraint';
import { Canvas } from '../../../lib/render/Canvas';
import { CanvasView } from '../../../components/CanvasView';

export default function RevoluteMinimalDemo() {
    const [numLinks, setNumLinks] = createSignal(7);
    const [warmStart, setWarmStart] = createSignal(true);
    const [fps, setFps] = createSignal(0);
    
    let world: World;
    let engine: Engine;
    let renderer: Canvas;
    let mouseConstraint: MouseConstraint | null = null;

    const onCanvasReady = (canvas: Canvas) => {
        renderer = canvas;
        world = new World();
        world.gravity.set(0, 500); // Lighter gravity for the minimal demo
        world.constraintIterations = 20;
        engine = new Engine(world);
        engine.hz = 240;
        
        setupScene();
        
        engine.onUpdate((dt) => {
            render();
            setFps(Math.round(1 / dt));
        });
        
        engine.start();

        const handleMouseDown = (e: MouseEvent) => {
            const mousePos = renderer.getMousePos(e);
            
            // Find body under mouse
            for (const body of world.bodies) {
                if (body.isStatic) continue;
                
                // Simple AABB check for hover (minimal demo style)
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
        const centerY = 50;
        const n = numLinks();
        const size = 30;
        const diag = size * Math.sqrt(2);

        // Ceiling
        const ceiling = new Body(centerX, centerY - 10, 0, 0, true);
        ceiling.setVertices([
            new Vector2(-100, -5),
            new Vector2(100, -5),
            new Vector2(100, 5),
            new Vector2(-100, 5)
        ]);
        world.addBody(ceiling);

        let prevBody: Body = ceiling;

        for (let i = 0; i < n; i++) {
            const x = centerX;
            const y = centerY + (i * diag) + (diag / 2);
            
            const body = new Body(x, y, 1, 500);
            body.rotation = Math.PI / 4; // Diamond shape
            const hue = Math.random() * 360;
            body.color = `hsl(${hue}, 80%, 75%)`;
            
            const hs = size / 2;
            body.setVertices([
                new Vector2(-hs, -hs),
                new Vector2(hs, -hs),
                new Vector2(hs, hs),
                new Vector2(-hs, hs)
            ]);
            
            world.addBody(body);

            const jointPos = new Vector2(centerX, centerY + (i * diag));
            const constraint = new RevoluteConstraint(prevBody, body, jointPos);
            constraint.constraintSettings = {
                mode: 'soft',
                warmStarting: warmStart(),
                contactSoft: { hertz: 30.0, dampingRatio: 0.7 },
                jointSoft: { hertz: 30.0, dampingRatio: 0.7 },
                baumgarteFactor: 0.1,
                contactSpeed: 0
            };
            world.addConstraint(constraint);

            prevBody = body;
        }
    };

    const render = () => {
        renderer.clear();
        
        // Draw bodies
        world.bodies.forEach(body => {
            renderer.polygon(body.vertices, {
                fill: body.isStatic ? '#2c3e50' : (body.color || '#ecf0f1'),
                stroke: '#2c3e50',
                lineWidth: 1.5
            });
        });

        // Draw constraints
        world.constraints.forEach(c => {
            if (c instanceof RevoluteConstraint) {
                const worldA = c.bodyA.localToWorld(c.localA);
                renderer.circle(worldA, 3, { fill: '#e67e22' });
            } else if (c instanceof MouseConstraint) {
                const worldPos = c.bodyA.localToWorld(c.localPoint);
                renderer.line(worldPos, c.target, { stroke: '#3498db', lineWidth: 2, dashed: true });
                renderer.circle(worldPos, 4, { fill: '#3498db' });
            }
        });
    };

    return (
        <div style="background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; font-family: sans-serif;">
            <div style="padding: 15px; border-bottom: 1px solid #eee; display: flex; gap: 20px; align-items: center; justify-content: center; background: #fafafa;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 14px; color: #666;">Links:</span>
                    <input 
                        type="range" min="1" max="25" value={numLinks()} 
                        onInput={(e) => {
                            setNumLinks(parseInt(e.currentTarget.value));
                            setupScene();
                        }} 
                    />
                    <span style="font-size: 14px; font-weight: bold; width: 20px;">{numLinks()}</span>
                </div>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer;">
                    <input type="checkbox" checked={warmStart()} onChange={(e) => {
                        setWarmStart(e.currentTarget.checked);
                        setupScene();
                    }} />
                    Warm Start
                </label>
                <button 
                    onClick={setupScene}
                    style="padding: 4px 12px; background: #eee; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; cursor: pointer;"
                >
                    Reset
                </button>
                <div style="font-size: 12px; font-weight: bold; color: #888;">{fps()} FPS</div>
            </div>
            
            <div style="background: #eee;">
                <CanvasView width={800} height={500} onReady={onCanvasReady} />
            </div>
            
            <div style="padding: 10px; font-size: 12px; color: #888; text-align: center;">
                Drag the boxes to interact with the chain.
            </div>
        </div>
    );
}
