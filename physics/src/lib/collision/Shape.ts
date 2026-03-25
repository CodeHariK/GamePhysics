import { Vector2 } from "../math/Vector2";
import { AABB } from "./AABB";

export const ShapeType = {
    CIRCLE: 0,
    POLYGON: 1
} as const;

export type ShapeType = typeof ShapeType[keyof typeof ShapeType];

/**
 * Base class for all physical shapes.
 */
export abstract class Shape {
    public abstract readonly type: ShapeType;
    public id: number = 0;

    /**
     * Projects the shape onto an axis and returns the min/max projection values.
     */
    public abstract project(pos: Vector2, rot: number, axis: Vector2): { min: number, max: number };

    /**
     * Returns the AABB of the shape in world space.
     */
    public abstract getAABB(pos: Vector2, rot: number): AABB;

    /**
     * Checks if a world space point is inside the shape.
     */
    public abstract containsPoint(pos: Vector2, rot: number, p: Vector2): boolean;

    /**
     * Checks if a local space point is inside the shape.
     */
    public abstract containsLocalPoint(p: Vector2): boolean;
}

/**
 * A circular shape defined by a radius and an optional local offset.
 */
export class CircleShape extends Shape {
    public readonly type = ShapeType.CIRCLE;
    public radius: number;
    public offset: Vector2;

    constructor(radius: number, offset: Vector2 = new Vector2(0, 0)) {
        super();
        this.radius = radius;
        this.offset = offset;
    }

    public project(pos: Vector2, rot: number, axis: Vector2): { min: number; max: number } {
        const worldCenter = this.getWorldCenter(pos, rot);
        const projection = worldCenter.dot(axis);
        return {
            min: projection - this.radius,
            max: projection + this.radius
        };
    }

    public getAABB(pos: Vector2, rot: number): AABB {
        const center = this.getWorldCenter(pos, rot);
        return new AABB(
            center.x - this.radius,
            center.y - this.radius,
            center.x + this.radius,
            center.y + this.radius
        );
    }

    public containsLocalPoint(p: Vector2): boolean {
        return Vector2.sub(p, this.offset, new Vector2()).lengthSq() <= this.radius * this.radius;
    }

    public containsPoint(pos: Vector2, rot: number, p: Vector2): boolean {
        const center = this.getWorldCenter(pos, rot);
        const distSq = Vector2.sub(p, center, new Vector2()).lengthSq();
        return distSq <= this.radius * this.radius;
    }

    private getWorldCenter(pos: Vector2, rot: number): Vector2 {
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const rx = this.offset.x * cos - this.offset.y * sin;
        const ry = this.offset.x * sin + this.offset.y * cos;
        return new Vector2(pos.x + rx, pos.y + ry);
    }
}

/**
 * A convex polygon shape defined by a set of local vertices.
 */
export class PolygonShape extends Shape {
    public readonly type = ShapeType.POLYGON;
    public localVertices: Vector2[];
    public readonly normals: Vector2[] = [];

    constructor(localVertices: Vector2[]) {
        super();
        this.localVertices = localVertices;
        this.computeNormals();
    }

    private computeNormals(): void {
        for (let i = 0; i < this.localVertices.length; i++) {
            const p1 = this.localVertices[i];
            const p2 = this.localVertices[(i + 1) % this.localVertices.length];
            const edge = Vector2.sub(p2, p1, new Vector2());
            // Outward normal for CCW winding: (dy, -dx)
            this.normals.push(new Vector2(edge.y, -edge.x).normalize());
        }
    }

    public project(pos: Vector2, rot: number, axis: Vector2): { min: number; max: number } {
        let min = Infinity;
        let max = -Infinity;

        const cos = Math.cos(rot);
        const sin = Math.sin(rot);

        for (const v of this.localVertices) {
            // Transform to world space
            const rx = v.x * cos - v.y * sin;
            const ry = v.x * sin + v.y * cos;
            const wx = pos.x + rx;
            const wy = pos.y + ry;

            const p = wx * axis.x + wy * axis.y;
            if (p < min) min = p;
            if (p > max) max = p;
        }

        return { min, max };
    }

    public getAABB(pos: Vector2, rot: number): AABB {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        const cos = Math.cos(rot);
        const sin = Math.sin(rot);

        for (const v of this.localVertices) {
            const rx = v.x * cos - v.y * sin;
            const ry = v.x * sin + v.y * cos;
            const wx = pos.x + rx;
            const wy = pos.y + ry;

            if (wx < minX) minX = wx;
            if (wy < minY) minY = wy;
            if (wx > maxX) maxX = wx;
            if (wy > maxY) maxY = wy;
        }

        return new AABB(minX, minY, maxX, maxY);
    }

    public containsLocalPoint(p: Vector2): boolean {
        for (let i = 0; i < this.normals.length; i++) {
            const edgeToPoint = Vector2.sub(p, this.localVertices[i], new Vector2());
            if (this.normals[i].dot(edgeToPoint) > 0) return false;
        }
        return true;
    }

    public containsPoint(pos: Vector2, rot: number, p: Vector2): boolean {
        // Transform p to local space
        const dx = p.x - pos.x;
        const dy = p.y - pos.y;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;

        let inside = false;
        for (let i = 0, j = this.localVertices.length - 1; i < this.localVertices.length; j = i++) {
            const xi = this.localVertices[i].x, yi = this.localVertices[i].y;
            const xj = this.localVertices[j].x, yj = this.localVertices[j].y;

            const intersect = ((yi > ly) !== (yj > ly))
                && (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
