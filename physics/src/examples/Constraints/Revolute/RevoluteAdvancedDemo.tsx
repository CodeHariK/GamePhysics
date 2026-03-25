import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../../../lib/math/Vector2';
import { Body } from '../../../lib/bodies/Body';
import { World } from '../../../lib/dynamics/World';
import { Engine } from '../../../lib/dynamics/Engine';
import { RevoluteConstraint } from '../../../lib/constraints/RevoluteConstraint';
import { Canvas } from '../../../lib/render/Canvas';
import { CanvasView } from '../../../components/CanvasView';

/**
 * EXACT REPLICA of revolute_constraints.html
 * Scale: 1 unit = 100 pixels
 * Y-axis: Ref 4 (top) to -1 (bottom) in a 5 unit viewport.
 */
export default function RevoluteAdvancedDemo() {
    const [fps, setFps] = createSignal(240);
    const [motorSpeed, setMotorSpeed] = createSignal(4);
    
    let world: World;
    let engine: Engine;
    let renderer: Canvas;

    const UNIT = 100;
    const toPX = (x: number) => 400 + x * UNIT;
    const toPY = (y: number) => 100 + (4 - y) * UNIT;

    const onCanvasReady = (canvas: Canvas) => {
        renderer = canvas;
        world = new World();
        world.gravity.set(0, 9.81 * UNIT);
        world.constraintIterations = 20; // High iterations for stability

        engine = new Engine(world);
        engine.hz = 240; 
        
        setupScene();
        
        engine.onUpdate((dt) => {
            render();
            setFps(Math.round(1 / dt));
        });
        
        engine.start();
    };

    const setupScene = () => {
        if (!world) return;
        world.clear();

        const addBox = (x: number, y: number, w: number, h: number, density: number = 1, isStatic: boolean = false) => {
            const mass = isStatic ? 0 : density * w * h;
            const w_px = w * UNIT;
            const h_px = h * UNIT;
            const inertia = isStatic ? 0 : (mass * (w_px * w_px + h_px * h_px)) / 12;
            
            const body = new Body(toPX(x), toPY(y), mass, inertia, isStatic);
            body.setVertices(Body.createBoxVertices(w_px, h_px));
            world.addBody(body);
            return body;
        };

        // 1. Double Pendulum with Limits
        const anchor = addBox(0, 4, 0.5, 0.5, 1, true);
        anchor.color = '#34495e';

        const box1 = addBox(0, 2.75, 0.3, 2);
        box1.color = '#3498db';
        box1.collisionMask = 0;

        const allowedRange = Math.PI / 2.5;
        const rev1 = new RevoluteConstraint(anchor, box1, new Vector2(toPX(0), toPY(3.75)));
        rev1.lowerAngleLimit = -allowedRange / 2;
        rev1.upperAngleLimit = allowedRange / 2;
        rev1.constraintSettings = {
            mode: 'soft',
            baumgarteFactor: 0.2, // inherit or dummy
            contactSoft: { hertz: 60, dampingRatio: 1.0 },
            jointSoft: { hertz: 60, dampingRatio: 1.0 },
            contactSpeed: 0,
            warmStarting: true
        };
        world.addConstraint(rev1);

        const box2 = addBox(0, 0.75, 0.3, 2);
        box2.color = '#2980b9';
        box2.collisionMask = 0;
        box2.velocity.set(5 * UNIT, 0); 
        world.addConstraint(new RevoluteConstraint(box1, box2, new Vector2(toPX(0), toPY(1.75))));

        // 2. Motorized Rotor (Left)
        const baseL = addBox(-4, 0.25, 0.5, 4, 1, true);
        baseL.color = '#7f8c8d';
        const bladeL = addBox(-4, 2.25, 3, 0.25);
        bladeL.color = '#e74c3c';
        bladeL.collisionMask = 0;
        const motorL = new RevoluteConstraint(baseL, bladeL, new Vector2(toPX(-4), toPY(2.25)));
        motorL.motorEnabled = true;
        motorL.motorSpeed = -motorSpeed();
        motorL.maxMotorForce = 20 * UNIT * UNIT;
        world.addConstraint(motorL);

        // 3. Motorized Rotor (Right)
        const baseR = addBox(4, 0.25, 0.5, 4, 1, true);
        baseR.color = '#7f8c8d';
        const bladeR = addBox(4, 2.25, 3, 0.25);
        bladeR.color = '#27ae60';
        bladeR.collisionMask = 0;
        const motorR = new RevoluteConstraint(baseR, bladeR, new Vector2(toPX(4), toPY(2.25)));
        motorR.motorEnabled = true;
        motorR.motorSpeed = motorSpeed();
        motorR.maxMotorForce = 20 * UNIT * UNIT; 
        world.addConstraint(motorR);
    };

    const updateSpeeds = (s: number) => {
        setMotorSpeed(s);
        world.constraints.forEach(c => {
            if (c instanceof RevoluteConstraint && c.motorEnabled) {
                const maxTorque = 20 * UNIT * UNIT;
                if (c.bodyA.position.x < 400) { c.motorSpeed = -s; c.maxMotorForce = maxTorque; }
                else { c.motorSpeed = s; c.maxMotorForce = maxTorque; }
            }
        });
    };

    const render = () => {
        renderer.clear();
        
        // Draw grid
        renderer.ctx.save();
        renderer.ctx.strokeStyle = '#f0f0f0';
        renderer.ctx.lineWidth = 1;
        for (let x = -6; x <= 6; x++) {
            renderer.line(new Vector2(toPX(x), 0), new Vector2(toPX(x), 500));
        }
        for (let y = -1; y <= 5; y++) {
            renderer.line(new Vector2(0, toPY(y)), new Vector2(800, toPY(y)));
        }
        renderer.ctx.restore();

        // Draw bodies
        world.bodies.forEach(body => {
            renderer.polygon(body.vertices, {
                fill: body.color || '#3498db',
                stroke: '#2c3e50',
                lineWidth: 1.5
            });
        });

        // Draw constraints
        world.constraints.forEach(c => {
            if (c instanceof RevoluteConstraint) {
                const wA = c.bodyA.localToWorld(c.localA);
                renderer.circle(wA, 4, { fill: '#e67e22', stroke: '#fff', lineWidth: 1 });
                
                if (c.lowerAngleLimit !== null && c.upperAngleLimit !== null) {
                    const baseAngle = c.bodyA.rotation;
                    renderer.ctx.save();
                    renderer.ctx.translate(wA.x, wA.y);
                    renderer.ctx.rotate(baseAngle + Math.PI / 2); // Rotate to DOWN neutral position
                    renderer.ctx.beginPath();
                    renderer.ctx.moveTo(0, 0);
                    renderer.ctx.arc(0, 0, 50, c.lowerAngleLimit, c.upperAngleLimit);
                    renderer.ctx.lineTo(0, 0);
                    renderer.ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
                    renderer.ctx.fill();
                    renderer.ctx.strokeStyle = '#e67e22';
                    renderer.ctx.lineWidth = 2;
                    renderer.ctx.stroke();
                    renderer.ctx.restore();
                }
            }
        });
    };

    onCleanup(() => {
        if (engine) engine.stop();
    });

    return (
        <div style="background: #fdfdfd; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0; font-family: 'Inter', sans-serif;">
            <div style="padding: 15px; background: #fff; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #2c3e50; text-transform: uppercase;">
                    Advanced Revolute Lab
                </h3>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; color: #666; font-weight: 800;">MOTOR SPEED:</span>
                        <input type="range" min="0" max="25" step="0.5" value={motorSpeed()} 
                            onInput={(e) => updateSpeeds(parseFloat(e.currentTarget.value))}
                            style="width: 150px; accent-color: #3498db;" />
                    </div>
                    <button onClick={setupScene} style="padding: 6px 14px; background: #34495e; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 11px; transition: all 0.2s;">Reset</button>
                    <div style="font-size: 11px; font-weight: 800; color: #2c3e50; background: #f0f0f0; padding: 5px 10px; border-radius: 6px; min-width: 60px; text-align: center;">
                        {fps()} FPS
                    </div>
                </div>
            </div>
            
            <div style="background: #fff; position: relative; height: 500px;">
                <CanvasView width={800} height={500} onReady={onCanvasReady} />
                <div style="position: absolute; bottom: 12px; left: 15px; color: #bdc3c7; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;">
                    100PX = 1 UNIT • 240HZ ACCURACY • 30 ITERATIONS
                </div>
            </div>
        </div>
    );
}
