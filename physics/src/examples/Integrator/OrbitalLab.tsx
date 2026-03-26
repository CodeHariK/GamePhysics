import { createSignal, onCleanup, createEffect } from 'solid-js';
import { Vector2 } from '../../lib/math/Vector2';
import { Canvas } from '../../lib/render/Canvas';
import { CanvasView } from '../../components/CanvasView';

export default function OrbitalLab() {
    const [integrator, setIntegrator] = createSignal('semi-implicit');
    const [dt, setDt] = createSignal(0.015);

    const onCanvasReady = (render: Canvas) => {
        let animationId: number;

        // State: Sun-Earth system (Sun at origin 0,0)
        let px = 180; // Distance
        let py = 0;
        let vx = 0;
        let vy = 150; // Near-circular velocity (sqrt(GM/r) ~ 149)

        let path: Vector2[] = [];
        let history: { r: number, v: number, e: number, t: number, px: number, vx: number }[] = [];
        let time = 0;

        const G = 4000000; // Large G for visible simulation
        const M = 1;       // Mass of Sun
        const m = 1;       // Mass of planet

        const resetSimulation = () => {
            px = 180; py = 0; vx = 0; vy = 150; time = 0; path = []; history = [];
        };

        const calcAcc = (pos_x: number, pos_y: number) => {
            const r2 = pos_x * pos_x + pos_y * pos_y;
            const r = Math.sqrt(r2);
            const F = -G * M * m / (r2 * Math.max(r, 0.1)); // Magnitude / r with softening
            return { ax: F * pos_x, ay: F * pos_y };
        };

        const stepPhysics = () => {
            const currentDt = dt();

            if (integrator() === 'explicit') {
                const { ax, ay } = calcAcc(px, py);
                px += vx * currentDt;
                py += vy * currentDt;
                vx += ax * currentDt;
                vy += ay * currentDt;
            }
            else if (integrator() === 'implicit') {
                // Backward Euler via fixed-point
                let nvx = vx, nvy = vy;
                for (let i = 0; i < 5; i++) {
                    const npx = px + nvx * currentDt;
                    const npy = py + nvy * currentDt;
                    const acc = calcAcc(npx, npy);
                    nvx = vx + acc.ax * currentDt;
                    nvy = vy + acc.ay * currentDt;
                }
                vx = nvx; vy = nvy;
                px += vx * currentDt; py += vy * currentDt;
            }
            else if (integrator() === 'semi-implicit') {
                const { ax, ay } = calcAcc(px, py);
                vx += ax * currentDt;
                vy += ay * currentDt;
                px += vx * currentDt;
                py += vy * currentDt;
            }
            else if (integrator() === 'verlet') {
                const a1 = calcAcc(px, py);
                const npx = px + vx * currentDt + 0.5 * a1.ax * currentDt * currentDt;
                const npy = py + vy * currentDt + 0.5 * a1.ay * currentDt * currentDt;
                const a2 = calcAcc(npx, npy);
                vx += 0.5 * (a1.ax + a2.ax) * currentDt;
                vy += 0.5 * (a1.ay + a2.ay) * currentDt;
                px = npx; py = npy;
            }
            else if (integrator() === 'rk4') {
                const f = (x: number, y: number, v_x: number, v_y: number) => {
                    const acc = calcAcc(x, y);
                    return { dx: v_x, dy: v_y, dvx: acc.ax, dvy: acc.ay };
                };
                const k1 = f(px, py, vx, vy);
                const k2 = f(px + 0.5 * currentDt * k1.dx, py + 0.5 * currentDt * k1.dy, vx + 0.5 * currentDt * k1.dvx, vy + 0.5 * currentDt * k1.dvy);
                const k3 = f(px + 0.5 * currentDt * k2.dx, py + 0.5 * currentDt * k2.dy, vx + 0.5 * currentDt * k2.dvx, vy + 0.5 * currentDt * k2.dvy);
                const k4 = f(px + currentDt * k3.dx, py + currentDt * k3.dy, vx + currentDt * k3.dvx, vy + currentDt * k3.dvy);
                px += (currentDt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
                py += (currentDt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
                vx += (currentDt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx);
                vy += (currentDt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy);
            }

            path.push(new Vector2(px, py));
            if (path.length > 600) path.shift();

            const r = Math.sqrt(px * px + py * py);
            const v = Math.sqrt(vx * vx + vy * vy);
            const energy = 0.5 * m * v * v - G * M * m / r;
            time += currentDt;

            history.push({ r, v, e: energy, t: time, px, vx });
            if (history.length > 500) history.shift();
        };

        const drawLabel = (text: string, xp: number, yp: number) => {
            render.text(text.toUpperCase(), new Vector2(xp, yp), { fill: '#666', font: 'bold 10px "JetBrains Mono", monospace' });
        };

        const drawVectorField = (cx: number, cy: number, w: number, h: number) => {
            const timeOffset = Date.now() / 1000;
            const step = 25;
            const L2 = 180 * 180 * 150 * 150;
            for (let i = -w / 2 + step / 2; i < w / 2; i += step) {
                for (let j = -h / 2 + step / 2; j < h / 2; j += step) {
                    const r_val = 180 + i / (2 * render.zoom);
                    const v_val = 150 - j / (2 * render.zoom);

                    const dr_dt = (v_val - 150);
                    const dv_dt = (L2 / (r_val * r_val * r_val)) - (G / (r_val * r_val));

                    const dx = dr_dt * 0.5;
                    const dy = -dv_dt * 0.5;

                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len < 0.1) continue;

                    const motion = Math.sin(timeOffset * 2 + (i + j) * 0.01) * 2;
                    const visualLen = 8 + motion;

                    const nx = (dx / len) * visualLen;
                    const ny = (dy / len) * visualLen;

                    const px_coord = cx + i;
                    const py_coord = cy + j;

                    const color = `rgba(255, 255, 255, ${0.1 + (motion + 2) / 20})`;
                    render.line(new Vector2(px_coord, py_coord), new Vector2(px_coord + nx, py_coord + ny), { stroke: color, lineWidth: 1 });
                    render.circle(new Vector2(px_coord + nx, py_coord + ny), 1.2, { fill: color });
                }
            }
        };

        const loop = () => {
            stepPhysics();
            render.clear();

            const w = render.element.width / 2;
            const h = render.element.height / 2;

            // --- Panel 1: Orbit Physics (Top Left) ---
            const p1cx = w / 2;
            const p1cy = h / 2;
            // Sun
            render.circle(new Vector2(p1cx, p1cy), 15 * render.zoom, { fill: '#f1c40f' });
            // Path
            const orbitalPath = path.map(p => new Vector2(p1cx + (p.x / 2) * render.zoom, p1cy + (p.y / 2) * render.zoom));
            render.linePath(orbitalPath, { stroke: 'rgba(52, 152, 219, 0.3)', lineWidth: 1 });
            // Planet
            render.circle(new Vector2(p1cx + (px / 2) * render.zoom, p1cy + (py / 2) * render.zoom), 6 * render.zoom, { fill: '#3498db' });
            drawLabel('Orbital View (Sun-Earth)', 10, 20);

            // --- Panel 2: Phase Space (r vs v) (Top Right) ---
            const p2cx = w + w / 2;
            const p2cy = h / 2;
            render.line(new Vector2(w, p2cy), new Vector2(render.element.width, p2cy), { stroke: '#222' });
            render.line(new Vector2(p2cx, 0), new Vector2(p2cx, h), { stroke: '#222' });

            drawVectorField(p2cx, p2cy, w, h);
            const phaseTrail = history.map(p => new Vector2(p2cx + (p.r - 180) * 2 * render.zoom, p2cy - (p.v - 150) * 2 * render.zoom));
            render.linePath(phaseTrail, { stroke: '#9b59b6', lineWidth: 2 });

            const last = history[history.length - 1];
            if (last) {
                const headX = p2cx + (last.r - 180) * 2 * render.zoom;
                const headY = p2cy - (last.v - 150) * 2 * render.zoom;
                render.circle(new Vector2(headX, headY), 4 * render.zoom, { fill: '#fff' });
            }

            drawLabel('Phase Space (r vs v)', w + 10, 20);

            // --- Panel 3: Total Energy (Bottom Left) ---
            const initialEnergy = history[0]?.e || 0;
            const energyTrail = history.map((p, i) => new Vector2((i / 500) * w, h + h / 2 - ((p.e - initialEnergy) / 50) * render.zoom));
            render.linePath(energyTrail, { stroke: '#2ecc71' });
            drawLabel('Total Energy Deviation', 10, h + 20);

            // --- Panel 4: Distance (Bottom Right) ---
            const p4cy = h + h / 2;
            const distanceTrail = history.map((p, i) => new Vector2(w + (i / 500) * w, p4cy - (p.r - 180) * render.zoom));
            render.linePath(distanceTrail, { stroke: '#e67e22' });
            drawLabel('Distance from Sun (r vs T)', w + 10, h + 20);

            // Dividers
            render.line(new Vector2(w, 0), new Vector2(w, render.element.height), { stroke: '#333' });
            render.line(new Vector2(0, h), new Vector2(render.element.width, h), { stroke: '#333' });

            animationId = requestAnimationFrame(loop);
        };

        createEffect(() => {
            integrator(); dt();
            resetSimulation();
        });

        loop();
        onCleanup(() => {
            cancelAnimationFrame(animationId);
        });
    };

    return (
        <div style="font-family: 'JetBrains Mono', monospace; background: #0a0a0a; color: white; padding: 20px; border-radius: 12px; border: 1px solid #222;">
            <div style="margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 20px; align-items: center; justify-content: center;">
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">METHOD:</span>
                    <select value={integrator()} onInput={(e) => setIntegrator(e.currentTarget.value)}
                        style="background: #1a1a1a; color: white; border: 1px solid #333; padding: 5px 10px; border-radius: 4px; outline: none;">
                        <option value="explicit">Explicit Euler (Explodes)</option>
                        <option value="implicit">Implicit Euler (Damped)</option>
                        <option value="semi-implicit">Symplectic Euler (Stable)</option>
                        <option value="verlet">Velocity Verlet (Stable)</option>
                        <option value="rk4">Runge-Kutta 4 (Perfect)</option>
                    </select>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">STEP (Δt):</span>
                    <input type="range" min="0.005" max="0.03" step="0.005" value={dt()}
                        onInput={(e) => setDt(parseFloat(e.currentTarget.value))}
                        style="accent-color: #3498db;" />
                    <span style="min-width: 40px;">{dt().toFixed(3)}</span>
                </label>
            </div>
            <div style="position: relative; background: #000; border-radius: 8px; overflow: hidden; border: 1px solid #111;">
                <CanvasView
                    width={900}
                    height={500}
                    onReady={onCanvasReady}
                />
            </div>
        </div>
    );
}
