import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';

export default function IntegrationDashboard() {
    let canvasRef!: HTMLCanvasElement;
    const [integrator, setIntegrator] = createSignal('semi-implicit');
    const [dt, setDt] = createSignal(0.05);

    onMount(() => {
        const ctx = canvasRef.getContext('2d')!;
        let animationId: number;

        let x = 1.0;
        let v = 0.0;
        let prevX: number | null = null; // Required for Verlet
        let time = 0;
        let energyHistory: number[] = [];
        const k = 1; // Stiffness
        const m = 1; // Mass

        const resetSimulation = () => {
            x = 1.0; v = 0.0; prevX = null; time = 0; energyHistory = [];
        };

        const stepPhysics = () => {
            const currentDt = dt();
            const a = -(k / m) * x; // Current acceleration

            if (integrator() === 'explicit') {
                x += v * currentDt;
                v += a * currentDt;
            }
            else if (integrator() === 'semi-implicit') {
                v += a * currentDt;
                x += v * currentDt;
            }
            else if (integrator() === 'implicit') {
                // Using the exact matrix inversion for a perfect demonstration of damping
                const denom = 1 + currentDt * currentDt;
                const nextX = (x + currentDt * v) / denom;
                const nextV = (v - currentDt * x) / denom;
                x = nextX; v = nextV;
            }
            else if (integrator() === 'verlet') {
                // Initialize previous position on the first frame
                if (prevX === null) prevX = x - v * currentDt;

                const nextX = 2 * x - prevX + a * (currentDt * currentDt);
                prevX = x; // Current becomes previous
                x = nextX; // Next becomes current

                // Approximate velocity to calculate energy for the graph
                v = (x - prevX) / currentDt;
            }
            else if (integrator() === 'rk4') {
                // RK4 requires recalculating acceleration at future sample points
                const calcA = (pos: number) => -(k / m) * pos;

                const x1 = x, v1 = v, a1 = calcA(x1);
                const x2 = x + 0.5 * v1 * currentDt, v2 = v + 0.5 * a1 * currentDt, a2 = calcA(x2);
                const x3 = x + 0.5 * v2 * currentDt, v3 = v + 0.5 * a2 * currentDt, a3 = calcA(x3);
                const x4 = x + v3 * currentDt, v4 = v + a3 * currentDt, a4 = calcA(x4);

                x += (currentDt / 6.0) * (v1 + 2 * v2 + 2 * v3 + v4);
                v += (currentDt / 6.0) * (a1 + 2 * a2 + 2 * a3 + a4);
            }

            time += currentDt;
            const energy = 0.5 * m * v * v + 0.5 * k * x * x;
            energyHistory.push(energy);

            if (energyHistory.length > 400) energyHistory.shift();
        };

        const loop = () => {
            stepPhysics();
            ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

            // --- Draw Spring System ---
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, 300, 400);
            const massY = 200 + x * 100;

            ctx.beginPath();
            ctx.moveTo(150, 0); ctx.lineTo(150, massY);
            ctx.strokeStyle = '#888'; ctx.lineWidth = 4; ctx.stroke();

            ctx.beginPath();
            ctx.arc(150, massY, 20, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c'; ctx.fill();

            // --- Draw Energy Graph ---
            ctx.fillStyle = '#222';
            ctx.fillRect(300, 0, 500, 400);

            ctx.beginPath();
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2;

            energyHistory.forEach((e, i) => {
                const plotX = 300 + (i / 400) * 500;
                const plotY = 200 - (e - 0.5) * 200; // 0.5 is the starting energy
                if (i === 0) ctx.moveTo(plotX, plotY);
                else ctx.lineTo(plotX, plotY);
            });
            ctx.stroke();

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
                        <option value="explicit">Explicit Euler (Explodes)</option>
                        <option value="implicit">Implicit Euler (Dampens)</option>
                        <option value="semi-implicit">Semi-Implicit (Stable)</option>
                        <option value="verlet">Verlet (Stable)</option>
                        <option value="rk4">RK4 (Perfect/Slow)</option>
                    </select>
                </label>
                <label>
                    Time Step (dt): {dt()}
                    <input type="range" min="0.01" max="0.15" step="0.01" value={dt()} onInput={(e) => setDt(parseFloat(e.target.value))} style="margin-left: 10px;" />
                </label>
            </div>
            <canvas ref={canvasRef} width="800" height="400" style="background: black; border-radius: 4px;"></canvas>
        </div>
    );
}
