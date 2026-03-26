import { createSignal, onMount, onCleanup } from 'solid-js';

class RigidBody {
    id: string;
    y: number;
    invMass: number;
    color: string;

    constructor(id: string, startY: number, mass: number, color: string) {
        this.id = id;
        this.y = startY;
        this.invMass = mass === 0 ? 0 : 1 / mass;
        this.color = color;
    }
}

class PenetrationConstraint {
    name: string;
    topBody: RigidBody;
    bottomBody: RigidBody;
    targetDistance: number;

    constructor(name: string, top: RigidBody, bottom: RigidBody, targetDist: number) {
        this.name = name;
        this.topBody = top;
        this.bottomBody = bottom;
        this.targetDistance = targetDist;
    }

    getError() {
        return Math.max(0, this.targetDistance - (this.bottomBody.y - this.topBody.y));
    }

    solve() {
        const err = this.getError();
        if (err <= 0.01) return;
        const totalInvMass = this.topBody.invMass + this.bottomBody.invMass;
        if (totalInvMass === 0) return;

        this.topBody.y -= err * (this.topBody.invMass / totalInvMass);
        this.bottomBody.y += err * (this.bottomBody.invMass / totalInvMass);
    }
}

export default function JacobianIterativeDemo() {
    let canvasRef: HTMLCanvasElement | undefined;
    const [c1Error, setC1Error] = createSignal(0);
    const [c2Error, setC2Error] = createSignal(0);
    const [isAutoSolving, setIsAutoSolving] = createSignal(false);

    let ground: RigidBody;
    let bodyB: RigidBody;
    let bodyA: RigidBody;
    let c1: PenetrationConstraint;
    let c2: PenetrationConstraint;

    const initSim = () => {
        ground = new RigidBody("Ground", 400, 0, "#333");
        bodyB = new RigidBody("Body B", 350, 10, "#c084fc");
        bodyA = new RigidBody("Body A", 300, 10, "#60a5fa");
        c1 = new PenetrationConstraint("C1", bodyB, ground, 100);
        c2 = new PenetrationConstraint("C2", bodyA, bodyB, 100);
        resetSim();
    };

    const resetSim = () => {
        ground.y = 400;
        bodyB.y = 350;
        bodyA.y = 280;
        updateUI();
        draw();
    };

    const updateUI = () => {
        setC1Error(c1.getError());
        setC2Error(c2.getError());
    };

    const draw = () => {
        const canvas = canvasRef;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Ground
        ctx.fillStyle = ground.color;
        ctx.fillRect(0, ground.y - 50, canvas.width, 200);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.moveTo(0, ground.y - 50);
        ctx.lineTo(canvas.width, ground.y - 50);
        ctx.stroke();

        const drawBox = (y: number, color: string, name: string) => {
            const x = canvas.width / 2;
            ctx.fillStyle = color;
            ctx.fillRect(x - 60, y - 50, 120, 100);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 60, y - 50, 120, 100);

            ctx.fillStyle = "#fff";
            ctx.font = 'bold 16px "JetBrains Mono", monospace';
            ctx.textAlign = "center";
            ctx.fillText(name, x, y + 6);
        };

        drawBox(bodyA.y, bodyA.color, bodyA.id);
        drawBox(bodyB.y, bodyB.color, bodyB.id);
    };

    onMount(() => {
        initSim();
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

    const solveC1 = () => {
        c1.solve();
        updateUI();
        draw();
    };

    const solveC2 = () => {
        c2.solve();
        updateUI();
        draw();
    };

    const autoSolve = async () => {
        if (isAutoSolving()) return;
        setIsAutoSolving(true);
        for (let i = 0; i < 10; i++) {
            c1.solve();
            updateUI();
            draw();
            await new Promise(r => setTimeout(r, 100));
            c2.solve();
            updateUI();
            draw();
            await new Promise(r => setTimeout(r, 100));
        }
        setIsAutoSolving(false);
    };

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
                <div style={{ flex: 1, "min-width": '300px', height: '400px', background: '#111', "border-radius": '8px', border: '1px solid #333', overflow: 'hidden' }}>
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
                </div>

                <div style={{ width: '300px', display: 'flex', "flex-direction": 'column', gap: '15px' }}>
                    <h3 style={{ margin: 0, "font-size": '1.1rem' }}>Iterative Solver (PGS)</h3>
                    <p style={{ "font-size": '0.85rem', color: '#aaa', margin: 0 }}>
                        Solving one constraint typically breaks others. We iterate to find stability.
                    </p>

                    <button onClick={solveC1} disabled={isAutoSolving()} class="demo-btn">Solve C1 (Ground-B)</button>
                    <button onClick={solveC2} disabled={isAutoSolving()} class="demo-btn">Solve C2 (B-A)</button>
                    <button onClick={autoSolve} disabled={isAutoSolving()} class="demo-btn primary" style={{ background: '#10b981' }}>
                        {isAutoSolving() ? 'Solving...' : 'Auto-Solve (10 Iter)'}
                    </button>
                    <button onClick={resetSim} disabled={isAutoSolving()} class="demo-btn danger" style={{ background: '#ef4444', "margin-top": '10px' }}>Reset Errors</button>

                    <div style={{ background: '#111', padding: '12px', "border-radius": '6px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', "justify-content": 'space-between', "font-size": '0.8rem', color: '#aaa', "margin-bottom": '5px' }}>
                            <span>C2 Error (B-A):</span>
                            <span>{c2Error().toFixed(1)}px</span>
                        </div>
                        <div style={{ height: '10px', background: '#333', "border-radius": '5px', overflow: 'hidden' }}>
                            <div style={{ 
                                height: '100%', 
                                background: c2Error() < 0.1 ? '#10b981' : '#ef4444', 
                                width: `${Math.min(100, c2Error() * 1.5)}%`,
                                transition: 'width 0.2s, background 0.2s'
                            }} />
                        </div>
                    </div>

                    <div style={{ background: '#111', padding: '12px', "border-radius": '6px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', "justify-content": 'space-between', "font-size": '0.8rem', color: '#aaa', "margin-bottom": '5px' }}>
                            <span>C1 Error (Ground-B):</span>
                            <span>{c1Error().toFixed(1)}px</span>
                        </div>
                        <div style={{ height: '10px', background: '#333', "border-radius": '5px', overflow: 'hidden' }}>
                            <div style={{ 
                                height: '100%', 
                                background: c1Error() < 0.1 ? '#10b981' : '#ef4444', 
                                width: `${Math.min(100, c1Error() * 1.5)}%`,
                                transition: 'width 0.2s, background 0.2s'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .demo-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    font-family: inherit;
                    transition: all 0.2s;
                    width: 100%;
                }
                .demo-btn:hover:not(:disabled) {
                    filter: brightness(1.2);
                    transform: translateY(-1px);
                }
                .demo-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .demo-btn.primary { background: #10b981 !important; }
                .demo-btn.danger { background: #ef4444 !important; }
            `}</style>
        </div>
    );
}
