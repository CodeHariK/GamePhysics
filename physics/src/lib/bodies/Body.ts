import { AABB } from "../collision/AABB";
import { Vector2 } from "../math/Vector2";
import { Shape, PolygonShape } from "../collision/Shape";

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
    public linearDamping: number = 0.2;
    public angularDamping: number = 0.2;

    public readonly isStatic: boolean;
    public color?: string;

    // --- Collision Filtering ---
    public collisionMask: number = 0xFFFFFF;
    public collisionMaskIgnore: number = 0x000000;

    // --- Collision Data ---
    public aabb: AABB = new AABB(0, 0, 0, 0);
    private _shapes: Shape[] = [];
    private _worldVertices: Vector2[] = [];

    public get shapes(): Shape[] {
        return this._shapes;
    }

    public set shapes(s: Shape[]) {
        this._shapes = s;
        for (let i = 0; i < s.length; i++) {
            s[i].id = i;
        }
        this.updateAABB();
    }

    /**
     * Backward compatibility: returns the world vertices of the first polygon shape.
     */
    public get vertices(): Vector2[] {
        return this._worldVertices;
    }

    /**
     * Backward compatibility: returns the local vertices of the first polygon shape.
     */
    public get localVertices(): Vector2[] {
        for (const shape of this.shapes) {
            if (shape instanceof PolygonShape) {
                return shape.localVertices;
            }
        }
        return [];
    }

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

        this.shapes = []; // ensure it initializes properly if needed

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
     * Sets the local vertices and initializes a single PolygonShape.
     * Maintained for backward compatibility with existing demos.
     */
    public setVertices(vertices: Vector2[]): void {
        const shape = new PolygonShape(vertices);
        shape.id = 0;
        this.shapes = [shape];
        this._worldVertices = vertices.map(v => v.clone());
        this.updateAABB();
    }

    /**
     * Updates the AABB and caches world vertices for the first polygon shape.
     */
    public updateTransform(): void {
        // Cache world vertices for the first polygon shape (for backward compatibility)
        for (const shape of this.shapes) {
            if (shape instanceof PolygonShape) {
                const local = shape.localVertices;
                if (this._worldVertices.length !== local.length) {
                    this._worldVertices = local.map(v => v.clone());
                }
                const cos = Math.cos(this.rotation);
                const sin = Math.sin(this.rotation);
                for (let i = 0; i < local.length; i++) {
                    const lv = local[i];
                    const wv = this._worldVertices[i];
                    wv.x = this.position.x + (lv.x * cos - lv.y * sin);
                    wv.y = this.position.y + (lv.x * sin + lv.y * cos);
                }
                break;
            }
        }
        this.updateAABB();
    }

    /**
     * Updates the AABB based on current world shapes.
     */
    public updateAABB(): void {
        if (this.shapes.length === 0) {
            this.aabb.min.set(this.position.x - 1, this.position.y - 1);
            this.aabb.max.set(this.position.x + 1, this.position.y + 1);
            return;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const shape of this.shapes) {
            const shapeAABB = shape.getAABB(this.position, this.rotation);
            if (shapeAABB.min.x < minX) minX = shapeAABB.min.x;
            if (shapeAABB.min.y < minY) minY = shapeAABB.min.y;
            if (shapeAABB.max.x > maxX) maxX = shapeAABB.max.x;
            if (shapeAABB.max.y > maxY) maxY = shapeAABB.max.y;
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

    /**
     * Integrates position and rotation by the current velocity and dt.
     */
    public step(dt: number): void {
        if (this.isStatic) return;
        this.rotation += this.angularVelocity * dt;
        this.position.add(this.velocity.clone().mult(dt));
    }

    /**
     * Applies a world-space impulse to a world-space point on the body.
     */
    public applyImpulse(impulse: Vector2, worldPoint: Vector2): void {
        const r = Vector2.sub(worldPoint, this.position, new Vector2());
        const angularImpulse = r.cross(impulse);

        this.velocity.add(impulse.clone().mult(this.invMass));
        this.angularVelocity += this.invInertia * angularImpulse;
    }

    /**
     * Converts a point from world space to this body's local space.
     */
    public worldToLocal(worldPoint: Vector2): Vector2 {
        const dx = worldPoint.x - this.position.x;
        const dy = worldPoint.y - this.position.y;
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        return new Vector2(
            dx * cos - dy * sin,
            dx * sin + dy * cos
        );
    }

    /**
     * Converts a point from this body's local space to world space.
     */
    public localToWorld(localPoint: Vector2): Vector2 {
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        return new Vector2(
            this.position.x + (localPoint.x * cos - localPoint.y * sin),
            this.position.y + (localPoint.x * sin + localPoint.y * cos)
        );
    }

    /**
     * Checks if a world space point is inside logic.
     */
    public containsPoint(p: Vector2): boolean {
        if (!this.aabb.containsPoint(p)) return false;
        return this.shapes.some(shape => shape.containsPoint(this.position, this.rotation, p));
    }

    /**
     * Helper to create vertices for a box of given width/height centered at origin.
     */
    public static createBoxVertices(width: number, height: number): Vector2[] {
        const hw = width / 2;
        const hh = height / 2;
        return [
            new Vector2(-hw, -hh),
            new Vector2(hw, -hh),
            new Vector2(hw, hh),
            new Vector2(-hw, hh),
        ];
    }
}
