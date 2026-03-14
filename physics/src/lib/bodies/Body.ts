import { AABB } from "../collision/AABB";
import { Vector2 } from "../math/Vector2";

/**
 * Represents a 2D rigid body in the physics simulation.
 */
export class Body {
    private static nextId = 0;

    public readonly id: number;

    // --- State (Where is it, and how is it rotated?) ---
    public position: Vector2;
    public previousPosition: Vector2;
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

    // --- Collision Data ---
    public aabb: AABB;
    public localVertices: Vector2[] = [];
    public vertices: Vector2[] = []; // World vertices

    constructor(
        x: number,
        y: number,
        mass: number,
        inertia: number,
        isStatic: boolean = false
    ) {
        this.id = Body.nextId++;
        this.position = new Vector2(x, y);
        this.previousPosition = new Vector2(x, y);
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

        // Initialize AABB
        this.aabb = new AABB(x - 1, y - 1, x + 1, y + 1);
    }

    /**
     * Sets the local vertices and initializes world vertices.
     */
    public setVertices(vertices: Vector2[]): void {
        this.localVertices = vertices;
        this.vertices = vertices.map(v => v.clone());
        this.updateTransform();
    }

    /**
     * Transforms local vertices to world space based on position and rotation.
     */
    public updateTransform(): void {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        for (let i = 0; i < this.localVertices.length; i++) {
            const lv = this.localVertices[i];
            const wv = this.vertices[i];

            // Rotate
            const rx = lv.x * cos - lv.y * sin;
            const ry = lv.x * sin + lv.y * cos;

            // Translate
            wv.x = this.position.x + rx;
            wv.y = this.position.y + ry;
        }
        
        this.updateAABB();
    }

    /**
     * Updates the AABB based on current world vertices.
     */
    public updateAABB(): void {
        if (this.vertices.length === 0) {
            // Default AABB around position if no vertices
            this.aabb.min.set(this.position.x - 1, this.position.y - 1);
            this.aabb.max.set(this.position.x + 1, this.position.y + 1);
            return;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const v of this.vertices) {
            if (v.x < minX) minX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.x > maxX) maxX = v.x;
            if (v.y > maxY) maxY = v.y;
        }

        this.aabb.min.set(minX, minY);
        this.aabb.max.set(maxX, maxY);
    }

    /**
     * Applies a force to the center of mass.
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
