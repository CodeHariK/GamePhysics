import { onMount, onCleanup, createSignal, For } from 'solid-js';
import { CanvasView } from '../../components/CanvasView';
import { Vector2 } from '../../lib/math/Vector2';
import { Canvas } from '../../lib/render/Canvas';

export default function BrachistochroneDemo() {
    let canvasInstance: Canvas;
    const [isRunning, setIsRunning] = createSignal(true);

    const L = 500; // Increased distance
    const H = 350; // Increased height
    const gravity = 9.81 * 100; // Pixels per second squared

    // Updated Cycloid points for larger L, H
    const getCycloidPoints = (steps: number) => {
        const points: Vector2[] = [];
        const r = 200; // Adjusted for L=500, H=350
        const maxTheta = 3.32;
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * maxTheta;
            points.push(new Vector2(r * (t - Math.sin(t)), r * (1 - Math.cos(t))));
        }
        return points;
    };

    const cycloidPoints = getCycloidPoints(100);

    const getPathY = (x: number, type: 'straight' | 'parabola' | 'cycloid') => {
        if (type === 'cycloid') {
            let closest = cycloidPoints[0];
            let minDist = Math.abs(x - closest.x);
            for (const p of cycloidPoints) {
                const d = Math.abs(x - p.x);
                if (d < minDist) {
                    minDist = d; closest = p;
                }
            }
            return closest.y;
        }
        if (type === 'straight') return (H / L) * x;
        return H * Math.pow(x / L, 0.5);
    };

    const getSlope = (x: number, type: 'straight' | 'parabola' | 'cycloid') => {
        const dx = 0.1;
        const y1 = getPathY(x, type);
        const y2 = getPathY(x + dx, type);
        return (y2 - y1) / dx;
    };

    const beads = [
        { name: 'Straight', color: '#ff6b6b', type: 'straight' as const, pos: 0, v: 0, t: 0, completed: false, history: [] as any[] },
        { name: 'Parabola', color: '#4ecdc4', type: 'parabola' as const, pos: 0, v: 0, t: 0, completed: false, history: [] as any[] },
        { name: 'Cycloid (Fastest)', color: '#feca57', type: 'cycloid' as const, pos: 0, v: 0, t: 0, completed: false, history: [] as any[] }
    ];

    let animationId: number;
    const update = (dt: number) => {
        if (!isRunning()) return;

        beads.forEach(bead => {
            if (bead.completed) return;

            const x = bead.pos;
            const y = getPathY(x, bead.type);
            const slope = getSlope(x, bead.type);
            const angle = Math.atan(slope);

            const v = Math.sqrt(2 * gravity * Math.max(0.1, y));
            const ds = v * dt;
            const dx = ds * Math.cos(angle);

            bead.pos += dx;
            bead.v = v;
            bead.t += dt;

            // Energy Calculations
            const K = 0.5 * bead.v * bead.v;
            const V = gravity * (H - y);
            const Total = K + V;

            if (bead.history.length < 500) {
                bead.history.push({ t: bead.t, v: bead.v, x: bead.pos, y: y, k: K, vEnergy: V, total: Total });
            }

            if (bead.pos >= L) {
                bead.pos = L;
                bead.completed = true;
            }
        });

        draw();
        animationId = requestAnimationFrame(() => update(0.016));
    };

    const drawBigChart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, xAxis: string, yAxis: string, keys: string[], maxVal: number) => {
        // Background
        ctx.fillStyle = 'rgba(30, 30, 30, 0.5)';
        ctx.fillRect(x, y, w, h);

        // Axes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 40, y + 20); ctx.lineTo(x + 40, y + h - 30); ctx.lineTo(x + w - 20, y + h - 30);
        ctx.stroke();

        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(title, x + w / 2 - 40, y + 15);
        ctx.fillStyle = '#888'; ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(xAxis, x + w - 40, y + h - 15);
        ctx.save();
        ctx.translate(x + 15, y + h / 2 + 20);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yAxis, 0, 0);
        ctx.restore();

        beads.forEach(bead => {
            ctx.strokeStyle = bead.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const timeScale = (w - 70) / 1.5; // Scale for approx 1.5 seconds
            bead.history.forEach((point, i) => {
                keys.forEach(key => {
                    const px = x + 40 + point.t * timeScale;
                    const py = y + h - 30 - (point[key] / maxVal) * (h - 50);
                    if (px < x + w - 20) {
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                });
            });
            ctx.stroke();
        });
    };

    const drawEnergyChart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, beadIndex: number) => {
        const bead = beads[beadIndex];
        const title = `${bead.name} Energy (J)`;

        // Background
        ctx.fillStyle = 'rgba(30, 30, 30, 0.5)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#666'; ctx.beginPath();
        ctx.moveTo(x + 40, y + 20); ctx.lineTo(x + 40, y + h - 30); ctx.lineTo(x + w - 20, y + h - 30);
        ctx.stroke();

        ctx.fillStyle = bead.color; ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(title, x + 45, y + 15);

        const timeScale = (w - 70) / 1.5;
        const energyScale = (h - 50) / (gravity * H * 1.1);

        const drawLine = (key: string, color: string, name: string, offset: number) => {
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.beginPath();
            bead.history.forEach((point, i) => {
                const px = x + 40 + point.t * timeScale;
                const py = y + h - 30 - point[key] * energyScale;
                if (px < x + w - 20) {
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
            });
            ctx.stroke();
            ctx.fillStyle = color; ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(name, x + w - 60, y + 20 + offset);
        };

        drawLine('k', '#ff4757', 'K (Kinetic)', 0);
        drawLine('vEnergy', '#2ed573', 'V (Potential)', 12);
        drawLine('total', '#ffffff', 'Total', 24);
    };

    const draw = () => {
        if (!canvasInstance) return;
        canvasInstance.clear();
        const ctx = canvasInstance.ctx;

        // Draw Simulation on top half
        ctx.save();
        ctx.translate(50, 50);

        // Paths
        ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
        beads.forEach(bead => {
            ctx.strokeStyle = bead.color + '44';
            ctx.beginPath();
            for (let x = 0; x <= L; x += 5) { ctx.lineTo(x, getPathY(x, bead.type)); }
            ctx.stroke();
        });
        ctx.setLineDash([]);

        // Points
        canvasInstance.point(new Vector2(0, 0), 5, { fill: '#fff' });
        canvasInstance.point(new Vector2(L, H), 5, { fill: '#fff' });

        // Beads
        beads.forEach(bead => {
            const x = bead.pos;
            const y = getPathY(x, bead.type);
            canvasInstance.circle(new Vector2(x, y), 10, { fill: bead.color });
            const slope = getSlope(x, bead.type);
            const vVec = new Vector2(Math.cos(Math.atan(slope)), Math.sin(Math.atan(slope))).mult(bead.v * 0.1);
            canvasInstance.arrow(new Vector2(x, y), new Vector2(x + vVec.x, y + vVec.y), 6, { stroke: bead.color });
        });
        ctx.restore();

        // DRAW BIG CHARTS
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for absolute UI

        // velocity chart
        drawBigChart(ctx, 40, 500, 260, 240, "Velocity Comparison", "Time (s)", "v (px/s)", ['v'], 1500);

        // Energy chart for Cycloid
        drawEnergyChart(ctx, 320, 500, 260, 240, 2);

        // Energy chart for Straight Line
        drawEnergyChart(ctx, 40, 760, 260, 240, 0);

        // Energy chart for Parabola
        drawEnergyChart(ctx, 320, 760, 260, 240, 1);
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
                    <h3 style="margin: 0; color: #fff; font-family: 'JetBrains Mono', monospace;">Brachistochrone Performance Analytics</h3>
                    <p style="margin: 5px 0 0; font-size: 13px; color: #888;">Proving the Least Action principle through energy conservation.</p>
                </div>
                <button
                    onClick={() => {
                        beads.forEach(b => { b.pos = 0; b.v = 0; b.t = 0; b.completed = false; b.history = []; });
                        setIsRunning(true);
                    }}
                    style="background: #ef4444; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: 'JetBrains Mono', monospace; transition: all 0.2s;"
                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                >
                    RESET EXPERIMENT
                </button>
            </div>

            <CanvasView
                width={620}
                height={1020}
                onReady={(c) => {
                    canvasInstance = c;
                }}
            />

            <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(1, 1fr); gap: 10px; background: #111; padding: 15px; border-radius: 8px;">
                <For each={beads}>{(bead) => (
                    <div style={`display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${bead.color}; padding-left: 10px;`}>
                        <span style={`color: ${bead.color}; font-weight: bold; font-family: 'JetBrains Mono', monospace;`}>{bead.name}</span>
                        <span style="color: #ccc; font-family: monospace;">
                            {bead.completed ? `TIME: ${bead.t.toFixed(4)}s` : `POS: ${bead.pos.toFixed(1)} / ${L}`}
                        </span>
                    </div>
                )}</For>
            </div>
        </div>
    );
}
