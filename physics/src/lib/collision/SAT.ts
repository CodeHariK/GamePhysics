import { Vector2 } from '../math/Vector2';

/**
 * The Contact Manifold contains all the data needed to resolve a collision.
 */
export interface CollisionManifold {
    isColliding: boolean;
    depth: number;       // How deep are they intersecting?
    normal: Vector2;     // The direction to push Body A away from Body B
    contacts: Vector2[]; // The specific points of contact
    normalImpulses?: number[]; // Accumulated normal impulse per contact
    tangentImpulses?: number[]; // Accumulated friction impulse per contact
}

export class SAT {

    /**
     * Tests if two convex polygons are colliding.
     * @param verticesA Array of vertices in world space for Polygon A
     * @param verticesB Array of vertices in world space for Polygon B
     */
    public static testPolygons(verticesA: Vector2[], verticesB: Vector2[]): CollisionManifold {
        let normal = new Vector2(0, 0);
        let depth = Infinity;

        // We must test the edge normals of BOTH polygons
        for (let i = 0; i < verticesA.length + verticesB.length; i++) {

            // 1. Get the current edge
            let edgeStart: Vector2, edgeEnd: Vector2;

            if (i < verticesA.length) {
                edgeStart = verticesA[i];
                edgeEnd = verticesA[(i + 1) % verticesA.length];
            } else {
                const bIndex = i - verticesA.length;
                edgeStart = verticesB[bIndex];
                edgeEnd = verticesB[(bIndex + 1) % verticesB.length];
            }

            // 2. Calculate the perpendicular axis (the Normal of the edge)
            const edge = new Vector2();
            Vector2.sub(edgeEnd, edgeStart, edge);

            // The 2D trick for a perpendicular vector: (-y, x)
            const axis = new Vector2(-edge.y, edge.x).normalize();

            // 3. Project BOTH polygons onto this axis to get their "shadows" (min and max)
            const { min: minA, max: maxA } = this.projectVertices(verticesA, axis);
            const { min: minB, max: maxB } = this.projectVertices(verticesB, axis);

            // 4. Check for a gap. If there's a gap, they are NOT colliding.
            if (minA >= maxB || minB >= maxA) {
                return { isColliding: false, depth: 0, normal: new Vector2(0, 0), contacts: [] };
            }

            // 5. If they overlap, calculate the penetration depth on this axis
            const axisDepth = Math.min(maxB - minA, maxA - minB);

            // 6. We want the MINIMUM penetration depth out of all axes.
            // The axis with the smallest overlap is the axis they collided on!
            if (axisDepth < depth) {
                depth = axisDepth;
                normal.copy(axis);
            }
        }

        // --- Post-Processing: Direction Correction ---
        // We need to ensure the normal always points from Polygon A to Polygon B.
        // We find the center of both polygons and check the dot product against the normal.
        const centerA = this.getCenter(verticesA);
        const centerB = this.getCenter(verticesB);
        const dir = new Vector2();
        Vector2.sub(centerB, centerA, dir);

        if (dir.dot(normal) < 0) {
            // The normal is facing the wrong way, flip it!
            normal.mult(-1);
        }

        // 7. If we made it through all axes without finding a gap, it's a collision!
        const contacts = this.findContactPoints(verticesA, verticesB);
        return { isColliding: true, depth, normal, contacts };
    }

    /**
     * Finds the points of contact between two polygons.
     * This is essential for calculating rotation (torque).
     */
    private static findContactPoints(verticesA: Vector2[], verticesB: Vector2[]): Vector2[] {
        const contacts: Vector2[] = [];

        // Simplified Contact Point Detection:
        // We look for vertices of B that are inside A, and vice versa.
        // For a more robust engine, you'd use "Clip Edges" logic to find the intersection manifold.

        const checkPoints = (source: Vector2[], target: Vector2[]) => {
            for (const v of source) {
                if (this.isPointInPoly(v, target)) {
                    contacts.push(v.clone());
                }
            }
        };

        checkPoints(verticesA, verticesB);
        checkPoints(verticesB, verticesA);

        // If no vertices are inside, we fall back to the closest point or the centers
        // (This can happen with very thin shapes or edge-on-edge collisions)
        if (contacts.length === 0) {
            const centerA = this.getCenter(verticesA);
            const centerB = this.getCenter(verticesB);
            contacts.push(centerA.add(centerB).mult(0.5));
        }

        return contacts;
    }

    /**
     * Helper: Ray-casting algorithm to check if a point is inside a polygon.
     */
    public static isPointInPoly(p: Vector2, poly: Vector2[]): boolean {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;

            const intersect = ((yi > p.y) !== (yj > p.y))
                && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Helper: Projects an array of vertices onto an axis and returns the 1D min/max.
     */
    public static projectVertices(vertices: Vector2[], axis: Vector2): { min: number, max: number } {
        let min = Infinity;
        let max = -Infinity;

        for (let i = 0; i < vertices.length; i++) {
            // The dot product gives us the projection length
            const projection = vertices[i].dot(axis);
            if (projection < min) min = projection;
            if (projection > max) max = projection;
        }

        return { min, max };
    }

    /**
     * Helper: Finds the arithmetic center of a polygon.
     */
    public static getCenter(vertices: Vector2[]): Vector2 {
        let sumX = 0;
        let sumY = 0;
        for (let v of vertices) {
            sumX += v.x;
            sumY += v.y;
        }
        return new Vector2(sumX / vertices.length, sumY / vertices.length);
    }
}
