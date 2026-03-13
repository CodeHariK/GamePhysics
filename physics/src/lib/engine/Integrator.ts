import { Vector2 } from '../math/Vector2';
import { Body } from '../bodies/Body';

/**
 * A utility class containing different numerical integration methods
 * to advance rigid bodies through time.
 */
export class Integrator {

    /**
     * 1. Forward (Explicit) Euler
     * Calculates position using CURRENT velocity. 
     * Danger: Injects energy into the system over time. Explodes springs.
     */
    public static explicitEuler(body: Body, dt: number): void {
        if (body.isStatic) return;

        // a = F / m
        const accelX = body.force.x * body.invMass;
        const accelY = body.force.y * body.invMass;

        // Position uses current velocity
        body.position.x += body.velocity.x * dt;
        body.position.y += body.velocity.y * dt;

        // Velocity uses current acceleration
        body.velocity.x += accelX * dt;
        body.velocity.y += accelY * dt;
    }

    /**
     * 2. Semi-Implicit (Symplectic) Euler
     * Calculates velocity first, then uses NEW velocity for position.
     * The Industry Standard for game physics. Perfectly stable energy.
     */
    public static semiImplicitEuler(body: Body, dt: number): void {
        if (body.isStatic) return;

        const accelX = body.force.x * body.invMass;
        const accelY = body.force.y * body.invMass;

        // Update velocity FIRST
        body.velocity.x += accelX * dt;
        body.velocity.y += accelY * dt;

        // Update position using the NEW velocity
        body.position.x += body.velocity.x * dt;
        body.position.y += body.velocity.y * dt;
    }

    /**
     * 3. Backward (Implicit) Euler - Iterative Approximation
     * True Implicit Euler requires solving a matrix equation (Jacobian) because 
     * future forces depend on future positions. For a basic engine, we approximate 
     * this by taking a "guess" step, calculating the force there, and correcting.
     * Danger: Will artificially slow objects down (damping).
     */
    public static implicitEuler(body: Body, dt: number, calculateForces: (pos: Vector2) => Vector2): void {
        if (body.isStatic) return;

        // Step A: Guess the future position (using Explicit Euler)
        const guessX = body.position.x + body.velocity.x * dt;
        const guessY = body.position.y + body.velocity.y * dt;
        const guessedPosition = new Vector2(guessX, guessY);

        // Step B: Ask the engine what the forces WILL be at that future position
        const futureForce = calculateForces(guessedPosition);
        const futureAccelX = futureForce.x * body.invMass;
        const futureAccelY = futureForce.y * body.invMass;

        // Step C: Apply the future acceleration to our current state
        body.velocity.x += futureAccelX * dt;
        body.velocity.y += futureAccelY * dt;
        body.position.x += body.velocity.x * dt;
        body.position.y += body.velocity.y * dt;
    }

    /**
     * 4. Verlet Integration
     * Does not use velocity directly. Calculates it implicitly by looking
     * at the difference between the current frame and the last frame.
     * Excellent for constraints, ropes, and ragdolls.
     */
    public static verlet(body: Body, dt: number): void {
        if (body.isStatic) return;

        const accelX = body.force.x * body.invMass;
        const accelY = body.force.y * body.invMass;

        // Store current position before modifying it
        const tempX = body.position.x;
        const tempY = body.position.y;

        // pos = pos + (pos - prevPos) + a * dt^2
        // Note: Make sure body.previousPosition is initialized to body.position on creation!
        const dx = body.position.x - body.previousPosition.x;
        const dy = body.position.y - body.previousPosition.y;

        body.position.x += dx + accelX * (dt * dt);
        body.position.y += dy + accelY * (dt * dt);

        // Current position becomes the previous position for the next frame
        body.previousPosition.x = tempX;
        body.previousPosition.y = tempY;

        // (Optional) Update explicit velocity so other systems can read it
        body.velocity.x = dx / dt;
        body.velocity.y = dy / dt;
    }

    /**
     * 5. Runge-Kutta 4 (RK4)
     * Takes 4 samples across the time step to perfectly calculate curves.
     * Requires a callback to recalculate world forces at intermediate steps.
     * Incredible accuracy, but far too slow for real-time collisions.
     */
    public static rk4(body: Body, dt: number, calculateAcceleration: (pos: Vector2, vel: Vector2) => Vector2): void {
        if (body.isStatic) return;

        const pos = body.position;
        const vel = body.velocity;

        // --- Sample 1: Start of frame ---
        const v1 = vel;
        const a1 = calculateAcceleration(pos, v1);

        // --- Sample 2: Halfway through frame (using sample 1) ---
        const p2 = new Vector2(pos.x + v1.x * dt * 0.5, pos.y + v1.y * dt * 0.5);
        const v2 = new Vector2(vel.x + a1.x * dt * 0.5, vel.y + a1.y * dt * 0.5);
        const a2 = calculateAcceleration(p2, v2);

        // --- Sample 3: Halfway through frame (using sample 2) ---
        const p3 = new Vector2(pos.x + v2.x * dt * 0.5, pos.y + v2.y * dt * 0.5);
        const v3 = new Vector2(vel.x + a2.x * dt * 0.5, vel.y + a2.y * dt * 0.5);
        const a3 = calculateAcceleration(p3, v3);

        // --- Sample 4: End of frame (using sample 3) ---
        const p4 = new Vector2(pos.x + v3.x * dt, pos.y + v3.y * dt);
        const v4 = new Vector2(vel.x + a3.x * dt, vel.y + a3.y * dt);
        const a4 = calculateAcceleration(p4, v4);

        // --- Final Weighted Average ---
        // Velocity update
        body.velocity.x += (dt / 6.0) * (a1.x + 2 * a2.x + 2 * a3.x + a4.x);
        body.velocity.y += (dt / 6.0) * (a1.y + 2 * a2.y + 2 * a3.y + a4.y);

        // Position update
        body.position.x += (dt / 6.0) * (v1.x + 2 * v2.x + 2 * v3.x + v4.x);
        body.position.y += (dt / 6.0) * (v1.y + 2 * v2.y + 2 * v3.y + v4.y);
    }
}
