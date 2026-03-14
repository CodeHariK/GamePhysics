import { createSignal, onCleanup, createEffect } from 'solid-js';
import { Vector2 } from '../../lib/math/Vector2';
import { Canvas } from '../../lib/render/Canvas';
import { CanvasView } from '../../components/CanvasView';

export default function PendulumLab() {
    const [integrator, setIntegrator] = createSignal('semi-implicit');
    const [dt, setDt] = createSignal(0.05);
    const [gravity, setGravity] = createSignal(9.81);
    const [initialTheta, setInitialTheta] = createSignal(Math.PI / 4);
    const [initialOmega, setInitialOmega] = createSignal(0.0);
    const [drag, setDrag] = createSignal(0.0);

    const onCanvasReady = (render: Canvas) => {
        let animationId: number;

        let theta = initialTheta();
        let omega = initialOmega();
        let time = 0;
        let history: { theta: number, omega: number, e: number, t: number }[] = [];

        const L = 1.0;  // Length
        const m = 1.0;  // Mass

        const resetSimulation = () => {
            theta = initialTheta();
            omega = initialOmega();
            time = 0;
            history = [];
        };

        const stepPhysics = () => {
            const currentDt = dt();
            const g = gravity();
            const b = drag();
            const calcAlpha = (angle: number, velocity: number) => -(g / L) * Math.sin(angle) - b * velocity;

            if (integrator() === 'explicit') {
                const alpha = calcAlpha(theta, omega);
                theta += omega * currentDt;
                omega += alpha * currentDt;
            }
            else if (integrator() === 'semi-implicit') {
                const alpha = calcAlpha(theta, omega);
                omega += alpha * currentDt;
                theta += omega * currentDt;
            }
            else if (integrator() === 'implicit') {
                // Implicit (Backward) Euler solved via fixed-point iteration
                let nextOmega = omega;
                for (let i = 0; i < 5; i++) { // 5 iterations for convergence
                    const nextTheta = theta + nextOmega * currentDt;
                    nextOmega = omega + calcAlpha(nextTheta, nextOmega) * currentDt;
                }
                omega = nextOmega;
                theta += omega * currentDt;
            }
            else if (integrator() === 'verlet') {
                // Velocity Verlet (Modified for velocity-dependent force)
                const a1 = calcAlpha(theta, omega);
                const nextTheta = theta + omega * currentDt + 0.5 * a1 * currentDt * currentDt;
                // Half-step velocity to estimate damping at midpoint or next step
                const vHalf = omega + 0.5 * a1 * currentDt;
                const a2 = calcAlpha(nextTheta, vHalf);
                omega += 0.5 * (a1 + a2) * currentDt;
                theta = nextTheta;
            }
            else if (integrator() === 'rk4') {
                const f = (_t: number, th: number, om: number) => ({
                    dTheta: om,
                    dOmega: -(gravity() / L) * Math.sin(th) - drag() * om
                });

                const k1 = f(0, theta, omega);
                const k2 = f(0, theta + 0.5 * currentDt * k1.dTheta, omega + 0.5 * currentDt * k1.dOmega);
                const k3 = f(0, theta + 0.5 * currentDt * k2.dTheta, omega + 0.5 * currentDt * k2.dOmega);
                const k4 = f(0, theta + currentDt * k3.dTheta, omega + currentDt * k3.dOmega);

                theta += (currentDt / 6) * (k1.dTheta + 2 * k2.dTheta + 2 * k3.dTheta + k4.dTheta);
                omega += (currentDt / 6) * (k1.dOmega + 2 * k2.dOmega + 2 * k3.dOmega + k4.dOmega);
            }

            time += currentDt;
            // E = 1/2 m (L omega)^2 + m g L (1 - cos(theta))
            const energy = 0.5 * m * (L * omega) * (L * omega) + m * gravity() * L * (1 - Math.cos(theta));
            history.push({ theta, omega, e: energy, t: time });

            if (history.length > 500) history.shift();
        };

        const drawLabel = (text: string, x: number, y: number) => {
            render.text(text.toUpperCase(), new Vector2(x, y), { fill: '#666', font: 'bold 10px Rajdhani' });
        };

        const drawVectorField = (cx: number, cy: number, w: number, h: number) => {
            const timeOffset = Date.now() / 1000;
            const step = 25;
            for (let i = -w / 2 + step / 2; i < w / 2; i += step) {
                for (let j = -h / 2 + step / 2; j < h / 2; j += step) {
                    const th = i / (40 * render.zoom);
                    const om = -j / (30 * render.zoom);

                    const dTheta = om;
                    const dOmega = -(gravity() / L) * Math.sin(th) - drag() * om;

                    const dx = dTheta * (4 * render.zoom);
                    const dy = -dOmega * (3 * render.zoom);

                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len < 0.1) continue;

                    const motion = Math.sin(timeOffset * 2 + (i + j) * 0.01) * 2;
                    const visualLen = 8 + motion;

                    const nx = (dx / len) * visualLen;
                    const ny = (dy / len) * visualLen;

                    const px = cx + i;
                    const py = cy + j;

                    const color = `rgba(255, 255, 255, ${0.1 + (motion + 2) / 20})`;
                    render.line(new Vector2(px, py), new Vector2(px + nx, py + ny), { stroke: color, lineWidth: 1 });
                    render.circle(new Vector2(px + nx, py + ny), 1.2, { fill: color });
                }
            }
        };

        const loop = () => {
            stepPhysics();
            render.clear();

            const w = render.element.width / 2;
            const h = render.element.height / 2;

            // --- Panel 1: Physical Pendulum (Top Left) ---
            const p1cx = w / 2;
            const p1cy = 50;
            const px = p1cx + L * 150 * render.zoom * Math.sin(theta);
            const py = p1cy + L * 150 * render.zoom * Math.cos(theta);

            render.line(new Vector2(p1cx, p1cy), new Vector2(px, py), { stroke: '#444', lineWidth: 3 });
            render.circle(new Vector2(px, py), 15 * render.zoom, { fill: '#3498db' });
            drawLabel('Physical Pendulum', 10, 20);

            // --- Panel 2: Phase Space (Top Right) ---
            const p2cx = w + w / 2;
            const p2cy = h / 2;
            render.line(new Vector2(w, p2cy), new Vector2(render.element.width, p2cy), { stroke: '#222' });
            render.line(new Vector2(p2cx, 0), new Vector2(p2cx, h), { stroke: '#222' });

            drawVectorField(p2cx, p2cy, w, h);

            const trail = history.map(p => new Vector2(p2cx + p.theta * 40 * render.zoom, p2cy - p.omega * 30 * render.zoom));
            render.linePath(trail, { stroke: '#9b59b6', lineWidth: 2 });

            // Current state dot
            const last = history[history.length - 1];
            if (last) {
                const headX = p2cx + last.theta * 40 * render.zoom;
                const headY = p2cy - last.omega * 30 * render.zoom;
                render.circle(new Vector2(headX, headY), 4 * render.zoom, { fill: '#fff' });
            }

            drawLabel('Phase Space (\u03b8 vs \u03c9)', w + 10, 20);

            // --- Panel 3: Energy (Bottom Left) ---
            const energyTrail = history.map((p, i) => new Vector2((i / 500) * w, h + h - (p.e * 10 * render.zoom)));
            render.linePath(energyTrail, { stroke: '#e67e22' });
            drawLabel('Total Energy (E vs T)', 10, h + 20);

            // --- Panel 4: Angular Velocity (Bottom Right) ---
            const p4cy = h + h / 2;
            const velocityTrail = history.map((p, i) => new Vector2(w + (i / 500) * w, p4cy - p.omega * 30 * render.zoom));
            render.linePath(velocityTrail, { stroke: '#2ecc71' });
            drawLabel('Velocity Wave (\u03c9 vs T)', w + 10, h + 20);

            // Dividers
            render.line(new Vector2(w, 0), new Vector2(w, render.element.height), { stroke: '#333' });
            render.line(new Vector2(0, h), new Vector2(render.element.width, h), { stroke: '#333' });

            animationId = requestAnimationFrame(loop);
        };

        createEffect(() => {
            integrator(); dt(); gravity(); initialTheta(); initialOmega(); drag();
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
                        <option value="implicit">Implicit Euler (Damped)</option>
                        <option value="semi-implicit">Symplectic Euler (Stable)</option>
                        <option value="verlet">Velocity Verlet (Stable)</option>
                        <option value="rk4">Runge-Kutta 4 (Perfect)</option>
                    </select>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">STEP (Δt):</span>
                    <input type="range" min="0.01" max="0.1" step="0.01" value={dt()}
                        onInput={(e) => setDt(parseFloat(e.currentTarget.value))}
                        style="accent-color: #3498db;" />
                    <span style="min-width: 40px;">{dt().toFixed(2)}</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">GRAVITY (g):</span>
                    <input type="range" min="0" max="30" step="0.1" value={gravity()}
                        onInput={(e) => setGravity(parseFloat(e.currentTarget.value))}
                        style="accent-color: #e67e22;" />
                    <span style="min-width: 40px;">{gravity().toFixed(1)}</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">INIT POS (θ):</span>
                    <input type="range" min={-Math.PI} max={Math.PI} step="0.1" value={initialTheta()}
                        onInput={(e) => setInitialTheta(parseFloat(e.currentTarget.value))}
                        style="accent-color: #9b59b6;" />
                    <span style="min-width: 40px;">{initialTheta().toFixed(2)} rad</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">INIT VEL (ω):</span>
                    <input type="range" min="-10" max="10" step="0.5" value={initialOmega()}
                        onInput={(e) => setInitialOmega(parseFloat(e.currentTarget.value))}
                        style="accent-color: #2ecc71;" />
                    <span style="min-width: 40px;">{initialOmega().toFixed(1)} rad/s</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #61afef; font-weight: bold;">DAMPING (b):</span>
                    <input type="range" min="0" max="2" step="0.05" value={drag()}
                        onInput={(e) => setDrag(parseFloat(e.currentTarget.value))}
                        style="accent-color: #f1c40f;" />
                    <span style="min-width: 40px;">{drag().toFixed(2)}</span>
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
