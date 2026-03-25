import { createSignal, onCleanup, createEffect } from 'solid-js';
import { Vector2 } from '../lib/math/Vector2';
import { Body } from '../lib/bodies/Body';
import { World } from '../lib/dynamics/World';
import { Engine } from '../lib/dynamics/Engine';
import { Canvas } from '../lib/render/Canvas';
import { SAT } from '../lib/collision/LegacySAT';
import { CanvasView } from '../components/CanvasView';

export default function RotationFrictionDemo() {
  const [friction, setFriction] = createSignal(0.5);
  const [restitution, setRestitution] = createSignal(0.3);

  const onCanvasReady = (render: Canvas) => {
    const world = new World();
    const engine = new Engine(world);
    const colors = ['#00bcd4', '#e91e63', '#9c27b0', '#ff9800', '#4caf50', '#ffeb3b'];

    let draggedBody: Body | null = null;

    const createBox = (x: number, y: number) => {
      const w = 40 + Math.random() * 40;
      const h = 40 + Math.random() * 40;
      const m = (w * h) / 1000;
      const inertia = (w * w + h * h) * m / 12;

      const body = new Body(x, y, m, inertia);
      const vertices = [
        new Vector2(-w / 2, -h / 2),
        new Vector2(w / 2, -h / 2),
        new Vector2(w / 2, h / 2),
        new Vector2(-w / 2, h / 2)
      ];
      body.setVertices(vertices);
      body.restitution = restitution();
      body.friction = friction();
      (body as any).color = colors[Math.floor(Math.random() * colors.length)];
      return body;
    };

    // Create Sloped Floor as a Static Body
    const createFloor = () => {
      const floor = new Body(400, 450, 0, 0, true);
      const w = 1000;
      const h = 100;
      const vertices = [
        new Vector2(-w / 2, -h / 2),
        new Vector2(w / 2, -h / 2),
        new Vector2(w / 2, h / 2),
        new Vector2(-w / 2, h / 2)
      ];
      floor.setVertices(vertices);
      floor.rotation = -0.25; // Matches the rendered slope
      floor.restitution = restitution();
      floor.friction = friction();
      floor.updateTransform();
      world.addBody(floor);
    };

    const initSim = () => {
      world.clear();
      createFloor();
      world.addBody(createBox(400, 100));
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        const mouse = render.getMousePos(e);
        for (const body of world.bodies) {
          if (body.isStatic) continue;
          if (SAT.isPointInPoly(mouse, body.vertices)) {
            draggedBody = body;
            body.velocity.set(0, 0);
            body.angularVelocity = 0;
            e.preventDefault();
            break;
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedBody) return;
      const mouse = render.getMousePos(e);
      draggedBody.position.copy(mouse);
      draggedBody.velocity.set(0, 0);
      draggedBody.angularVelocity = 0;
      draggedBody.updateTransform();
    };

    const handleMouseUp = () => {
      draggedBody = null;
    };

    render.element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    engine.onUpdate(() => {
      // Manual boundary check for screen
      for (const body of world.bodies) {
        if (body.isStatic) continue;
        if (body.position.x < 0) { body.position.x = 0; body.velocity.x *= -0.5; }
        if (body.position.x > 800) { body.position.x = 800; body.velocity.x *= -0.5; }
        if (body.position.y > 600) { body.position.y = 100; body.velocity.y = 0; } // Teleport back
      }

      render.clear();

      for (const body of world.bodies) {
        const color = body.isStatic ? '#333' : ((body as any).color || '#00bcd4');
        render.polygon(body.vertices, {
          fill: color,
          stroke: '#fff',
          lineWidth: 1
        });

        if (!body.isStatic) {
          // Draw orientation line
          const center = body.position;
          const forward = new Vector2(Math.cos(body.rotation), Math.sin(body.rotation)).mult(20);
          render.line(center, center.clone().add(forward), { stroke: '#fff', lineWidth: 2 });
        }
      }
    });

    createEffect(() => {
      const f = friction();
      const r = restitution();
      for (const body of world.bodies) {
        body.friction = f;
        body.restitution = r;
      }
    });

    initSim();
    engine.start();

    onCleanup(() => {
      engine.stop();
      render.element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    });

    (window as any).spawnBox = () => {
      world.addBody(createBox(400, 100));
    };

    (window as any).resetSim = initSim;
  };

  return (
    <div style="font-family: sans-serif; background: #111; color: white; padding: 20px; border-radius: 8px;">
      <h2 style="margin: 0; font-family: 'Orbitron', sans-serif; letter-spacing: 2px; color: #3498db; margin-bottom: 20px;">PART 7: FRICTION & ROTATION</h2>
      <div style="margin-bottom: 20px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
        <label>
          Friction (µ): {friction()}
          <input type="range" min="0" max="1" step="0.1" value={friction()} onInput={(e) => setFriction(parseFloat(e.currentTarget.value))} style="margin-left: 10px;" />
        </label>
        <label>
          Bounciness (e): {restitution()}
          <input type="range" min="0" max="1" step="0.1" value={restitution()} onInput={(e) => setRestitution(parseFloat(e.currentTarget.value))} style="margin-left: 10px;" />
        </label>
        <button onClick={() => (window as any).spawnBox()} style="padding: 6px 12px; background: #3498db; border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;">
          Spawn Box
        </button>
        <button onClick={() => (window as any).resetSim()} style="padding: 6px 12px; background: #e74c3c; border: none; color: white; border-radius: 4px; cursor: pointer;">
          Reset Sim
        </button>
        <span style="font-size: 12px; color: #888;">Inter-box collisions enabled! Drag to move!</span>
      </div>
      <div style="position: relative; border-radius: 4px; overflow: hidden;">
        <CanvasView
          width={800}
          height={600}
          onReady={onCanvasReady}
          style={{ background: "#1a1a1a" }}
        />
      </div>
    </div>
  );
}
