import { World } from './World';

export class Engine {
    public world: World;
    public hz: number = 120; // Physics frequency in Hz
    public timeScale: number = 1.0;
    private lastTime: number = 0;
    private animationId: number | null = null;
    private running: boolean = false;
    private accumulator: number = 0;
    private onUpdateCallback?: (dt: number) => void;

    constructor(world: World) {
        this.world = world;
    }

    public start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    public stop(): void {
        this.running = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    public onUpdate(callback: (dt: number) => void): void {
        this.onUpdateCallback = callback;
    }

    private loop = (currentTime: number): void => {
        if (!this.running) return;

        // Calculate delta time in seconds
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Apply time scale to the progression of real time
        const scaledDt = dt * this.timeScale;

        // Fixed physics step (user configurable, default 120Hz)
        const fixedDt = 1 / this.hz;
        
        // Counter "Spiral of Death": clamp the dt to a reasonable max (e.g. 0.25s)
        const frameTime = Math.min(scaledDt, 0.25);
        this.accumulator += frameTime;

        // Consume accumulator in fixed steps
        while (this.accumulator >= fixedDt) {
            this.world.step(fixedDt);
            this.accumulator -= fixedDt;
        }

        // Optional user callback (rendering/UI)
        if (this.onUpdateCallback) {
            this.onUpdateCallback(frameTime);
        }

        this.animationId = requestAnimationFrame(this.loop);
    };
}
