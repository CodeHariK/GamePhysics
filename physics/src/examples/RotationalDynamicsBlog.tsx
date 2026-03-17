import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../lib/math/Vector2';
import { Body } from '../lib/bodies/Body';
import { World } from '../lib/dynamics/World';
import { Engine } from '../lib/dynamics/Engine';
import { Canvas } from '../lib/render/Canvas';
import { CanvasView } from '../components/CanvasView';
import KatexMath from '../components/Math';

export default function RotationalDynamicsBlog() {
    const [torqueValue, setTorqueValue] = createSignal(500);

    const onCanvasReady = (render: Canvas) => {
        const world = new World();
        const engine = new Engine(world);

        // Disable gravity for this demo
        world.gravity.set(0, 0);

        const spawnBodies = () => {
            world.clear();

            const centerY = 300;
            const mass = 1.0;
            const radius = 50;

            // 1. Solid Disc (I = 0.5 * m * r^2)
            const inertiaDisc = 0.5 * mass * radius * radius;
            const disc = new Body(100, centerY, mass, inertiaDisc);
            const discVertices: Vector2[] = [];
            for (let i = 0; i < 32; i++) {
                const angle = (i / 32) * Math.PI * 2;
                discVertices.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
            }
            disc.setVertices(discVertices);
            (disc as any).label = "Solid Disc";
            (disc as any).formula = "0.5 * m * r^2";
            (disc as any).color = "#00bcd4";
            world.addBody(disc);

            // 2. Hollow Ring (I = m * r^2)
            const inertiaRing = mass * radius * radius;
            const ring = new Body(300, centerY, mass, inertiaRing);
            const ringVertices: Vector2[] = [];
            for (let i = 0; i < 32; i++) {
                const angle = (i / 32) * Math.PI * 2;
                ringVertices.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
            }
            ring.setVertices(ringVertices);
            (ring as any).label = "Hollow Ring";
            (ring as any).formula = "m * r^2";
            (ring as any).color = "#e91e63";
            world.addBody(ring);

            // 3. Centered Rod (I = 1/12 * m * L^2)
            const length = 100;
            const width = 10;
            const inertiaRod = (1 / 12) * mass * length * length;
            const rod = new Body(500, centerY, mass, inertiaRod);
            const rodVertices = [
                new Vector2(-length / 2, -width / 2),
                new Vector2(length / 2, -width / 2),
                new Vector2(length / 2, width / 2),
                new Vector2(-length / 2, width / 2)
            ];
            rod.setVertices(rodVertices);
            (rod as any).label = "Centered Rod";
            (rod as any).formula = "1/12 * m * L^2";
            (rod as any).color = "#4caf50";
            world.addBody(rod);

            // 4. Pivoted Rod (I = 1/3 * m * L^2)
            const inertiaPivoted = (1 / 3) * mass * length * length;
            const pivotedRod = new Body(700, centerY, mass, inertiaPivoted);
            const pivotedVertices = [
                new Vector2(0, -width / 2),
                new Vector2(length, -width / 2),
                new Vector2(length, width / 2),
                new Vector2(0, width / 2)
            ];
            pivotedRod.setVertices(pivotedVertices);
            (pivotedRod as any).label = "Pivoted Rod";
            (pivotedRod as any).formula = "1/3 * m * L^2";
            (pivotedRod as any).color = "#ff9800";
            world.addBody(pivotedRod);
        };

        engine.onUpdate(() => {
            // Apply constant torque to all bodies
            for (const body of world.bodies) {
                body.torque = torqueValue();
            }

            render.clear();
            render.grid();

            for (const body of world.bodies) {
                const b = body as any;
                render.polygon(body.vertices, {
                    fill: b.color,
                    stroke: '#fff',
                    lineWidth: 2,
                    alpha: 0.8
                });

                // Draw orientaiton line
                const forward = new Vector2(Math.cos(body.rotation), Math.sin(body.rotation)).mult(40);
                render.line(body.position, body.position.clone().add(forward), { stroke: '#fff', lineWidth: 3 });

                // Draw Pivot Point (where body.position is)
                render.point(body.position, 4, { fill: '#ff4444' });

                // Draw Label
                render.text(b.label, body.position.clone().add(new Vector2(0, -80)), {
                    fill: '#fff',
                    align: 'center'
                });
                render.text(`I = ${b.formula}`, body.position.clone().add(new Vector2(0, 80)), {
                    fill: '#eee',
                    align: 'center'
                });
                render.text(`ω: ${body.angularVelocity.toFixed(2)} rad/s`, body.position.clone().add(new Vector2(0, 100)), {
                    fill: '#ccc',
                    align: 'center'
                });
            }
        });

        spawnBodies();
        engine.start();

        onCleanup(() => {
            engine.stop();
        });

        (window as any).resetRotationalSim = spawnBodies;
    };

    return (
        <div class="blog-card">
            <h2>Understanding Rotational Dynamics</h2>

            <p>
                In linear physics, we use **Mass** ($m$) and **Force** ($F$). When things start spinning, we use their rotational counterparts: **Inertia** ($I$) and **Torque** ($\tau$).
            </p>

            <div class="math-columns" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #00bcd4;">Linear Motion</h4>
                    <KatexMath tex="F = m \cdot a" />
                    <KatexMath tex="v = \int a \, dt" />
                    <p style="font-size: 14px; color: #888;">Mass resists change in linear velocity.</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #e91e63;">Rotational Motion</h4>
                    <KatexMath tex="\tau = I \cdot \alpha" />
                    <KatexMath tex="\omega = \int \alpha \, dt" />
                    <p style="font-size: 14px; color: #888;">Inertia resists change in angular velocity.</p>
                </div>
            </div>

            <h3>Wait, why is Torque a number (scalar)?</h3>
            <p>
                In 3D, torque is a vector because you can rotate around any axis (X, Y, or Z). But in **2D physics**, rotation is restricted to the XY plane. This means the rotation axis is always the Z-axis (pointing out of your screen).
            </p>
            <p>
                The cross product {"τ = r × F"} in 2D results in a vector that only has a Z component. Since the direction is fixed, we only care about the magnitude (positive for counter-clockwise, negative for clockwise).
            </p>

            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0;">The Anatomy of Torque</h4>
                <p>
                    <strong>r (The Lever Arm):</strong> The vector pointing from the object's <strong>Center of Mass</strong> to the <strong>Point of Application</strong> where the force is pushing.
                </p>
                <p>
                    <strong>F (The Force):</strong> The push or pull vector.
                </p>
                <p>
                    <strong>Why the Cross Product?</strong> Only the <em>perpendicular</em> part of the force makes things spin. Pushing directly toward the center (r is parallel to F) does nothing. r × F automatically extracts only the "turning" component.
                </p>
            </div>

            <div class="math-block">
                <KatexMath block tex="\tau = |\vec{r}| \cdot |\vec{F}| \cdot \sin(\theta) \quad \text{or} \quad \tau = r_x F_y - r_y F_x" />
            </div>

            <h3>The Logic of Inertia: Why Shape Matters</h3>
            <p>
                The <strong>Moment of Inertia</strong> ($I$) is to rotation what <strong>Mass</strong> ($m$) is to linear motion. It represents how difficult it is to change an object's angular velocity.
            </p>
            
            <div style="background: rgba(52, 152, 219, 0.1); padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #3498db;">The Derivation: From $v$ to $\omega$</h4>
                <p>
                    Why is it $m \cdot r^2$ and not just $m \cdot r$? We can derive it by looking at <strong>Kinetic Energy</strong> ($K = \frac{1}{2}mv^2$). 
                </p>
                <p>
                    For a particle in a spinning object, its linear velocity is $v = \omega \cdot r$. If we sum the energy of every particle:
                </p>
                <KatexMath block tex="K = \sum \frac{1}{2} m_i v_i^2 = \sum \frac{1}{2} m_i (\omega r_i)^2 = \frac{1}{2} \left( \sum m_i r_i^2 \right) \omega^2" />
                <p>
                    The term in the parentheses is what we call **Moment of Inertia** ($I$). Thus:
                </p>
                <KatexMath block tex="K_{rot} = \frac{1}{2} I \omega^2" />
            </div>

            <p>
                The fundamental definition follows a simple logic: **Mass further from the pivot counts for more (quadratically).**
            </p>
            
            <div class="math-block" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <KatexMath block tex="I = \int r^2 \, dm" />
                <p style="text-align: center; font-size: 14px; margin-top: 10px; color: #888;">
                    For continuous objects, we "integrate" (sum up) the squared distance of every microscopic piece of mass.
                </p>
            </div>

            <h4>What if the object has a "Weird" shape?</h4>
            <p>
                Physics engines calculate inertia for arbitrary polygons by decomposing them into <strong>triangles</strong>. Each triangle has a known inertia formula relative to its vertex. By using the <strong>Parallel Axis Theorem</strong>, we can sum these "sub-inertias" to find the total inertia of any complex shape.
            </p>

            <ul style="line-height: 1.6;">
                <li>
                    <strong>Hollow Ring (<KatexMath tex="mR^2" />):</strong> Every gram of mass is at the maximum distance $R$.
                </li>
                <li>
                    <strong>Solid Disc (<KatexMath tex="0.5 mR^2" />):</strong> Mass is distributed evenly from center to edge.
                </li>
                <li>
                    <strong>Centered Rod (<KatexMath tex="\frac{1}{12} mL^2" />):</strong> Most mass is near the center axis.
                </li>
                <li>
                    <strong>Pivoted Rod (<KatexMath tex="\frac{1}{3} mL^2" />):</strong> Mass is shifted further from the axis, increasing inertia by <strong>4x</strong>.
                </li>
            </ul>

            <div class="demo-controls" style="margin: 20px 0; display: flex; gap: 20px; align-items: center; background: #222; padding: 15px; border-radius: 8px;">
                <label style="flex: 1;">
                    Applied Torque ($\tau$): {torqueValue()}
                    <input type="range" min="-2000" max="2000" step="100" value={torqueValue()} onInput={(e) => setTorqueValue(parseInt(e.currentTarget.value))} style="width: 100%; display: block;" />
                </label>
                <button onClick={() => (window as any).resetRotationalSim()} class="tab-btn active" style="margin: 0; padding: 8px 16px;">Reset Sim</button>
            </div>

            <div class="demo-container" style="height: 500px; border: 1px solid #333; border-radius: 8px; overflow: hidden;">
                <CanvasView width={800} height={500} onReady={onCanvasReady} />
            </div>

            <p style="margin-top: 20px;">
                Observe how the **Solid Disc** spins up faster than the **Hollow Ring**, even though they have the same mass and radius. This is because the ring's mass is concentrated at the edge, maximizing its moment of inertia ($I = mr^2$ vs $I = 0.5mr^2$).
            </p>
        </div>
    );
}
