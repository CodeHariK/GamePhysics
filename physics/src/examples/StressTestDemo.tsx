import { createSignal, onCleanup, createEffect } from 'solid-js';
import { Vector2 } from '../lib/math/Vector2';
import { Body } from '../lib/bodies/Body';
import { World } from '../lib/dynamics/World';
import { Engine } from '../lib/dynamics/Engine';
import { Canvas } from '../lib/render/Canvas';
import { CanvasView } from '../components/CanvasView';

export default function StressTestDemo() {
    const [bodyCount, setBodyCount] = createSignal(10);
    const [restitution, setRestitution] = createSignal(0.2);
    const [friction, setFriction] = createSignal(0.1);
    const [fps, setFps] = createSignal(0);

    let engine: Engine;
    let world: World;
    let render: Canvas | null = null;

    const createRandomBody = (x: number, y: number): Body => {
        const sides = Math.floor(Math.random() * 4) + 3; // 3 to 6 sides
        const radius = Math.random() * 20 + 15;
        const mass = (radius * radius) / 100;
        const inertia = (mass * radius * radius) / 2;

        const body = new Body(x, y, mass, inertia);

        const vertices: Vector2[] = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            vertices.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
        }
        body.setVertices(vertices);

        body.velocity.set(Math.random() * 200 - 100, Math.random() * 200 - 100);
        body.angularVelocity = Math.random() * 4 - 2;
        body.restitution = restitution();
        body.friction = friction();

        return body;
    };

    const addBoundaries = () => {
        const w = 860;
        const h = 500;
        const thick = 100;

        // Ground
        const ground = new Body(w / 2, h + thick / 2, 0, 0, true);
        ground.setVertices([
            new Vector2(-w / 2, -thick / 2),
            new Vector2(w / 2, -thick / 2),
            new Vector2(w / 2, thick / 2),
            new Vector2(-w / 2, thick / 2)
        ]);
        ground.restitution = 0.5;
        ground.friction = 0.5;
        world.addBody(ground);

        // Ceiling
        const ceiling = new Body(w / 2, -thick / 2, 0, 0, true);
        ceiling.setVertices([
            new Vector2(-w / 2, -thick / 2),
            new Vector2(w / 2, -thick / 2),
            new Vector2(w / 2, thick / 2),
            new Vector2(-w / 2, thick / 2)
        ]);
        world.addBody(ceiling);

        // Walls
        const leftWall = new Body(-thick / 2, h / 2, 0, 0, true);
        leftWall.setVertices([
            new Vector2(-thick / 2, -h / 2),
            new Vector2(thick / 2, -h / 2),
            new Vector2(thick / 2, h / 2),
            new Vector2(-thick / 2, h / 2)
        ]);
        world.addBody(leftWall);

        const rightWall = new Body(w + thick / 2, h / 2, 0, 0, true);
        rightWall.setVertices([
            new Vector2(-thick / 2, -h / 2),
            new Vector2(thick / 2, -h / 2),
            new Vector2(thick / 2, h / 2),
            new Vector2(-thick / 2, h / 2)
        ]);
        world.addBody(rightWall);
    };

    const initWorld = () => {
        if (!world || !render) return;
        world.clear();
        addBoundaries();

        for (let i = 0; i < bodyCount(); i++) {
            const x = Math.random() * (render.element.width - 200) + 100;
            const y = Math.random() * (render.element.height - 200) + 100;
            const body = createRandomBody(x, y);
            world.addBody(body);
        }
    };

    createEffect(() => {
        if (world) {
            for (const body of world.bodies) {
                if (!body.isStatic) {
                    body.restitution = restitution();
                    body.friction = friction();
                }
            }
        }
    });

    const onCanvasReady = (canvasInstance: Canvas) => {
        render = canvasInstance;
        world = new World();
        engine = new Engine(world);

        initWorld();

        engine.onUpdate((dt) => {
            setFps(Math.round(1 / dt));

            // Draw
            render!.clear();
            render!.grid(50, 'rgba(255, 255, 255, 0.03)');

            for (const body of world.bodies) {
                render!.polygon(body.vertices, {
                    fill: body.isStatic ? '#222' : `hsla(${body.id * 137.5 % 360}, 70%, 50%, 0.6)`,
                    stroke: body.isStatic ? '#444' : '#fff',
                    lineWidth: 1
                });
            }
        });

        engine.start();
        onCleanup(() => {
            engine.stop();
        });
    };

    return (
        <div style="font-family: 'Rajdhani', sans-serif; background: #0a0a0a; color: white; padding: 20px; border-radius: 12px; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; font-family: 'Orbitron', sans-serif; letter-spacing: 2px; color: #3498db;">STABILIZED PHYSICS</h2>
                <div style="font-size: 14px; color: #888;">FPS: <span style="color: #2ecc71; font-weight: bold;">{fps()}</span> | Physics: <span style="color: #3498db;">120Hz</span></div>
            </div>

            <div style="background: #111; border: 1px solid #333; border-radius: 8px; overflow: hidden; position: relative;">
                <CanvasView
                    width={860}
                    height={500}
                    onReady={onCanvasReady}
                />
            </div>

            <div style="background: #151515; padding: 20px; border-radius: 8px; border: 1px solid #333; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start;">
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: #aaa; text-transform: uppercase;">Body Count: {bodyCount()}</label>
                        <input type="range" min="1" max="50" value={bodyCount()} onInput={(e) => setBodyCount(parseInt(e.currentTarget.value))} style="width: 100%;" />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: #aaa; text-transform: uppercase;">Restitution (Bounce): {restitution()}</label>
                        <input type="range" min="0" max="1" step="0.05" value={restitution()} onInput={(e) => setRestitution(parseFloat(e.currentTarget.value))} style="width: 100%;" />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: #aaa; text-transform: uppercase;">Friction: {friction()}</label>
                        <input type="range" min="0" max="1" step="0.05" value={friction()} onInput={(e) => setFriction(parseFloat(e.currentTarget.value))} style="width: 100%;" />
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 15px; height: 100%;">
                    <div style="font-size: 13px; color: #666; line-height: 1.4; flex-grow: 1;">
                        Using <strong>Sequential Impulses</strong> with <strong>Warm Starting</strong>.
                        Static bodies (Ground/Walls) are now processed by the robust solver, eliminating infinite jitter.
                    </div>
                    <button
                        onClick={initWorld}
                        style="padding: 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; text-transform: uppercase; width: 100%;"
                    >
                        Reset Simulation
                    </button>
                </div>
            </div>
        </div>
    );
}
