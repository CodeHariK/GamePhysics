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

        // Linear
        const accelX = body.force.x * body.invMass;
        const accelY = body.force.y * body.invMass;

        body.position.x += body.velocity.x * dt;
        body.position.y += body.velocity.y * dt;
        body.velocity.x += accelX * dt;
        body.velocity.y += accelY * dt;

        // Angular
        const alpha = body.torque * body.invInertia;
        body.rotation += body.angularVelocity * dt;
        body.angularVelocity += alpha * dt;
    }

    /**
     * 2. Semi-Implicit (Symplectic) Euler - Velocity Phase
     * Only updates velocities based on forces.
     */
    public static integrateVelocities(body: Body, dt: number): void {
        if (body.isStatic) return;

        const accelX = body.force.x * body.invMass;
        const accelY = body.force.y * body.invMass;
        const alpha = body.torque * body.invInertia;

        body.velocity.x += accelX * dt;
        body.velocity.y += accelY * dt;
        body.angularVelocity += alpha * dt;

        // Apply damping (v = v * (1 - dt * damping))
        // High-quality damping should be independent of frame rate
        const linDamping = Math.max(0, 1.0 - dt * body.linearDamping);
        const angDamping = Math.max(0, 1.0 - dt * body.angularDamping);
        
        body.velocity.x *= linDamping;
        body.velocity.y *= linDamping;
        body.angularVelocity *= angDamping;
    }

    /**
     * 2. Semi-Implicit (Symplectic) Euler - Position Phase
     * Only updates positions based on CURRENT velocities.
     */
    public static integratePositions(body: Body, dt: number): void {
        if (body.isStatic) return;

        body.position.x += body.velocity.x * dt;
        body.position.y += body.velocity.y * dt;
        body.rotation += body.angularVelocity * dt;
        body.updateTransform();
    }

    /**
     * Deprecated: Original single-step semi-implicit Euler.
     */
    public static semiImplicitEuler(body: Body, dt: number): void {
        this.integrateVelocities(body, dt);
        this.integratePositions(body, dt);
    }

    /**
     * 3. Backward (Implicit) Euler - Iterative Approximation
     */
    public static implicitEuler(body: Body, dt: number, calculateForces: (pos: Vector2) => Vector2): void {
        if (body.isStatic) return;

        // Step A: Guess the future position
        const guessX = body.position.x + body.velocity.x * dt;
        const guessY = body.position.y + body.velocity.y * dt;
        const guessedPosition = new Vector2(guessX, guessY);

        // Linear Step B/C
        const futureForce = calculateForces(guessedPosition);
        const futureAccelX = futureForce.x * body.invMass;
        const futureAccelY = futureForce.y * body.invMass;

        body.velocity.x += futureAccelX * dt;
        body.velocity.y += futureAccelY * dt;
        body.position.x += body.velocity.x * dt;
        body.position.y += body.velocity.y * dt;

        // Angular (Simplified as most game engines use Symplectic for rotation anyway)
        const alpha = body.torque * body.invInertia;
        body.angularVelocity += alpha * dt;
        body.rotation += body.angularVelocity * dt;
    }

    /**
     * 4. Verlet Integration
     */
    public static verlet(body: Body, dt: number): void {
        if (body.isStatic) return;

        const accelX = body.force.x * body.invMass;
        const accelY = body.force.y * body.invMass;
        const alpha = body.torque * body.invInertia;

        // Store current state
        const tempX = body.position.x;
        const tempY = body.position.y;

        // Linear
        const dx = body.position.x - body.previousPosition.x;
        const dy = body.position.y - body.previousPosition.y;

        body.position.x += dx + accelX * (dt * dt);
        body.position.y += dy + accelY * (dt * dt);

        body.previousPosition.x = tempX;
        body.previousPosition.y = tempY;

        body.velocity.x = dx / dt;
        body.velocity.y = dy / dt;

        // Angular (Rough approximation for Verlet rotation)
        // Note: For extreme accuracy, you'd store previousRotation, but most use angularVelocity directly for Verlet Rigid Bodies.
        body.angularVelocity += alpha * dt;
        body.rotation += body.angularVelocity * dt;
    }

    /**
     * 5. Runge-Kutta 4 (RK4)
     */
    public static rk4(body: Body, dt: number, calculateAcceleration: (pos: Vector2, vel: Vector2) => Vector2): void {
        if (body.isStatic) return;

        const pos = body.position;
        const vel = body.velocity;

        // --- Sample 1 ---
        const v1 = vel;
        const a1 = calculateAcceleration(pos, v1);

        // --- Sample 2 ---
        const p2 = new Vector2(pos.x + v1.x * dt * 0.5, pos.y + v1.y * dt * 0.5);
        const v2 = new Vector2(vel.x + a1.x * dt * 0.5, vel.y + a1.y * dt * 0.5);
        const a2 = calculateAcceleration(p2, v2);

        // --- Sample 3 ---
        const p3 = new Vector2(pos.x + v2.x * dt * 0.5, pos.y + v2.y * dt * 0.5);
        const v3 = new Vector2(vel.x + a2.x * dt * 0.5, vel.y + a2.y * dt * 0.5);
        const a3 = calculateAcceleration(p3, v3);

        // --- Sample 4 ---
        const p4 = new Vector2(pos.x + v3.x * dt, pos.y + v3.y * dt);
        const v4 = new Vector2(vel.x + a3.x * dt, vel.y + a3.y * dt);
        const a4 = calculateAcceleration(p4, v4);

        // Update Linear
        body.velocity.x += (dt / 6.0) * (a1.x + 2 * a2.x + 2 * a3.x + a4.x);
        body.velocity.y += (dt / 6.0) * (a1.y + 2 * a2.y + 2 * a3.y + a4.y);
        body.position.x += (dt / 6.0) * (v1.x + 2 * v2.x + 2 * v3.x + v4.x);
        body.position.y += (dt / 6.0) * (v1.y + 2 * v2.y + 2 * v3.y + v4.y);

        // Update Angular (Simplified RK4 for rotation)
        const alpha = body.torque * body.invInertia;
        body.angularVelocity += alpha * dt;
        body.rotation += body.angularVelocity * dt;
    }
}
