import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';

const cross2D = (w: number, r: { x: number, y: number }) => ({ x: -w * r.y, y: w * r.x });

export default function JacobianRevoluteDemo() {
    let canvasRef: HTMLCanvasElement | undefined;
    const [vA, setVA] = createSignal({ x: 0, y: 0, w: 0 });
    const [vB, setVB] = createSignal({ x: 0, y: 0, w: 0 });
    const [jacobian, setJacobian] = createSignal<number[][]>([[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]]);
    const [cDot, setCDot] = createSignal({ x: 0, y: 0 });

    const resetVelocities = () => {
        setVA({ x: 0, y: 0, w: 0 });
        setVB({ x: 0, y: 0, w: 0 });
    };

    const draw = () => {
        const canvas = canvasRef;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const anchor = { x: canvas.width / 2, y: canvas.height / 2 };
        const posA = { x: anchor.x - 100, y: anchor.y + 50 };
        const posB = { x: anchor.x + 120, y: anchor.y - 40 };

        const rA = { x: anchor.x - posA.x, y: anchor.y - posA.y };
        const rB = { x: anchor.x - posB.x, y: anchor.y - posB.y };

        const currentVA = vA();
        const currentVB = vB();

        const wA_x_rA = cross2D(currentVA.w, rA);
        const wB_x_rB = cross2D(currentVB.w, rB);

        const currentCDot = {
            x: currentVB.x + wB_x_rB.x - currentVA.x - wA_x_rA.x,
            y: currentVB.y + wB_x_rB.y - currentVA.y - wA_x_rA.y
        };
        setCDot(currentCDot);

        // Update Jacobian Matrix for display
        setJacobian([
            [-1, 0, Math.round(rA.y), 1, 0, -Math.round(rB.y)],
            [0, -1, -Math.round(rA.x), 0, 1, Math.round(rB.x)]
        ]);

        const isBreaking = Math.abs(currentCDot.x) > 0.1 || Math.abs(currentCDot.y) > 0.1;

        // Draw Bodies
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(30, 58, 138, 0.8)';
        ctx.strokeStyle = '#60a5fa';
        ctx.fillRect(posA.x - 60, posA.y - 40, 120, 80);
        ctx.strokeRect(posA.x - 60, posA.y - 40, 120, 80);

        ctx.fillStyle = 'rgba(127, 29, 29, 0.8)';
        ctx.strokeStyle = '#f87171';
        ctx.fillRect(posB.x - 70, posB.y - 50, 140, 100);
        ctx.strokeRect(posB.x - 70, posB.y - 50, 140, 100);

        // Draw Anchor and Radii
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(posA.x, posA.y); ctx.lineTo(anchor.x, anchor.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(posB.x, posB.y); ctx.lineTo(anchor.x, anchor.y); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 6, 0, Math.PI * 2); ctx.fill();

        if (isBreaking) {
            const anchorA_next = { x: anchor.x + currentVA.x + wA_x_rA.x, y: anchor.y + currentVA.y + wA_x_rA.y };
            const anchorB_next = { x: anchor.x + currentVB.x + wB_x_rB.x, y: anchor.y + currentVB.y + wB_x_rB.y };

            ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
            ctx.beginPath(); ctx.arc(anchorA_next.x, anchorA_next.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(248, 113, 113, 0.6)';
            ctx.beginPath(); ctx.arc(anchorB_next.x, anchorB_next.y, 5, 0, Math.PI * 2); ctx.fill();

            const angle = Math.atan2(anchorB_next.y - anchorA_next.y, anchorB_next.x - anchorA_next.x);
            const headlen = 10;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(anchorA_next.x, anchorA_next.y); ctx.lineTo(anchorB_next.x, anchorB_next.y); ctx.stroke();
            
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(anchorB_next.x, anchorB_next.y);
            ctx.lineTo(anchorB_next.x - headlen * Math.cos(angle - Math.PI / 6), anchorB_next.y - headlen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(anchorB_next.x - headlen * Math.cos(angle + Math.PI / 6), anchorB_next.y - headlen * Math.sin(angle + Math.PI / 6));
            ctx.fill();
        }
    };

    onMount(() => {
        const handleResize = () => {
            if (canvasRef && canvasRef.parentElement) {
                canvasRef.width = canvasRef.parentElement.clientWidth;
                canvasRef.height = 400;
                draw();
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        onCleanup(() => window.removeEventListener('resize', handleResize));
    });

    createEffect(() => {
        vA(); vB(); // Tracking
        draw();
    });

    return (
        <div style={{
            display: 'flex',
            "flex-direction": 'column',
            gap: '20px',
            background: 'rgba(30, 30, 30, 0.5)',
            padding: '20px',
            "border-radius": '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <div style={{ display: 'flex', gap: '20px', "flex-wrap": 'wrap' }}>
                <div style={{ flex: 1, "min-width": '350px', height: '400px', background: '#111', "border-radius": '8px', border: '1px solid #333', overflow: 'hidden' }}>
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
                </div>

                <div style={{ width: '380px', display: 'flex', "flex-direction": 'column', gap: '15px' }}>
                    <h3 style={{ margin: 0, "font-size": '1.1rem' }}>Jacobian: Revolute Joint</h3>
                    
                    <div style={{ background: '#111', padding: '10px', "border-radius": '6px', "border-left": '4px solid #60a5fa' }}>
                        <div class="slider-label"><span>Body A: vX</span> <span>{vA().x}</span></div>
                        <input type="range" min="-50" max="50" value={vA().x} onInput={e => setVA({...vA(), x: parseInt(e.currentTarget.value)})} class="slider" />
                        <div class="slider-label"><span>Body A: vY</span> <span>{vA().y}</span></div>
                        <input type="range" min="-50" max="50" value={vA().y} onInput={e => setVA({...vA(), y: parseInt(e.currentTarget.value)})} class="slider" />
                        <div class="slider-label"><span>Body A: ω</span> <span>{vA().w.toFixed(1)}</span></div>
                        <input type="range" min="-2" max="2" step="0.1" value={vA().w} onInput={e => setVA({...vA(), w: parseFloat(e.currentTarget.value)})} class="slider" />
                    </div>

                    <div style={{ background: '#111', padding: '10px', "border-radius": '6px', "border-left": '4px solid #f87171' }}>
                        <div class="slider-label"><span>Body B: vX</span> <span>{vB().x}</span></div>
                        <input type="range" min="-50" max="50" value={vB().x} onInput={e => setVB({...vB(), x: parseInt(e.currentTarget.value)})} class="slider" />
                        <div class="slider-label"><span>Body B: vY</span> <span>{vB().y}</span></div>
                        <input type="range" min="-50" max="50" value={vB().y} onInput={e => setVB({...vB(), y: parseInt(e.currentTarget.value)})} class="slider" />
                        <div class="slider-label"><span>Body B: ω</span> <span>{vB().w.toFixed(1)}</span></div>
                        <input type="range" min="-2" max="2" step="0.1" value={vB().w} onInput={e => setVB({...vB(), w: parseFloat(e.currentTarget.value)})} class="slider" />
                    </div>

                    <button onClick={resetVelocities} class="demo-btn">Reset Velocities</button>

                    <div style={{ background: '#0a0a0a', padding: '12px', "border-radius": '6px', border: '1px solid #333', "font-family": 'monospace', "font-size": '0.85rem' }}>
                        <div style={{ color: '#aaa', "margin-bottom": '8px' }}>Jacobian Matrix (J):</div>
                        {jacobian().map((row) => (
                            <div style={{ display: 'flex', "justify-content": 'space-between', color: '#fbbf24', "margin-bottom": '4px' }}>
                                {row.map((val) => <span style={{ width: '40px', "text-align": 'right' }}>{val}</span>)}
                            </div>
                        ))}
                    </div>

                    <div style={{ 
                        padding: '10px', 
                        "border-radius": '6px', 
                        "text-align": 'center', 
                        "font-weight": 'bold',
                        "font-size": '0.9rem',
                        background: (Math.abs(cDot().x) > 0.1 || Math.abs(cDot().y) > 0.1) ? 'rgba(127, 29, 29, 0.4)' : 'rgba(6, 78, 59, 0.4)',
                        color: (Math.abs(cDot().x) > 0.1 || Math.abs(cDot().y) > 0.1) ? '#f87171' : '#34d399',
                        border: `1px solid ${(Math.abs(cDot().x) > 0.1 || Math.abs(cDot().y) > 0.1) ? '#f87171' : '#34d399'}`
                    }}>
                        {(Math.abs(cDot().x) > 0.1 || Math.abs(cDot().y) > 0.1) ? `JOINT BREAKING!\nC_dot = [${cDot().x.toFixed(1)}, ${cDot().y.toFixed(1)}]` : 'JOINT STABLE'}
                    </div>
                </div>
            </div>

            <style>{`
                .slider-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; margin-bottom: 2px; }
                .slider { width: 100%; height: 4px; border-radius: 2px; -webkit-appearance: none; background: #333; outline: none; margin-bottom: 10px; }
                .slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #3b82f6; cursor: pointer; }
                .demo-btn { background: #444; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600; font-size: 0.85rem; font-family: inherit; }
                .demo-btn:hover { background: #555; }
            `}</style>
        </div>
    );
}
