import { createSignal, onMount, onCleanup } from 'solid-js';
import { World } from '../../lib/dynamics/World';
import { Body } from '../../lib/bodies/Body';
import { Vector2 } from '../../lib/math/Vector2';
import { Engine } from '../../lib/dynamics/Engine';
import { CircleShape, PolygonShape, CapsuleShape, ShapeType } from '../../lib/collision/Shape';
import { Canvas } from '../../lib/render/Canvas';

export default function PinballDemo() {
    const [score, setScore] = createSignal(0);
    const [fps, setFps] = createSignal(0);

    let canvasRef: HTMLCanvasElement | undefined;
    let canvas: Canvas;
    let world: World;
    let engine: Engine;

    let leftFlipper: Body;
    let rightFlipper: Body;
    let leftPressed = false;
    let rightPressed = false;

    const SCALE = 300; 
    const SIM_WIDTH = 1.0;
    const SIM_HEIGHT = 1.7;

    const addBall = (x: number, y: number, radius: number, velocity: Vector2) => {
        const mass = Math.PI * radius * radius;
        const inertia = (mass * radius * radius) / 2;
        const body = new Body(x, y, mass, inertia, false);
        body.shapes = [new CircleShape(radius)];
        body.velocity.copy(velocity);
        body.restitution = 0.5;
        body.friction = 0.1;
        body.color = '#e74c3c';
        world.addBody(body);
        return body;
    };

    const addFlipper = (x: number, y: number, radius: number, length: number, isLeft: boolean) => {
        // Flippers are kinematic: static-like but with velocity
        const body = new Body(x, y, 0, 0, true); 
        // p1 is at pivot (0,0), p2 is at tip (length, 0)
        body.shapes = [new CapsuleShape(new Vector2(0, 0), new Vector2(length, 0), radius)];
        body.rotation = isLeft ? -0.5 : Math.PI + 0.5;
        body.color = '#34495e';
        body.updateTransform();
        world.addBody(body);
        return body;
    };

    const addWall = (p1: Vector2, p2: Vector2, thickness: number = 0.02) => {
        const center = Vector2.add(p1, p2, new Vector2()).mult(0.5);
        const diff = Vector2.sub(p2, p1, new Vector2());
        const length = diff.mag();
        const angle = Math.atan2(diff.y, diff.x);
        
        const body = new Body(center.x, center.y, 0, 0, true);
        body.setVertices(Body.createBoxVertices(length, thickness));
        body.rotation = angle;
        body.updateTransform();
        body.color = '#95a5a6';
        world.addBody(body);
        return body;
    };

    const setupScene = () => {
        world.clear();
        setScore(0);
        world.gravity.set(0, -3.0);

        const offset = 0.02;

        // Border walls
        const borderPoints = [
            new Vector2(0.74, 0.25),
            new Vector2(1.0 - offset, 0.4),
            new Vector2(1.0 - offset, SIM_HEIGHT - offset),
            new Vector2(offset, SIM_HEIGHT - offset),
            new Vector2(offset, 0.4),
            new Vector2(0.26, 0.25),
            new Vector2(0.26, 0.0),
            new Vector2(0.74, 0.0)
        ];

        for (let i = 0; i < borderPoints.length; i++) {
            const p1 = borderPoints[i];
            const p2 = borderPoints[(i + 1) % borderPoints.length];
            // Skip the gap between flippers
            if (i === 6) continue; 
            addWall(p1, p2);
        }

        // Balls
        addBall(0.92, 0.5, 0.03, new Vector2(-0.2, 3.5));
        addBall(0.08, 0.5, 0.03, new Vector2(0.2, 3.5));

        // Obstacles (Bouncers)
        const addBouncer = (x: number, y: number, r: number) => {
            const body = new Body(x, y, 0, 0, true);
            body.shapes = [new CircleShape(r)];
            body.restitution = 1.5; // Extra bouncy!
            body.color = '#f1c40f';
            body.updateTransform();
            world.addBody(body);
        };

        addBouncer(0.25, 0.6, 0.1);
        addBouncer(0.75, 0.5, 0.1);
        addBouncer(0.7, 1.0, 0.12);
        addBouncer(0.2, 1.2, 0.1);

        // Flippers
        leftFlipper = addFlipper(0.26, 0.22, 0.03, 0.2, true);
        rightFlipper = addFlipper(0.74, 0.22, 0.03, 0.2, false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') leftPressed = true;
        if (e.key === 'ArrowRight' || e.key === 'd') rightPressed = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') leftPressed = false;
        if (e.key === 'ArrowRight' || e.key === 'd') rightPressed = false;
    };

    onMount(() => {
        if (canvasRef) {
            canvas = new Canvas(canvasRef);
        }
        world = new World();
        engine = new Engine(world);
        engine.hz = 120;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        setupScene();

        const render = (dt: number) => {
            if (!canvas) return;
            canvas.ctx.clearRect(0, 0, 800, 600);
            setFps(Math.round(1 / dt));

            // Kinematic flipper update
            const angVel = 12.0;
            const minRotLeft = -0.5;
            const maxRotLeft = 0.5;
            const minRotRight = Math.PI - 0.5;
            const maxRotRight = Math.PI + 0.5;

            // Left Flipper
            const prevRotL = leftFlipper.rotation;
            if (leftPressed) {
                leftFlipper.rotation = Math.min(leftFlipper.rotation + dt * angVel, maxRotLeft);
            } else {
                leftFlipper.rotation = Math.max(leftFlipper.rotation - dt * angVel, minRotLeft);
            }
            leftFlipper.angularVelocity = (leftFlipper.rotation - prevRotL) / dt;

            // Right Flipper
            const prevRotR = rightFlipper.rotation;
            if (rightPressed) {
                rightFlipper.rotation = Math.max(rightFlipper.rotation - dt * angVel, minRotRight);
            } else {
                rightFlipper.rotation = Math.min(rightFlipper.rotation + dt * angVel, maxRotRight);
            }
            rightFlipper.angularVelocity = (rightFlipper.rotation - prevRotR) / dt;

            // Drawing
            const offsetX = (800 - SIM_WIDTH * SCALE) / 2;
            const offsetY = 20;

            world.bodies.forEach(body => {
                canvas.save();
                // Sim Y is up, Canvas Y is down. Sim starts at y=0 at bottom.
                const renderPos = new Vector2(
                    offsetX + body.position.x * SCALE, 
                    (SIM_HEIGHT * SCALE + offsetY) - body.position.y * SCALE
                );
                canvas.translate(renderPos);
                canvas.rotate(-body.rotation);

                const options = { fill: body.color || '#95a5a6', stroke: '#2c3e50', lineWidth: 1 };

                body.shapes.forEach(shape => {
                    if (shape.type === ShapeType.CIRCLE) {
                        const circle = shape as CircleShape;
                        canvas.circle(
                            new Vector2(circle.offset.x * SCALE, -circle.offset.y * SCALE), 
                            circle.radius * SCALE, 
                            options
                        );
                    } else if (shape.type === ShapeType.CAPSULE) {
                        const cap = shape as CapsuleShape;
                        canvas.capsule(
                            new Vector2(cap.p1.x * SCALE, -cap.p1.y * SCALE),
                            new Vector2(cap.p2.x * SCALE, -cap.p2.y * SCALE),
                            cap.radius * SCALE,
                            options
                        );
                    } else {
                        const poly = shape as PolygonShape;
                        const points = poly.localVertices.map(v => new Vector2(v.x * SCALE, -v.y * SCALE));
                        canvas.polygon(points, options);
                    }
                });
                canvas.restore();
            });

            // Out of bounds check
            world.bodies.forEach(body => {
                if (!body.isStatic && body.position.y < -0.5) {
                    body.position.set(0.5, 1.5);
                    body.velocity.set(0, 0);
                    setScore(s => s - 10);
                }
            });
        };

        engine.onUpdate(render);
        engine.start();
    });

    onCleanup(() => {
        engine?.stop();
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    });

    return (
        <div style="display: flex; flex-direction: column; gap: 15px; padding: 20px; background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 800px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px;">
                <div style="font-size: 18px; font-weight: 700; color: #2c3e50;">
                    Pinball Port
                </div>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div style="font-size: 14px; font-weight: 800; color: #e74c3c;">
                        SCORE: {score()}
                    </div>
                    <div style="font-size: 11px; font-weight: 800; color: #64748b; background: #f0f0f0; padding: 5px 12px; border-radius: 6px;">
                        {fps()} FPS
                    </div>
                    <button 
                        onClick={() => setupScene()}
                        style="background: #3498db; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer;"
                    >
                        RESET
                    </button>
                </div>
            </div>

            <div style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; background: #2c3e50;">
                <canvas ref={canvasRef} width="800" height="600" style="background: transparent; display: block;" />
            </div>

            <div style="font-size: 12px; color: #666; line-height: 1.5; background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #3498db;">
                <strong>Controls:</strong> Use <strong>A / Left Arrow</strong> for the left flipper and <strong>D / Right Arrow</strong> for the right flipper. 
                This demo uses the new <code>CapsuleShape</code> and <code>Capsule-Circle</code> collision implementation.
            </div>
        </div>
    );
}
