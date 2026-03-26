import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';

export default function JacobianSwirlyDemo() {
    let canvasRef: HTMLCanvasElement | undefined;
    const [point, setPoint] = createSignal({ x: 150, y: 150 });
    const [isDragging, setIsDragging] = createSignal(false);

    // Transformation Parameters
    const A = 40; // Amplitude
    const B = 0.02; // Frequency (1/50)

    const transform = (x: number, y: number) => ({
        u: x + A * Math.sin(B * y),
        v: y + A * Math.sin(B * x)
    });

    const getJacobian = (x: number, y: number) => [
        [1, A * B * Math.cos(B * y)],
        [A * B * Math.cos(B * x), 1]
    ];

    const draw = () => {
        const canvas = canvasRef;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width;
        const height = canvas.height;
        const step = 20;
        const currentPoint = point();

        // 1. Draw Original Grid (Faint)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= width; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y <= height; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        // 2. Draw Transformed Grid
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
        // Vertical lines
        for (let x = 0; x <= width; x += step) {
            ctx.beginPath();
            for (let y = 0; y <= height; y += 5) {
                const { u, v } = transform(x, y);
                if (y === 0) ctx.moveTo(u, v);
                else ctx.lineTo(u, v);
            }
            ctx.stroke();
        }
        // Horizontal lines
        for (let y = 0; y <= height; y += step) {
            ctx.beginPath();
            for (let x = 0; x <= width; x += 5) {
                const { u, v } = transform(x, y);
                if (x === 0) ctx.moveTo(u, v);
                else ctx.lineTo(u, v);
            }
            ctx.stroke();
        }

        // 3. Draw local approximation at Draggable Point
        const { u, v } = transform(currentPoint.x, currentPoint.y);
        const J = getJacobian(currentPoint.x, currentPoint.y);
        
        const d = 20;
        const v1 = { x: J[0][0] * d, y: J[1][0] * d };
        const v2 = { x: J[0][1] * d, y: J[1][1] * d };

        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(u, v);
        ctx.lineTo(u + v1.x, v + v1.y);
        ctx.lineTo(u + v1.x + v2.x, v + v1.y + v2.y);
        ctx.lineTo(u + v2.x, v + v2.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        for (let x_ = currentPoint.x; x_ <= currentPoint.x + d; x_ += 2) {
            const p = transform(x_, currentPoint.y);
            if (x_ === currentPoint.x) ctx.moveTo(p.u, p.v); else ctx.lineTo(p.u, p.v);
        }
        for (let y_ = currentPoint.y; y_ <= currentPoint.y + d; y_ += 2) {
            const p = transform(currentPoint.x + d, y_);
            ctx.lineTo(p.u, p.v);
        }
        for (let x_ = currentPoint.x + d; x_ >= currentPoint.x; x_ -= 2) {
            const p = transform(x_, currentPoint.y + d);
            ctx.lineTo(p.u, p.v);
        }
        for (let y_ = currentPoint.y + d; y_ >= currentPoint.y; y_ -= 2) {
            const p = transform(currentPoint.x, y_);
            ctx.lineTo(p.u, p.v);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fff';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText("Jacobian Parallelogram", u + v1.x + 10, v + v1.y + 10);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(currentPoint.x, currentPoint.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText("Drag Me", currentPoint.x + 10, currentPoint.y - 10);
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
        point();
        draw();
    });

    const handleMouseDown = (e: MouseEvent) => {
        const rect = canvasRef?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const currentPoint = point();
        const dist = Math.sqrt((mouseX - currentPoint.x) ** 2 + (mouseY - currentPoint.y) ** 2);
        if (dist < 20) setIsDragging(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging()) return;
        const rect = canvasRef?.getBoundingClientRect();
        if (!rect) return;
        setPoint({
            x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
            y: Math.max(0, Math.min(rect.height, e.clientY - rect.top))
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div style={{
            display: 'flex',
            "flex-direction": 'column',
            gap: '15px',
            background: 'rgba(30, 30, 30, 0.5)',
            padding: '20px',
            "border-radius": '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <h3 style={{ margin: 0, "font-size": '1.1rem', color: '#60a5fa' }}>Multi-Dimensional Derivative</h3>
            <p style={{ "font-size": '0.9rem', color: '#aaa', margin: 0 }}>
                The original space is a flat grid. The transformed space (blue) is warped.
                The <b>Jacobian (yellow)</b> is the local linear approximation—the "best fit" parallelogram.
            </p>
            
            <div 
                style={{ width: '100%', height: '400px', background: '#0a0a0a', "border-radius": '8px', border: '1px solid #333', cursor: isDragging() ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
            </div>

            <div style={{ display: 'flex', gap: '20px', "font-size": '0.85rem' }}>
                <div style={{ display: 'flex', "align-items": 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#60a5fa', opacity: 0.5, "border-radius": '2px' }} />
                    <span style={{ color: '#aaa' }}>Non-linear Transformation</span>
                </div>
                <div style={{ display: 'flex', "align-items": 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#fbbf24', "border-radius": '2px' }} />
                    <span style={{ color: '#aaa' }}>Jacobian Approximation (J)</span>
                </div>
            </div>
        </div>
    );
}
