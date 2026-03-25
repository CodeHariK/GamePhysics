import { createSignal, onCleanup } from 'solid-js';
import { Vector2 } from '../../../lib/math/Vector2';
import { Body } from '../../../lib/bodies/Body';
import { World } from '../../../lib/dynamics/World';
import { Engine } from '../../../lib/dynamics/Engine';
import { Canvas } from '../../../lib/render/Canvas';
import { SkateboardConstraint } from './SkateboardConstraint';
import { CanvasView } from '../../../components/CanvasView';

export default function SkateboardDemo() {
    const [followMouse, setFollowMouse] = createSignal(false);
    const [constraintError, setConstraintError] = createSignal(0);

    const onCanvasReady = (render: Canvas) => {
        const world = new World();
        const SCALE = 80;
        const centerX = 400;
        const centerY = 300;
        world.gravity.set(0, 9.81 * SCALE); // Increased gravity for snappier motion
        const engine = new Engine(world);

        // --- Coordinate System & Constants ---
        const radius = 1.6;
        const flatLength = 3.5;
        const baseY = -1.25;
        const wallHeight = 2.0;

        // Space simulation scale
        const pRadius = radius * SCALE;
        const pFlatLength = flatLength * SCALE;
        const pBaseY = centerY - baseY * SCALE;

        const skater = new Body(centerX - pFlatLength / 2 - pRadius * 0.7, pBaseY - pRadius * 0.7, 1, 100);
        skater.velocity.set(-300, 0); // Give it a kick to the left
        skater.restitution = 0.1;
        skater.friction = 0.05;
        world.addBody(skater);

        const constraint = new SkateboardConstraint(skater, pRadius, pFlatLength, pBaseY, centerX);
        world.addConstraint(constraint);

        const drawSkater = (pos: Vector2, tangent: Vector2) => {
            render.save();
            render.translate(pos);
            const angle = Math.atan2(tangent.y, tangent.x);
            render.rotate(angle);

            const s = SCALE;

            // Wheels (orange)
            const wheelRadius = 0.06 * s;
            const wheelBase = 0.6 * s;
            const frontAxle = new Vector2(wheelBase * 0.4, -wheelRadius);
            const backAxle = new Vector2(-wheelBase * 0.4, -wheelRadius);

            render.circle(frontAxle, wheelRadius, { fill: '#ff8c1a', stroke: '#000', lineWidth: 1 });
            render.circle(backAxle, wheelRadius, { fill: '#ff8c1a', stroke: '#000', lineWidth: 1 });

            // Deck
            const deckLen = 0.8 * s;
            const deckThk = 0.04 * s;
            render.rect(-deckLen / 2, -wheelRadius * 2 - deckThk, deckLen, deckThk, { fill: '#444', stroke: '#000', lineWidth: 1 });

            // Stick Figure
            const bodyHeight = 0.95 * s;
            const legHeight = bodyHeight * 0.4;
            const torsoHeight = bodyHeight * 0.35;
            const stance = 0.18 * s;
            const deckY = -wheelRadius * 2 - deckThk;

            const hip = new Vector2(0, deckY - legHeight);
            const shoulder = new Vector2(0, hip.y - torsoHeight);

            // Legs
            render.line(new Vector2(-stance, deckY), hip, { stroke: '#000', lineWidth: 1.5 });
            render.line(new Vector2(stance, deckY), hip, { stroke: '#000', lineWidth: 1.5 });
            // Torso
            render.line(hip, shoulder, { stroke: '#000', lineWidth: 1.5 });
            // Head
            render.circle(new Vector2(0, shoulder.y - 0.18 * s), 0.18 * s, { fill: '#fff', stroke: '#000', lineWidth: 1.5 });
            // Arms
            const armStart = new Vector2(0, shoulder.y + 0.1 * s);
            render.line(armStart, new Vector2(-0.2 * s, armStart.y + 0.2 * s), { stroke: '#000', lineWidth: 1.5 });
            render.line(armStart, new Vector2(0.2 * s, armStart.y + 0.2 * s), { stroke: '#000', lineWidth: 1.5 });

            render.restore();
        };

        const drawHalfPipe = () => {
            const arcSteps = 32;
            const pts: Vector2[] = [];

            const leftWallX = centerX - pFlatLength / 2 - pRadius;
            const rightWallX = centerX + pFlatLength / 2 + pRadius;
            const topY = centerY - (baseY + wallHeight) * SCALE;
            const bottomEdgeY = pBaseY + 120;

            // Block points
            pts.push(new Vector2(rightWallX + 60, topY));
            pts.push(new Vector2(rightWallX + 60, bottomEdgeY));
            pts.push(new Vector2(leftWallX - 60, bottomEdgeY));
            pts.push(new Vector2(leftWallX - 60, topY));

            // Inner surface
            pts.push(new Vector2(leftWallX, topY));
            pts.push(new Vector2(leftWallX, pBaseY - pRadius));

            const lCenter = new Vector2(centerX - pFlatLength / 2, pBaseY - pRadius);
            for (let i = 0; i <= arcSteps; i++) {
                const theta = Math.PI - (i / arcSteps) * (Math.PI * 0.5);
                pts.push(new Vector2(lCenter.x + pRadius * Math.cos(theta), lCenter.y + pRadius * Math.sin(theta)));
            }

            pts.push(new Vector2(centerX - pFlatLength / 2, pBaseY));
            pts.push(new Vector2(centerX + pFlatLength / 2, pBaseY));

            const rCenter = new Vector2(centerX + pFlatLength / 2, pBaseY - pRadius);
            for (let i = 0; i <= arcSteps; i++) {
                const theta = Math.PI * 0.5 - (i / arcSteps) * (Math.PI * 0.5);
                pts.push(new Vector2(rCenter.x + pRadius * Math.cos(theta), rCenter.y + pRadius * Math.sin(theta)));
            }

            pts.push(new Vector2(rightWallX, topY));

            render.polygon(pts, {
                fill: '#b7eeb0',
                stroke: '#000',
                lineWidth: 1
            });
        };

        engine.onUpdate(() => {
            const isFollowing = followMouse();

            render.clear();
            drawHalfPipe();

            const p = skater.position;
            const fontBase = 'italic 24px Lora, "Times New Roman", serif';

            if (isFollowing) {
                const mousePos = (window as any).mousePos || new Vector2(400, 300);
                skater.position.copy(mousePos);
                skater.velocity.set(0, 0);
                skater.updateTransform();
            }

            const proj = constraint.getProjectedPoint(p);
            const tangent = constraint.getTangent(p);

            // --- Visual Helpers: Arc Centers ---
            const cL = constraint.getLeftCenter();
            const cR = constraint.getRightCenter();

            // Draw cL (Left Arc Center)
            render.circle(cL, 5, { fill: '#e74c3c' });
            render.text('cL', cL.clone().add(new Vector2(-15, -15)), { fill: '#e74c3c', font: 'italic 16px serif', align: 'center' });

            // Draw cR (Right Arc Center)
            render.circle(cR, 5, { fill: '#3498db' });
            render.text('cR', cR.clone().add(new Vector2(15, -15)), { fill: '#3498db', font: 'italic 16px serif', align: 'center' });

            if (isFollowing) {
                setConstraintError(proj.distance / SCALE);

                // Dotted line from mouse to surface
                render.line(p, proj.pos, { stroke: '#000', lineWidth: 1.5, dashed: true, dashPattern: [7, 5] });

                // Label 'C' (Constraint Error)
                const mid = p.clone().add(proj.pos).mult(0.5);
                render.text(`C = ${constraintError().toFixed(3)}`, mid.add(new Vector2(25, 0)), {
                    fill: '#000',
                    font: 'italic 20px serif',
                    align: 'left'
                });

                // Label 'p' for mouse position
                render.text('p', p.clone().add(new Vector2(0, -35)), {
                    fill: '#000',
                    font: 'italic 28px serif',
                    align: 'center'
                });
            } else {
                setConstraintError(0);
                // Equations
                render.text("Position constraint of p to ramp surface: C(p) = 0", new Vector2(400, 80), {
                    fill: '#000',
                    font: fontBase,
                    align: 'center'
                });
                render.text("Velocity constraint of p to ramp surface: C'(p) = 0", new Vector2(400, 130), {
                    fill: '#000',
                    font: fontBase,
                    align: 'center'
                });
            }

            // Draw Skater Visuals at actual position
            drawSkater(p, tangent);

            // --- Mouse Hover Probe ---
            const mousePos = (window as any).mousePos || new Vector2(400, 300);
            if (!isFollowing) {
                const hoverProj = constraint.getProjectedPoint(mousePos);

                // Draw small hover point
                render.circle(mousePos, 4, { stroke: '#95a5a6', dashed: true });
                render.circle(hoverProj.pos, 3, { fill: '#95a5a6' });

                // Dotted connection line for hover
                render.line(mousePos, hoverProj.pos, { stroke: '#95a5a6', lineWidth: 1, dashed: true });

                // Label 'C' at mouse
                render.text(`C = ${(hoverProj.distance / SCALE).toFixed(3)}`, mousePos.clone().add(new Vector2(10, -10)), {
                    fill: '#95a5a6',
                    font: 'italic 14px serif',
                    align: 'left'
                });
            }

            if (!isFollowing) {
                // Label 'p' for skater
                const n = new Vector2(-tangent.y, tangent.x);
                render.text('p', proj.pos.clone().sub(n.mult(30)), {
                    fill: '#000',
                    font: 'italic 28px serif',
                    align: 'center'
                });
            }
        });

        const handleMouseMove = (e: MouseEvent) => {
            (window as any).mousePos = render.getMousePos(e);
        };
        render.element.addEventListener('mousemove', handleMouseMove);

        engine.start();

        onCleanup(() => {
            engine.stop();
            render.element.removeEventListener('mousemove', handleMouseMove);
        });
    };

    return (
        <div style="font-family: sans-serif; background: #fff; color: #111; padding: 20px; border-radius: 8px;">
            <div style="margin-bottom: 20px; display: flex; gap: 20px; align-items: center;">
                <label style="display: flex; align-items: center; cursor: pointer; font-weight: 600;">
                    <input type="checkbox" checked={followMouse()} onChange={(e) => setFollowMouse(e.currentTarget.checked)} style="margin-right: 10px;" />
                    Follow Mouse [C]
                </label>
            </div>

            <div style="position: relative; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; background: #fdfdfd;">
                <CanvasView
                    width={800}
                    height={600}
                    onReady={onCanvasReady}
                />
            </div>

            <div style="margin-top: 20px; color: #444; font-size: 0.95rem; line-height: 1.6;">
                <p>The skater is constrained to the surface using the equation: <strong>C(p) = 0</strong></p>
                <p>In "Follow Mouse" mode, you can see the geometric error distance <em>C</em> from the constraint surface. The red dotted line shows the shortest path to satisfy the constraint.</p>
            </div>
        </div>
    );
}
