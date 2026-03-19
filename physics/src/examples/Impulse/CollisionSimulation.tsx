import { createSignal, onCleanup, onMount } from 'solid-js';
import { Vector2 } from '../../lib/math/Vector2';
import { Body } from '../../lib/bodies/Body';
import { World } from '../../lib/dynamics/World';
import { Engine } from '../../lib/dynamics/Engine';
import { Canvas } from '../../lib/render/Canvas';
import { CanvasView } from '../../components/CanvasView';
import { SAT } from '../../lib/collision/SAT';

export default function CollisionSimulation() {
    const [paused, setPaused] = createSignal(false);
    const [showManifold, setShowManifold] = createSignal(true);
    const [showForces, setShowForces] = createSignal(true);

    let world: World;
    let engine: Engine;
    let canvas: Canvas;

    const [history, setHistory] = createSignal<any[]>([]);
    const MAX_HISTORY = 600; // 10 seconds

    const saveState = () => {
        const state = world.bodies.map(b => ({
            position: b.position.clone(),
            velocity: b.velocity.clone(),
            rotation: b.rotation,
            angularVelocity: b.angularVelocity
        }));
        setHistory(prev => {
            const next = [...prev, state];
            if (next.length > MAX_HISTORY) next.shift();
            return next;
        });
    };

    const restoreState = () => {
        const prevHistory = history();
        if (prevHistory.length === 0) return;

        const state = prevHistory[prevHistory.length - 1];
        setHistory(prev => prev.slice(0, -1));

        world.bodies.forEach((b, i) => {
            const s = state[i];
            b.position.copy(s.position);
            b.velocity.copy(s.velocity);
            b.rotation = s.rotation;
            b.angularVelocity = s.angularVelocity;
        });
        draw();
    };

    const spawnBodies = () => {
        world.clear();
        setHistory([]);

        // Body A: Rotating Box
        const bodyA = new Body(300, 200, 2.0, 5000);
        bodyA.setVertices([
            new Vector2(-50, -50),
            new Vector2(50, -50),
            new Vector2(50, 50),
            new Vector2(-50, 50)
        ]);
        bodyA.velocity.set(100, 150);
        bodyA.angularVelocity = 2.0;
        bodyA.restitution = 0.6;
        (bodyA as any).color = '#4ea8de';
        world.addBody(bodyA);

        // Body B: Static/Heavy Box
        const bodyB = new Body(500, 400, 10.0, 20000);
        bodyB.setVertices([
            new Vector2(-80, -20),
            new Vector2(80, -20),
            new Vector2(80, 20),
            new Vector2(-80, 20)
        ]);
        bodyB.rotation = Math.PI / 6;
        bodyB.velocity.set(-50, -50);
        (bodyB as any).color = '#56cfe1';
        world.addBody(bodyB);
    };

    const onCanvasReady = (c: Canvas) => {
        canvas = c;
        world = new World();
        engine = new Engine(world);
        world.gravity.set(0, 0); // Zero gravity for clear impulse view

        spawnBodies();

        engine.onUpdate(() => {
            if (paused()) return;
            draw();
        });

        engine.start();
    };

    const draw = () => {
        if (!canvas) return;
        canvas.clear();
        canvas.grid();

        // Detect collisions manually for visualization
        const bodies = world.bodies;
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const manifold = SAT.testPolygons(bodies[i].vertices, bodies[j].vertices);
                if (manifold.isColliding) {
                    if (showManifold()) {
                        // Draw Contact Normal
                        const center = manifold.contacts.reduce((acc, c) => acc.add(c), new Vector2(0, 0)).mult(1 / manifold.contacts.length);
                        const normalEnd = center.clone().add(manifold.normal.clone().mult(50));
                        canvas.line(center, normalEnd, { stroke: '#ff4d6d', lineWidth: 2 });
                        canvas.point(normalEnd, 4, { fill: '#ff4d6d' });

                        // Draw Contact Points
                        for (const cp of manifold.contacts) {
                            canvas.point(cp, 6, { fill: '#ffee32', stroke: '#000', lineWidth: 1 });
                        }
                    }

                    if (showForces()) {
                        // Visualize relative velocity or impulse direction
                        for (const cp of manifold.contacts) {
                            const rA = Vector2.sub(cp, bodies[i].position, new Vector2());
                            const rB = Vector2.sub(cp, bodies[j].position, new Vector2());

                            // Relative velocity at contact
                            const vA = new Vector2(bodies[i].velocity.x - bodies[i].angularVelocity * rA.y, bodies[i].velocity.y + bodies[i].angularVelocity * rA.x);
                            const vB = new Vector2(bodies[j].velocity.x - bodies[j].angularVelocity * rB.y, bodies[j].velocity.y + bodies[j].angularVelocity * rB.x);
                            const rv = Vector2.sub(vB, vA, new Vector2());

                            // Draw RV vector (scaled)
                            canvas.line(cp, cp.clone().add(rv.mult(0.2)), { stroke: '#70e000', lineWidth: 2 });
                        }
                    }
                }
            }
        }

        // Draw Bodies
        for (const body of world.bodies) {
            canvas.polygon(body.vertices, {
                fill: (body as any).color,
                stroke: '#fff',
                lineWidth: 2,
                alpha: 0.8
            });

            // Draw Velocity Vector
            canvas.line(body.position, body.position.clone().add(body.velocity.clone().mult(0.5)), {
                stroke: 'rgba(255,255,255,0.5)',
                lineWidth: 1
            });
        }
    };

    const step = () => {
        if (world) {
            saveState();
            world.step(1 / 60);
            draw();
        }
    };

    const stepBack = () => {
        setPaused(true);
        restoreState();
    };

    onMount(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                setPaused(true);
                step();
            }
            if (e.key === 'ArrowLeft') {
                stepBack();
            }
            if (e.key === ' ') {
                setPaused(!paused());
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
    });

    onCleanup(() => {
        if (engine) engine.stop();
    });

    return (
        <div class="sim-wrapper">
            <div class="demo-controls" style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                <button class="tab-btn active" onClick={() => setPaused(!paused())}>
                    {paused() ? 'Resume (Space)' : 'Pause (Space)'}
                </button>
                <button class="tab-btn active" onClick={stepBack}>
                    Back (Left Arrow)
                </button>
                <button class="tab-btn active" onClick={step}>
                    Forward (Right Arrow)
                </button>
                <button class="tab-btn active" onClick={spawnBodies}>
                    Reset
                </button>
                <label style="display: flex; align-items: center; gap: 5px; color: #fff;">
                    <input type="checkbox" checked={showManifold()} onChange={e => setShowManifold(e.currentTarget.checked)} />
                    Show Manifold
                </label>
                <label style="display: flex; align-items: center; gap: 5px; color: #fff;">
                    <input type="checkbox" checked={showForces()} onChange={e => setShowForces(e.currentTarget.checked)} />
                    Show Velocity/Forces
                </label>
            </div>
            <div class="demo-container" style="height: 600px; background: #111; border-radius: 8px; border: 1px solid #333;">
                <CanvasView width={800} height={600} onReady={onCanvasReady} />
            </div>
            <p style="font-size: 14px; color: #888; margin-top: 10px;">
                * <strong>Yellow dots</strong>: Contact points. <strong>Red line</strong>: Collision Normal. <strong>Green lines</strong>: Relative velocity at contact.
            </p>
        </div>
    );
}
