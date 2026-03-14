import { createSignal, onCleanup, createEffect } from 'solid-js';
import { Vector2 } from '../../lib/math/Vector2';
import { Canvas } from '../../lib/render/Canvas';
import { CanvasView } from '../../components/CanvasView';

export default function IntegratorLab() {
    const [integrator, setIntegrator] = createSignal('semi-implicit');
    const [dt, setDt] = createSignal(0.05);

    const onCanvasReady = (render: Canvas) => {
        let animationId: number;

        let x = 1.0;
        let v = 0.0;
        let prevX: number | null = null;
        let time = 0;
        let history: { x: number, v: number, e: number, t: number }[] = [];

        const k = 1; // Stiffness
        const m = 1; // Mass

        const resetSimulation = () => {
            x = 1.0; v = 0.0; prevX = null; time = 0; history = [];
        };

        const stepPhysics = () => {
            const currentDt = dt();
            const calcA = (pos: number) => -(k / m) * pos;

            if (integrator() === 'explicit') {
                const nextX = x + v * currentDt;
                const nextV = v + calcA(x) * currentDt;
                x = nextX; v = nextV;
            }
            else if (integrator() === 'semi-implicit') {
                v += calcA(x) * currentDt;
                x += v * currentDt;
            }
            else if (integrator() === 'implicit') {
                const denom = 1 + currentDt * currentDt;
                const nextX = (x + currentDt * v) / denom;
                const nextV = (v - currentDt * x) / denom;
                x = nextX; v = nextV;
            }
            else if (integrator() === 'verlet') {
                if (prevX === null) prevX = x - v * currentDt;
                const a = calcA(x);
                const nextX = 2 * x - prevX + a * (currentDt * currentDt);
                prevX = x;
                x = nextX;
                v = (x - prevX) / currentDt;
            }
            else if (integrator() === 'rk4') {
                const f = (_t: number, pos: number, vel: number) => ({
                    dx: vel,
                    dv: calcA(pos)
                });

                const k1 = f(0, x, v);
                const k2 = f(0, x + 0.5 * currentDt * k1.dx, v + 0.5 * currentDt * k1.dv);
                const k3 = f(0, x + 0.5 * currentDt * k2.dx, v + 0.5 * currentDt * k2.dv);
                const k4 = f(0, x + currentDt * k3.dx, v + currentDt * k3.dv);

                x += (currentDt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
                v += (currentDt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv);
            }

            time += currentDt;
            const energy = 0.5 * m * v * v + 0.5 * k * x * x;
            history.push({ x, v, e: energy, t: time });
            if (history.length > 500) history.shift();
        };

        const drawLabel = (text: string, xp: number, yp: number) => {
            render.text(text.toUpperCase(), new Vector2(xp, yp), { fill: '#666', font: 'bold 10px Rajdhani' });
        };

        const drawVectorField = (cx: number, cy: number, w: number, h: number) => {
            const step = 25;
            for (let i = -w / 2 + step / 2; i < w / 2; i += step) {
                for (let j = -h / 2 + step / 2; j < h / 2; j += step) {
                    const vx_val = i / (80 * render.zoom);
                    const vy_val = -j / (80 * render.zoom);

                    const dx_dt = vy_val;
                    const dv_dt = -vx_val;

                    const len = Math.sqrt(dx_dt * dx_dt + dv_dt * dv_dt);
                    if (len < 0.1) continue;

                    const visualLen = 10;
                    const nx = (dx_dt / len) * visualLen;
                    const ny = -(dv_dt / len) * visualLen;

                    render.line(new Vector2(cx + i, cy + j), new Vector2(cx + i + nx, cy + j + ny), { stroke: 'rgba(255,255,255,0.1)' });
                }
            }
        };

        const loop = () => {
            stepPhysics();
            render.clear();

            const w = render.element.width / 2;
            const h = render.element.height / 2;

            // --- Panel 1: Physical System (SHO) ---
            const p1cx = w / 2;
            const p1cy = h / 2 + x * 60 * render.zoom;
            render.line(new Vector2(p1cx, 0), new Vector2(p1cx, p1cy), { stroke: '#444', lineWidth: 2 });
            render.circle(new Vector2(p1cx, p1cy), 15 * render.zoom, { fill: '#e74c3c' });
            drawLabel('Physical Simulation', 10, 20);

            // --- Panel 2: Phase Space (v vs x) ---
            const p2cx = w + w / 2;
            const p2cy = h / 2;
            const scale = 80 * render.zoom;
            render.line(new Vector2(w, p2cy), new Vector2(render.element.width, p2cy), { stroke: '#222' });
            render.line(new Vector2(p2cx, 0), new Vector2(p2cx, h), { stroke: '#222' });
            drawVectorField(p2cx, p2cy, w, h);

            const trail = history.map(p => new Vector2(p2cx + p.x * scale, p2cy - p.v * scale));
            render.linePath(trail, { stroke: '#3498db', lineWidth: 2 });

            const last = history[history.length - 1];
            if (last) {
                const headX = p2cx + last.x * scale;
                const headY = p2cy - last.v * scale;
                render.circle(new Vector2(headX, headY), 4 * render.zoom, { fill: '#fff' });
            }

            drawLabel('Phase Space (X vs V)', w + 10, 20);

            // --- Panel 3: Energy Stability (Bottom Left) ---
            const energyTrail = history.map((p, i) => new Vector2((i / 500) * w, h + h - (p.e * 80 * render.zoom)));
            render.linePath(energyTrail, { stroke: '#2ecc71' });
            drawLabel('Energy Stability (E vs T)', 10, h + 20);

            // --- Panel 4: Position Graph (Bottom Right) ---
            const p4cy = h + h / 2;
            const posTrail = history.map((p, i) => new Vector2(w + (i / 500) * w, p4cy - p.x * 60 * render.zoom));
            render.linePath(posTrail, { stroke: '#f1c40f' });
            drawLabel('Position Wave (X vs T)', w + 10, h + 20);

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
        <div style="font-family: 'Rajdhani', sans-serif; background: #0a0a0a; color: white; padding: 20px; border-radius: 12px; border: 1px solid #222;">
            <div style="margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 20px; align-items: center; justify-content: center;">
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">METHOD:</span>
                    <select value={integrator()} onInput={(e) => setIntegrator(e.currentTarget.value)}
                        style="background: #1a1a1a; color: white; border: 1px solid #333; padding: 5px 10px; border-radius: 4px; outline: none;">
                        <option value="explicit">Explicit Euler (Explodes)</option>
                        <option value="implicit">Backward Euler (Dampens)</option>
                        <option value="semi-implicit">Symplectic Euler (Stable)</option>
                        <option value="verlet">Verlet Integration (Stable)</option>
                        <option value="rk4">Runge-Kutta 4 (Precise)</option>
                    </select>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">STEP (Δt):</span>
                    <input type="range" min="0.01" max="0.15" step="0.01" value={dt()}
                        onInput={(e) => setDt(parseFloat(e.currentTarget.value))}
                        style="accent-color: #3498db;" />
                    <span style="min-width: 40px;">{dt().toFixed(2)}</span>
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
