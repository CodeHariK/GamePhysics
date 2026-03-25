import { createSignal, onMount, onCleanup } from 'solid-js';
import { World } from '../../../lib/dynamics/World';
import { Body } from '../../../lib/bodies/Body';
import { Vector2 } from '../../../lib/math/Vector2';
import { Engine } from '../../../lib/dynamics/Engine';
import { CircleShape, PolygonShape, ShapeType } from '../../../lib/collision/Shape';
import { RevoluteConstraint } from '../../../lib/constraints/RevoluteConstraint';

type SceneType = 'Boxes' | 'Dominoes' | 'Stack' | 'Composite' | 'Bouncy';

export default function InequalityDemo() {
    const [scene, setScene] = createSignal<SceneType>('Boxes');
    const [fps, setFps] = createSignal(0);

    let canvasRef: HTMLCanvasElement | undefined;
    let world: World;
    let engine: Engine;
    let mouseConstraint: RevoluteConstraint | null = null;
    let mouseAnchor: Body | null = null;

    const getMousePos = (e: MouseEvent) => {
        const rect = canvasRef!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        // Inverse transform: Pixel back to World units
        const SCALE = 60;
        const centerX = canvasRef!.width / 2;
        const centerY = canvasRef!.height / 2 + 50;

        return new Vector2(
            (px - centerX) / SCALE,
            (centerY - py) / SCALE // Y is flipped
        );
    };

    const findBodyAt = (pos: Vector2) => {
        for (const body of world.bodies) {
            if (body.isStatic) continue;

            // Check each shape in body local space
            const localPos = body.worldToLocal(pos);
            for (const shape of body.shapes) {
                if (shape.containsLocalPoint(localPos)) return body;
            }
        }
        return null;
    };

    const handleMouseDown = (e: MouseEvent) => {
        const pos = getMousePos(e);
        const body = findBodyAt(pos);
        if (body) {
            // Create a static anchor point at mouse position
            mouseAnchor = new Body(pos.x, pos.y, 0, 0, true);
            
            // Create revolute constraint between anchor and object
            mouseConstraint = new RevoluteConstraint(mouseAnchor, body, pos) as any;
            (mouseConstraint as any).constraintSettings = {
                mode: 'baumgarte',
                baumgarteFactor: 0.25,
                warmStarting: true
            };
            world.addConstraint(mouseConstraint as any);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (mouseAnchor) {
            mouseAnchor.position.copy(getMousePos(e));
        }
    };

    const handleMouseUp = () => {
        if (mouseConstraint) {
            world.removeConstraint(mouseConstraint as any);
            mouseConstraint = null;
            mouseAnchor = null;
        }
    };

    const addBox = (x: number, y: number, w: number, h: number, mass: number = 1, isStatic: boolean = false) => {
        const inertia = isStatic ? 0 : (mass * (w * w + h * h)) / 12;
        const body = new Body(x, y, mass, inertia, isStatic);
        body.setVertices(Body.createBoxVertices(w, h));
        world.addBody(body);
        return body;
    };

    const addCircle = (x: number, y: number, radius: number, mass: number = 1, isStatic: boolean = false) => {
        const inertia = isStatic ? 0 : (mass * radius * radius) / 2;
        const body = new Body(x, y, mass, inertia, isStatic);
        body.shapes = [new CircleShape(radius)];
        body.updateTransform();
        world.addBody(body);
        return body;
    };

    const addStar = (x: number, y: number, points: number, outerR: number, innerR: number, mass: number = 1) => {
        const shapes: PolygonShape[] = [];
        const triangles: { v1: Vector2; v2: Vector2 }[] = [];
        const step = (Math.PI * 2) / points;

        const outer: Vector2[] = [];
        const inner: Vector2[] = [];
        for (let k = 0; k < points; k++) {
            const angleOuter = k * step;
            const angleInner = angleOuter + step / 2;
            outer.push(new Vector2(outerR * Math.cos(angleOuter), outerR * Math.sin(angleOuter)));
            inner.push(new Vector2(innerR * Math.cos(angleInner), innerR * Math.sin(angleInner)));
        }

        for (let k = 0; k < points; k++) {
            const O = outer[k];
            const I = inner[k];
            const Op = outer[(k + 1) % points];
            shapes.push(new PolygonShape([new Vector2(0, 0), O, I]));
            shapes.push(new PolygonShape([new Vector2(0, 0), I, Op]));
            triangles.push({ v1: O, v2: I });
            triangles.push({ v1: I, v2: Op });
        }

        let totalArea = 0;
        for (const tri of triangles) {
            totalArea += Math.abs(tri.v1.x * tri.v2.y - tri.v2.x * tri.v1.y) * 0.5;
        }
        const density = mass / totalArea;

        let momentOfInertia = 0;
        for (const tri of triangles) {
            const { x: x1, y: y1 } = tri.v1;
            const { x: x2, y: y2 } = tri.v2;
            const areaTri = Math.abs(x1 * y2 - x2 * y1) * 0.5;
            const mTri = density * areaTri;
            const sum = (x1 * x1 + y1 * y1) + (x1 * x2 + y1 * y2) + (x2 * x2 + y2 * y2);
            momentOfInertia += (mTri * sum) / 6;
        }

        const body = new Body(x, y, mass, momentOfInertia, false);
        body.shapes = shapes;
        body.color = '#f1c40f';
        world.addBody(body);
        return body;
    };

    const addCapsule = (x: number, y: number, length: number, r1: number, r2: number, mass: number = 1) => {
        const dr = r2 - r1;
        const com = length * (r2 * r2 - r1 * r1) / (4 * (r1 * r1 + r1 * r2 + r2 * r2));
        const density = mass / (length * (r1 + r2) + 0.5 * Math.PI * (r1 * r1 + r2 * r2));

        const capsuleMomentOfInertia = (L: number, a: number, b: number) => {
            const numer = 3 * L ** 2 * (a ** 4 + 4 * a ** 3 * b + 10 * a ** 2 * b ** 2 + 4 * a * b ** 3 + b ** 4) + 24 *
                (a ** 6 + 2 * a ** 5 * b + 3 * a ** 4 * b ** 2 + 4 * a * b ** 3 + 3 * a ** 2 * b ** 4 + 2 * a * b ** 5 + b ** 6);
            return Math.PI * L * numer / (240 * (a ** 2 + a * b + b ** 2));
        };
        const inertia = density * capsuleMomentOfInertia(length, r1, r2);

        const body = new Body(x, y, mass, inertia, false);
        const halfLen = length / 2;
        const factor = Math.sqrt(Math.max(0, 1 - (dr * dr) / (length * length)));
        const tX1 = -halfLen - (dr * r1) / length - com, bX1 = tX1, tY1 = r1 * factor, bY1 = -tY1;
        const tX2 = halfLen - (dr * r2) / length - com, bX2 = tX2, tY2 = r2 * factor, bY2 = -tY2;

        body.shapes = [
            new PolygonShape([new Vector2(bX1, bY1), new Vector2(bX2, bY2), new Vector2(tX2, tY2), new Vector2(tX1, tY1)]),
            new CircleShape(r1, new Vector2(-halfLen - com, 0)),
            new CircleShape(r2, new Vector2(halfLen - com, 0))
        ];
        body.updateTransform();
        body.color = '#9b59b6';
        world.addBody(body);
        return body;
    };

    const setupScene = () => {
        world.clear();
        const type = scene();

        world.gravity.set(0, -9.81);

        if (type === 'Boxes') {
            addBox(0, -2, 10, 1, 1, true).color = '#7f8c8d'; // Floor
            addBox(0, 4, 10, 1, 1, true).color = '#7f8c8d';  // Ceiling
            const b1 = addBox(0, 0, 1, 1);
            b1.color = '#3498db';
            const b2 = addBox(0, 1, 0.5, 0.5);
            b2.color = '#e67e22';
            const b3 = addBox(0, 1.5, 0.25, 0.25);
            b3.color = '#2ecc71';
        }
        else if (type === 'Dominoes') {
            addBox(0, -2, 20, 1, 1, true).color = '#7f8c8d';
            const num = 10;
            const spacing = 0.8;
            for (let i = 0; i < num; i++) {
                const x = -3 + i * spacing;
                const domino = addBox(x, -0.5, 0.15, 2);
                domino.color = `hsl(${i * 36}, 70%, 60%)`;
                if (i === 0) domino.angularVelocity = -5;
                domino.friction = 0.1;
            }
        }
        else if (type === 'Stack') {
            addBox(0, -2, 20, 1, 1, true).color = '#7f8c8d';
            const pillarW = 0.4, pillarH = 1.25, beamW = 3.5, beamH = 0.4, pillarSpacing = 2.0;
            const bottomY = -1.5;
            addBox(-pillarSpacing, bottomY + pillarH / 2, pillarW, pillarH);
            addBox(0, bottomY + pillarH / 2, pillarW, pillarH);
            addBox(pillarSpacing, bottomY + pillarH / 2, pillarW, pillarH);
            addBox(0, bottomY + pillarH + beamH / 2, beamW * 1.2, beamH).color = '#95a5a6';

            const middleY = bottomY + pillarH + beamH;
            addBox(-pillarSpacing / 2, middleY + pillarH / 2, pillarW, pillarH);
            addBox(pillarSpacing / 2, middleY + pillarH / 2, pillarW, pillarH);
            addBox(0, middleY + pillarH + beamH / 2, beamW * 0.8, beamH).color = '#95a5a6';

            const topY = middleY + pillarH + beamH;
            addBox(0, topY + pillarH / 2, pillarW, pillarH);
            addBox(0, topY + pillarH + beamH / 2, beamW * 0.5, beamH).color = '#95a5a6';
        }
        else if (type === 'Composite') {
            addBox(0, -2, 20, 1, 1, true).color = '#7f8c8d';
            addStar(0, 2, 5, 1.5, 0.7, 1);
            const s2 = addStar(2, 4, 7, 0.8, 0.3, 0.7);
            s2.rotation = Math.PI / 7;
            addCircle(-2, 3, 0.5).color = '#e74c3c';
            addCircle(1, 5, 0.7).color = '#3498db';
            addCircle(3, 1, 0.4).color = '#2ecc71';
            addCapsule(-1, 0, 2, 0.8, 0.3, 1);
            addCapsule(-1, 4, 0.45, 0.1, 0.2, 1);
        }
        else if (type === 'Bouncy') {
            const wall = 0.3, w = 10.5, h = 4.5, yOffset = 1.0;
            const floor = addBox(0, yOffset + (-h / 2 - wall / 2), w + wall, wall, 1, true);
            const ceiling = addBox(0, yOffset + (h / 2 + wall / 2), w + wall, wall, 1, true);
            const left = addBox(-w / 2 - wall / 2, yOffset, wall, h, 1, true);
            const right = addBox(w / 2 + wall / 2, yOffset, wall, h, 1, true);

            [floor, ceiling, left, right].forEach(b => {
                b.restitution = 1.0;
                b.friction = 0;
                b.linearDamping = 0;
                b.angularDamping = 0;
                b.color = '#34495e';
            });

            for (let i = 0; i < 8; i++) {
                const radius = 0.2 + Math.random() * 0.3;
                const c = addCircle((Math.random() - 0.5) * (w - 2), yOffset + (Math.random() - 0.5) * (h - 2), radius);
                c.restitution = 1.0;
                c.friction = 0;
                c.linearDamping = 0;
                c.angularDamping = 0;
                c.velocity.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
                c.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
            }

            const boxSize = 0.4;
            const stackHeight = 2;
            const stackX = -2;
            for (let i = 0; i < stackHeight; i++) {
                const box = addBox(stackX, yOffset + (-h / 2 + wall + boxSize / 2 + i * boxSize), boxSize, boxSize);
                box.restitution = 1.0;
                box.friction = 0;
                box.linearDamping = 0;
                box.angularDamping = 0;
                box.color = '#e67e22';
            }

            const smallBoxSize = 0.3;
            const smallStackHeight = 2;
            const smallStackX = 2.5;
            for (let i = 0; i < smallStackHeight; i++) {
                const box = addBox(smallStackX, yOffset + (-h / 2 + wall + smallBoxSize / 2 + i * smallBoxSize), smallBoxSize, smallBoxSize);
                box.restitution = 1.0;
                box.friction = 0;
                box.linearDamping = 0;
                box.angularDamping = 0;
                box.color = '#f1c40f';
            }
        }
    };

    onMount(() => {
        world = new World();
        world.gravity.set(0, -9.81);
        world.constraintIterations = 20;
        engine = new Engine(world);
        engine.hz = 240; // High frequency for better stability

        canvasRef?.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        setupScene();

        const render = (dt: number) => {
            const ctx = canvasRef?.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, 800, 600);
            setFps(Math.round(1 / dt));

            // Grid
            ctx.strokeStyle = '#eee';
            ctx.lineWidth = 1;
            for (let x = 0; x <= 800; x += 50) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke();
            }
            for (let y = 0; y <= 600; y += 50) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
            }

            const SCALE = 60; // Pixels per unit
            const centerX = canvasRef!.width / 2;
            const centerY = canvasRef!.height / 2 + 50; // Offset to center around y=1

            world.bodies.forEach(body => {
                ctx.save();
                // Transform to world coordinates: Center screen, flip Y, scale
                ctx.translate(centerX + body.position.x * SCALE, centerY - body.position.y * SCALE);
                ctx.rotate(-body.rotation); // Negative because Y is flipped

                ctx.fillStyle = body.color || (body.isStatic ? '#7f8c8d' : '#95a5a6');
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2;

                body.shapes.forEach(shape => {
                    if (shape.type === ShapeType.CIRCLE) {
                        const circle = shape as CircleShape;
                        ctx.beginPath();
                        ctx.arc(circle.offset.x * SCALE, -circle.offset.y * SCALE, circle.radius * SCALE, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        // Radial line
                        ctx.beginPath();
                        ctx.moveTo(circle.offset.x * SCALE, -circle.offset.y * SCALE);
                        ctx.lineTo((circle.offset.x + circle.radius) * SCALE, -circle.offset.y * SCALE);
                        ctx.stroke();
                    } else {
                        const poly = shape as PolygonShape;
                        ctx.beginPath();
                        poly.localVertices.forEach((v, i) => {
                            if (i === 0) ctx.moveTo(v.x * SCALE, -v.y * SCALE);
                            else ctx.lineTo(v.x * SCALE, -v.y * SCALE);
                        });
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                });
                ctx.restore();
            });
        };

        engine.onUpdate(render);
        engine.start();
    });

    onCleanup(() => {
        engine?.stop();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });

    const changeScene = (s: SceneType) => {
        setScene(s);
        setupScene();
    };

    return (
        <div style="display: flex; flex-direction: column; gap: 15px; padding: 20px; background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 800px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px;">
                <div style="display: flex; gap: 8px;">
                    {(['Boxes', 'Dominoes', 'Stack', 'Composite', 'Bouncy'] as SceneType[]).map(s => (
                        <button
                            onClick={() => changeScene(s)}
                            style={`padding: 6px 14px; border-radius: 6px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; ${scene() === s ? 'background: #3498db; color: #fff;' : 'background: #f0f2f5; color: #64748b; &:hover { background: #e2e8f0; }'}`}
                        >
                            {s.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #2c3e50; background: #f0f0f0; padding: 5px 12px; border-radius: 6px;">
                    {fps()} FPS
                </div>
            </div>

            <div style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                <canvas ref={canvasRef} width="800" height="600" style="background: #fafafa; display: block;" />
            </div>

            <div style="font-size: 12px; color: #666; line-height: 1.5; background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #3498db;">
                <strong>{scene()} Scene:</strong>
                {scene() === 'Composite' && ' Demonstrates compound bodies (stars and capsules) collide as single rigid objects.'}
                {scene() === 'Bouncy' && ' High restitution (1.0) particles in a closed container.'}
                {scene() === 'Dominoes' && ' Tall boxes with low friction and small angular initial impulse.'}
                {scene() === 'Stack' && ' Multi-level friction-based stability test.'}
                {scene() === 'Boxes' && ' Basic stacking with simplified geometry.'}
            </div>
        </div>
    );
}
