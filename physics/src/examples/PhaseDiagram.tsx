import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';

export default function PhaseSpaceDiagram() {
    let canvasRef!: HTMLCanvasElement;
    const [integrator, setIntegrator] = createSignal('semi-implicit');
    const [dt, setDt] = createSignal(0.1);

    onMount(() => {
        const ctx = canvasRef.getContext('2d')!;
        let animationId: number;

        let x = 1.0;
        let v = 0.0;
        let prevX: number | null = null;
        let path: { x: number, v: number }[] = [];

        const resetSimulation = () => {
            x = 1.0; v = 0.0; prevX = null; path = [];
        };

        const stepPhysics = () => {
            const currentDt = dt();
            const a = -x;

            if (integrator() === 'explicit') {
                const nextX = x + v * currentDt;
                const nextV = v + a * currentDt;
                x = nextX; v = nextV;
            }
            else if (integrator() === 'semi-implicit') {
                v += a * currentDt;
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
                const nextX = 2 * x - prevX + a * (currentDt * currentDt);
                prevX = x;
                x = nextX;
                v = (x - prevX) / currentDt;
            }
            else if (integrator() === 'rk4') {
                const calcA = (pos: number) => -pos;
                const x1 = x, v1 = v, a1 = calcA(x1);
                const x2 = x + 0.5 * v1 * currentDt, v2 = v + 0.5 * a1 * currentDt, a2 = calcA(x2);
                const x3 = x + 0.5 * v2 * currentDt, v3 = v + 0.5 * a2 * currentDt, a3 = calcA(x3);
                const x4 = x + v3 * currentDt, v4 = v + a3 * currentDt, a4 = calcA(x4);

                x += (currentDt / 6.0) * (v1 + 2 * v2 + 2 * v3 + v4);
                v += (currentDt / 6.0) * (a1 + 2 * a2 + 2 * a3 + a4);
            }

            path.push({ x, v });
            if (path.length > 500) path.shift();
        };

        const loop = () => {
            stepPhysics();
            ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

            const cx = canvasRef.width / 2;
            const cy = canvasRef.height / 2;
            const scale = 150;

            // Draw Axes
            ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, cy); ctx.lineTo(canvasRef.width, cy);
            ctx.moveTo(cx, 0); ctx.lineTo(cx, canvasRef.height);
            ctx.stroke();

            // Draw Path
            ctx.beginPath();
            ctx.strokeStyle = '#3498db'; ctx.lineWidth = 2;
            path.forEach((p, i) => {
                const plotX = cx + p.x * scale;
                const plotY = cy - p.v * scale;
                if (i === 0) ctx.moveTo(plotX, plotY);
                else ctx.lineTo(plotX, plotY);
            });
            ctx.stroke();

            // Draw Current Point
            ctx.beginPath();
            ctx.arc(cx + x * scale, cy - v * scale, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c'; ctx.fill();

            animationId = requestAnimationFrame(loop);
        };

        createEffect(() => {
            integrator(); dt();
            resetSimulation();
        });

        loop();
        onCleanup(() => cancelAnimationFrame(animationId));
    });

    return (
        <div style="font-family: sans-serif; background: #111; color: white; padding: 20px; border-radius: 8px;">
            <div style="margin-bottom: 20px; display: flex; gap: 20px;">
                <label>
                    Integrator:
                    <select value={integrator()} onInput={(e) => setIntegrator(e.target.value)} style="margin-left: 10px; padding: 4px;">
                        <option value="explicit">Forward Euler</option>
                        <option value="implicit">Backward Euler</option>
                        <option value="semi-implicit">Semi-Implicit Euler</option>
                        <option value="verlet">Verlet Integration</option>
                        <option value="rk4">Runge-Kutta 4 (RK4)</option>
                    </select>
                </label>
                <label>
                    Time Step (dt): {dt()}
                    <input type="range" min="0.01" max="0.2" step="0.01" value={dt()} onInput={(e) => setDt(parseFloat(e.target.value))} style="margin-left: 10px;" />
                </label>
            </div>
            <canvas ref={canvasRef} width="600" height="600" style="background: #222; border-radius: 4px;"></canvas>
        </div>
    );
}