import { createSignal, onMount, onCleanup } from 'solid-js';

export default function LagrangeMultiplier2D() {
    let canvasRef: HTMLCanvasElement | undefined;
    const [point, setPoint] = createSignal({ x: 1, y: 4 });
    const [isDragging, setIsDragging] = createSignal(false);
    const [isOptimal, setIsOptimal] = createSignal(false);
    const [lambdaValue, setLambdaValue] = createSignal<number | null>(null);

    const scale = 40;
    let width = 0;
    let height = 0;
    let origin = { x: 0, y: 0 };

    const toScreen = (mathX: number, mathY: number) => ({
        x: origin.x + mathX * scale,
        y: origin.y - mathY * scale
    });

    const toMath = (screenX: number, screenY: number) => ({
        x: (screenX - origin.x) / scale,
        y: (origin.y - screenY) / scale
    });

    const drawArrow = (ctx: CanvasRenderingContext2D, fromMath: { x: number, y: number }, vecMath: { x: number, y: number }, color: string, scaleFactor = 1) => {
        const to = toScreen(fromMath.x + vecMath.x * scaleFactor, fromMath.y + vecMath.y * scaleFactor);
        const from = toScreen(fromMath.x, fromMath.y);
        const headlen = 10;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.fill();
    };

    const render = () => {
        if (!canvasRef) return;
        const ctx = canvasRef.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        // 1. Draw Contours for f(x,y) = x^2 + y^2
        ctx.lineWidth = 1;
        for (let r = 1; r <= 12; r++) {
            const radiusScreen = r * scale;
            ctx.beginPath();
            ctx.arc(origin.x, origin.y, radiusScreen, 0, Math.PI * 2);
            
            const currentR = Math.hypot(point().x, point().y);
            if (Math.abs(r - currentR) < 0.2) {
                ctx.strokeStyle = '#60a5fa';
                ctx.globalAlpha = 0.6;
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = '#333';
                ctx.globalAlpha = 1;
                ctx.lineWidth = 1;
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // 2. Draw Constraint Line g(x,y) = x + y = 5
        const lineStart = toScreen(-5, 10);
        const lineEnd = toScreen(10, -5);
        ctx.beginPath(); 
        ctx.strokeStyle = '#3b82f6'; 
        ctx.lineWidth = 3;
        ctx.moveTo(lineStart.x, lineStart.y); 
        ctx.lineTo(lineEnd.x, lineEnd.y); 
        ctx.stroke();

        // 3. Math Calculations
        const { x, y } = point();
        const gradF = { x: 2 * x, y: 2 * y };
        const gradG = { x: 1, y: 1 };

        const cross = Math.abs(gradF.x * gradG.y - gradF.y * gradG.x);
        const optimal = cross < 0.15;
        setIsOptimal(optimal);
        setLambdaValue(optimal ? gradF.x / gradG.x : null);

        // 4. Draw Vectors
        drawArrow(ctx, point(), gradF, '#fbbf24', 0.25);
        drawArrow(ctx, point(), gradG, '#22c55e', 1.5);

        // 5. Draw Draggable Point
        const pScreen = toScreen(x, y);
        ctx.beginPath(); 
        ctx.fillStyle = optimal ? '#34d399' : '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = optimal ? '#34d399' : 'rgba(255,255,255,0.5)';
        ctx.arc(pScreen.x, pScreen.y, 8, 0, Math.PI * 2); 
        ctx.fill();
        ctx.shadowBlur = 0;
    };

    onMount(() => {
        if (!canvasRef) return;
        const resize = () => {
            if (!canvasRef) return;
            width = canvasRef.parentElement?.clientWidth || 800;
            height = canvasRef.parentElement?.clientHeight || 400;
            canvasRef.width = width;
            canvasRef.height = height;
            origin = { x: width / 2 - 50, y: height / 2 + 50 };
            render();
        };

        window.addEventListener('resize', resize);
        resize();

        const handleMouseDown = (e: MouseEvent) => {
            if (!canvasRef) return;
            const rect = canvasRef.getBoundingClientRect();
            const mouse = toMath(e.clientX - rect.left, e.clientY - rect.top);
            if (Math.hypot(mouse.x - point().x, mouse.y - point().y) < 0.8) {
                setIsDragging(true);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging()) return;
            if (!canvasRef) return;
            const rect = canvasRef.getBoundingClientRect();
            const mouse = toMath(e.clientX - rect.left, e.clientY - rect.top);

            const nx = (mouse.x - mouse.y + 5) / 2;
            const ny = 5 - nx;
            setPoint({ x: nx, y: ny });
            render();
        };

        const handleMouseUp = () => setIsDragging(false);

        canvasRef.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        onCleanup(() => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        });
    });

    return (
        <div class="lagrange-2d-container" style="display: flex; gap: 20px; background: #1a1a1a; padding: 20px; border-radius: 12px; border: 1px solid #333;">
            <div style="flex: 1; height: 400px; background: #000; border-radius: 8px; overflow: hidden; position: relative; cursor: grab;">
                <canvas ref={canvasRef} style="width: 100%; height: 100%;" />
                <div style="position: absolute; bottom: 10px; left: 10px; color: #666; font-size: 12px; pointer-events: none;">
                    Drag point along the blue constraint line
                </div>
            </div>

            <div style="width: 280px; display: flex; flex-direction: column; gap: 15px;">
                <div class={`status-box ${isOptimal() ? 'found' : 'searching'}`} style={{
                    padding: '12px',
                    'border-radius': '6px',
                    'text-align': 'center',
                    'font-weight': 'bold',
                    background: isOptimal() ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    border: `1px solid ${isOptimal() ? '#34d399' : '#fbbf24'}`,
                    color: isOptimal() ? '#34d399' : '#fbbf24'
                }}>
                    {isOptimal() ? 'Optimum Found!' : 'Searching...'}
                </div>

                <div class="data-group" style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="background: #111; padding: 12px; border-radius: 6px; border: 1px solid #333;">
                        <span style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">Position (x, y)</span>
                        <div style={{ color: isOptimal() ? '#34d399' : '#60a5fa', 'font-family': 'monospace' }}>
                            ({point().x.toFixed(2)}, {point().y.toFixed(2)})
                        </div>
                    </div>

                    <div style="background: #111; padding: 12px; border-radius: 6px; border: 1px solid #333;">
                        <span style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">Altitude f(x,y)</span>
                        <div style="color: #60a5fa; font-family: monospace;">
                            {(point().x ** 2 + point().y ** 2).toFixed(2)}
                        </div>
                    </div>

                    <div style="background: #111; padding: 12px; border-radius: 6px; border: 1px solid #333;">
                        <span style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">Gradients</span>
                        <div style="color: #fbbf24; font-family: monospace; font-size: 13px;">
                            ∇f: [{(2 * point().x).toFixed(2)}, {(2 * point().y).toFixed(2)}]
                        </div>
                        <div style="color: #22c55e; font-family: monospace; font-size: 13px;">
                            ∇g: [1.00, 1.00]
                        </div>
                    </div>

                    <div style="background: #111; padding: 12px; border-radius: 6px; border: 1px solid #333;">
                        <span style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">Multiplier (λ)</span>
                        <div style={{ color: isOptimal() ? '#34d399' : '#444', 'font-family': 'monospace' }}>
                            {isOptimal() ? lambdaValue()?.toFixed(2) : '--'}
                        </div>
                    </div>
                </div>

                <div class="legend" style="font-size: 11px; color: #888; display: flex; flex-direction: column; gap: 5px; margin-top: auto; padding-top: 15px; border-top: 1px solid #333;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 10px; height: 10px; background: #fbbf24; border-radius: 2px;" /> ∇f (Mountain Gradient)
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 10px; height: 10px; background: #22c55e; border-radius: 2px;" /> ∇g (Fence Normal)
                    </div>
                </div>
            </div>
        </div>
    );
}
