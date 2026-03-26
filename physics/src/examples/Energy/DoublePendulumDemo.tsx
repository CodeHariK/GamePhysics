import { onMount, onCleanup, createSignal } from 'solid-js';
import { CanvasView } from '../../components/CanvasView';
import { Vector2 } from '../../lib/math/Vector2';
import { Canvas } from '../../lib/render/Canvas';

export default function DoublePendulumDemo() {
    let canvasInstance: Canvas;
    const [isRunning, setIsRunning] = createSignal(true);

    const L1 = 120, L2 = 120; // Lengths
    const m1 = 10, m2 = 10;   // Masses
    const g = 9.81 * 100;     // Gravity

    // State: [theta1, theta2, omega1, omega2]
    const state = {
        th1: Math.PI / 2,
        th2: Math.PI / 2 + 0.1,
        w1: 0,
        w2: 0,
        history: [] as any[]
    };

    const getDerivatives = (s: typeof state) => {
        const { th1, th2, w1, w2 } = s;

        const num1 = -g * (2 * m1 + m2) * Math.sin(th1);
        const num2 = -m2 * g * Math.sin(th1 - 2 * th2);
        const num3 = -2 * Math.sin(th1 - th2) * m2;
        const num4 = w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(th1 - th2);
        const den = L1 * (2 * m1 + m2 - m2 * Math.cos(2 * th1 - 2 * th2));
        const a1 = (num1 + num2 + num3 * num4) / den;

        const num5 = 2 * Math.sin(th1 - th2);
        const num6 = w1 * w1 * L1 * (m1 + m2);
        const num7 = g * (m1 + m2) * Math.cos(th1);
        const num8 = w2 * w2 * L2 * m2 * Math.cos(th1 - th2);
        const den2 = L2 * (2 * m1 + m2 - m2 * Math.cos(2 * th1 - 2 * th2));
        const a2 = (num5 * (num6 + num7 + num8)) / den2;

        return { dth1: w1, dth2: w2, dw1: a1, dw2: a2 };
    };

    let animationId: number;
    const update = (dt: number) => {
        if (!isRunning()) return;

        // Run multiple sub-steps for stability (Euler-Cromer)
        const subSteps = 5;
        const sdt = dt / subSteps;
        for (let i = 0; i < subSteps; i++) {
            const d = getDerivatives(state);
            state.w1 += d.dw1 * sdt;
            state.w2 += d.dw2 * sdt;
            state.th1 += state.w1 * sdt;
            state.th2 += state.w2 * sdt;
        }

        // Energy calculations
        const { th1, th2, w1, w2 } = state;
        const K1 = 0.5 * m1 * (L1 * w1) ** 2;
        const K2 = 0.5 * m2 * ((L1 * w1) ** 2 + (L2 * w2) ** 2 + 2 * L1 * L2 * w1 * w2 * Math.cos(th1 - th2));
        const K = K1 + K2;
        const V = -(m1 + m2) * g * L1 * Math.cos(th1) - m2 * g * L2 * Math.cos(th2);
        // Offset V to be positive
        const V_offset = V + (m1 + m2) * g * L1 + m2 * g * L2;
        const Total = K + V_offset;

        if (state.history.length < 500) {
            state.history.push({
                t: state.history.length * dt,
                th1, th2, w1, w2,
                k: K, v: V_offset, total: Total
            });
        } else {
            state.history.shift();
            state.history.push({
                t: (state.history[state.history.length - 1]?.t || 0) + dt,
                th1, th2, w1, w2,
                k: K, v: V_offset, total: Total
            });
        }

        draw();
        animationId = requestAnimationFrame(() => update(0.016));
    };

    const drawChart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, keys: string[], colors: string[], maxVal: number) => {
        ctx.fillStyle = 'rgba(20, 20, 20, 0.8)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#444'; ctx.beginPath();
        ctx.moveTo(x + 30, y + 10); ctx.lineTo(x + 30, y + h - 20); ctx.lineTo(x + w - 10, y + h - 20);
        ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.fillText(title, x + 35, y + 20);

        keys.forEach((key, kidx) => {
            ctx.strokeStyle = colors[kidx]; ctx.lineWidth = 1.5;
            ctx.beginPath();
            state.history.forEach((p, i) => {
                const px = x + 30 + (i / 500) * (w - 40);
                const py = y + h - 20 - (p[key] / maxVal) * (h - 40);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
        });
    };

    const drawPhase = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, keyX: string, keyY: string, color: string) => {
        ctx.fillStyle = 'rgba(20, 20, 20, 0.8)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#444'; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = color; ctx.font = '10px "JetBrains Mono", monospace'; ctx.fillText(title, x + 5, y + 12);

        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath();
        state.history.forEach((p, i) => {
            // Normalize angles and velocities
            const px = x + w / 2 + (p[keyX] / Math.PI) * (w / 2.2);
            const py = y + h / 2 - (p[keyY] / 15) * (h / 2.2);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    };

    const draw = () => {
        if (!canvasInstance) return;
        canvasInstance.clear();
        const ctx = canvasInstance.ctx;

        const p0 = new Vector2(0, 0);
        const p1 = new Vector2(L1 * Math.sin(state.th1), L1 * Math.cos(state.th1));
        const p2 = new Vector2(p1.x + L2 * Math.sin(state.th2), p1.y + L2 * Math.cos(state.th2));

        ctx.save();
        ctx.translate(310, 150); // Center simulation

        // Rods
        canvasInstance.line(p0, p1, { stroke: '#888', lineWidth: 4 });
        canvasInstance.line(p1, p2, { stroke: '#888', lineWidth: 4 });

        // Joints
        canvasInstance.circle(p0, 5, { fill: '#fff' });
        canvasInstance.circle(p1, m1 * 0.8, { fill: '#ff4757', stroke: '#fff' });
        canvasInstance.circle(p2, m2 * 0.8, { fill: '#2ed573', stroke: '#fff' });

        // Trace of p2
        ctx.strokeStyle = '#2ed573'; ctx.globalAlpha = 0.3; ctx.beginPath();
        state.history.slice(-100).forEach((p, i) => {
            const x1 = L1 * Math.sin(p.th1);
            const y1 = L1 * Math.cos(p.th1);
            const x2 = x1 + L2 * Math.sin(p.th2);
            const y2 = y1 + L2 * Math.cos(p.th2);
            if (i === 0) ctx.moveTo(x2, y2);
            else ctx.lineTo(x2, y2);
        });
        ctx.stroke(); ctx.globalAlpha = 1.0;
        ctx.restore();

        // CHARTS
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Energy Chart
        drawChart(ctx, 40, 420, 540, 180, "Double Pendulum Energy", ['k', 'v', 'total'], ['#ff4757', '#2ed573', '#ffffff'], g * (L1 + L2) * (m1 + m2) * 1.5);

        // Phase Plots
        drawPhase(ctx, 40, 620, 260, 240, "Phase P1 (θ vs ω)", "th1", "w1", "#ff4757");
        drawPhase(ctx, 320, 620, 260, 240, "Phase P2 (θ vs ω)", "th2", "w2", "#2ed573");
    };

    onMount(() => {
        animationId = requestAnimationFrame(() => update(0.016));
    });

    onCleanup(() => {
        cancelAnimationFrame(animationId);
    });

    return (
        <div class="demo-container" style="background: #0a0a0a; padding: 25px; border-radius: 12px; border: 1px solid #333;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0; color: #fff; font-family: 'JetBrains Mono', monospace;">Simulation: Chaotic Double Pendulum</h3>
                    <p style="margin: 5px 0 0; font-size: 13px; color: #888;">Demonstrating complex coupling and energy conservation.</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button
                        onClick={() => {
                            state.th1 = Math.PI / 2; state.th2 = Math.PI / 2 + (Math.random() - 0.5);
                            state.w1 = 0; state.w2 = 0; state.history = [];
                        }}
                        style="background: #333; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-family: 'JetBrains Mono', monospace;"
                    >
                        randomize
                    </button>
                    <button
                        onClick={() => setIsRunning(!isRunning())}
                        style="background: #555; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-family: 'JetBrains Mono', monospace;"
                    >
                        {isRunning() ? 'PAUSE' : 'RESUME'}
                    </button>
                </div>
            </div>

            <CanvasView
                width={620}
                height={880}
                onReady={(c) => { canvasInstance = c; }}
            />
        </div>
    );
}
