import type { Vector2 } from "../math/vector2";

/**
 * Represents a 2D rigid body in the physics simulation.
 */
export class Body {
    // --- State (Where is it, and how is it rotated?) ---
    public position: Vector2;
    public rotation: number; // Stored in radians

    // --- Kinematics (How fast is it moving/spinning?) ---
    public velocity: Vector2;
    public angularVelocity: number;

    // --- Dynamics (What forces are currently pushing it?) ---
    public force: Vector2;
    public torque: number;

    // --- Physical Properties ---
    public readonly mass: number;
    public readonly invMass: number;
    public readonly inertia: number; // Rotational Mass
    public readonly invInertia: number;

    // --- Material Properties ---
    public friction: number;
    public restitution: number; // "Bounciness" (0 = lead ball, 1 = super bouncy)

    public readonly isStatic: boolean;

    constructor(
        x: number,
        y: number,
        mass: number,
        inertia: number,
        isStatic: boolean = false
    ) {
        this.position = new Vector2(x, y);
        this.rotation = 0;

        this.velocity = new Vector2(0, 0);
        this.angularVelocity = 0;

        this.force = new Vector2(0, 0);
        this.torque = 0;

        this.isStatic = isStatic;

        // The "Inverse Mass Trick" for static objects
        if (this.isStatic) {
            this.mass = 0;
            this.invMass = 0;
            this.inertia = 0;
            this.invInertia = 0;
        } else {
            this.mass = mass;
            this.invMass = mass > 0 ? 1 / mass : 0;
            this.inertia = inertia;
            this.invInertia = inertia > 0 ? 1 / inertia : 0;
        }

        // Sensible default materials
        this.friction = 0.2;
        this.restitution = 0.5;
    }

    /**
     * Applies a force to the center of mass.
     * Note how we use our optimized Vector2.add() to prevent GC spikes!
     */
    public addForce(f: Vector2): void {
        this.force.add(f);
    }

    /**
     * Resets forces and torque to zero. 
     * This must be called at the end of every physics step.
     */
    public clearForces(): void {
        this.force.set(0, 0);
        this.torque = 0;
    }
}
