import { Vector2 } from '../math/Vector2';

export class AABB {
    public min: Vector2; // Top-Left corner
    public max: Vector2; // Bottom-Right corner

    constructor(minX: number, minY: number, maxX: number, maxY: number) {
        this.min = new Vector2(minX, minY);
        this.max = new Vector2(maxX, maxY);
    }

    /**
     * The core Broad-Phase check.
     * Returns true if this AABB overlaps with another AABB.
     */
    public overlaps(other: AABB): boolean {
        // If one box is completely to the left, right, top, or bottom of the other, 
        // they CANNOT be overlapping. We use the inverse of this logic.
        return (
            this.min.x <= other.max.x &&
            this.max.x >= other.min.x &&
            this.min.y <= other.max.y &&
            this.max.y >= other.min.y
        );
    }

    /**
     * Checks if a point is within this AABB.
     */
    public containsPoint(p: Vector2): boolean {
        return (
            p.x >= this.min.x &&
            p.x <= this.max.x &&
            p.y >= this.min.y &&
            p.y <= this.max.y
        );
    }
}
