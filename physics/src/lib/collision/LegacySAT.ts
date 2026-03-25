import { Vector2 } from '../math/Vector2';

/**
 * The Contact Manifold contains all the data needed to resolve a collision.
 */
export interface CollisionManifold {
    isColliding: boolean;
    depth: number;       // How deep are they intersecting?
    normal: Vector2;     // The direction to push Body A away from Body B
    contacts: Vector2[]; // The specific points of contact
    normalImpulses?: number[]; 
    tangentImpulses?: number[];
}

/**
 * Standard SAT implementation with Point-in-Polygon contact detection.
 * This is the original, stable implementation used by the project demos.
 */
export class SimpleSAT {

    public static testPolygons(verticesA: Vector2[], verticesB: Vector2[]): CollisionManifold {
        let normal = new Vector2(0, 0);
        let depth = Infinity;

        // We must test the edge normals of BOTH polygons
        for (let i = 0; i < verticesA.length + verticesB.length; i++) {
            let edgeStart: Vector2, edgeEnd: Vector2;

            if (i < verticesA.length) {
                edgeStart = verticesA[i];
                edgeEnd = verticesA[(i + 1) % verticesA.length];
            } else {
                const bIndex = i - verticesA.length;
                edgeStart = verticesB[bIndex];
                edgeEnd = verticesB[(bIndex + 1) % verticesB.length];
            }

            const edge = Vector2.sub(edgeEnd, edgeStart, new Vector2());
            const axis = new Vector2(-edge.y, edge.x).normalize();

            const { min: minA, max: maxA } = SATUtils.projectVertices(verticesA, axis);
            const { min: minB, max: maxB } = SATUtils.projectVertices(verticesB, axis);

            if (minA >= maxB || minB >= maxA) {
                return { isColliding: false, depth: 0, normal: new Vector2(0, 0), contacts: [] };
            }

            const axisDepth = Math.min(maxB - minA, maxA - minB);

            if (axisDepth < depth) {
                depth = axisDepth;
                normal.copy(axis);
            }
        }

        const centerA = SATUtils.getCenter(verticesA);
        const centerB = SATUtils.getCenter(verticesB);
        const dir = Vector2.sub(centerB, centerA, new Vector2());

        if (dir.dot(normal) < 0) {
            normal.mult(-1);
        }

        const contacts = this.findContactPoints(verticesA, verticesB);
        return { isColliding: true, depth, normal, contacts };
    }

    private static findContactPoints(verticesA: Vector2[], verticesB: Vector2[]): Vector2[] {
        const contacts: Vector2[] = [];
        const checkPoints = (source: Vector2[], target: Vector2[]) => {
            for (const v of source) {
                if (SATUtils.isPointInPoly(v, target)) {
                    contacts.push(v.clone());
                }
            }
        };

        checkPoints(verticesA, verticesB);
        checkPoints(verticesB, verticesA);

        if (contacts.length === 0) {
            const centerA = SATUtils.getCenter(verticesA);
            const centerB = SATUtils.getCenter(verticesB);
            contacts.push(centerA.add(centerB).mult(0.5));
        }

        return contacts;
    }
}

/**
 * Robust SAT implementation using Sutherland-Hodgman clipping.
 * Based on Box2D Lite logic for high-stability manifolds.
 */
export class RobustSAT {
    public static testPolygons(verticesA: Vector2[], verticesB: Vector2[]): CollisionManifold {
        // Face of max separation search
        const { separation: sepA, index: indexA } = this.findMaxSeparation(verticesA, verticesB);
        if (sepA > 0) return { isColliding: false, depth: 0, normal: new Vector2(), contacts: [] };

        const { separation: sepB, index: indexB } = this.findMaxSeparation(verticesB, verticesA);
        if (sepB > 0) return { isColliding: false, depth: 0, normal: new Vector2(), contacts: [] };

        let refPoly: Vector2[], incPoly: Vector2[], refIdx: number, flip = false;
        if (sepA > sepB * 0.95 + sepA * 0.01) {
            refPoly = verticesA; incPoly = verticesB; refIdx = indexA;
        } else {
            refPoly = verticesB; incPoly = verticesA; refIdx = indexB; flip = true;
        }

        const refNormal = SATUtils.getNormal(refPoly, refIdx);
        const incIdx = this.findIncidentFace(incPoly, refNormal);
        
        const v1 = incPoly[incIdx];
        const v2 = incPoly[(incIdx + 1) % incPoly.length];

        const p1 = refPoly[refIdx];
        const p2 = refPoly[(refIdx + 1) % refPoly.length];
        const tangent = Vector2.sub(p2, p1, new Vector2()).normalize();
        
        const offset1 = tangent.dot(p1);
        const offset2 = -tangent.dot(p2);

        let clipped = SATUtils.clip(v1, v2, tangent, offset1);
        if (clipped.length < 2) return SimpleSAT.testPolygons(verticesA, verticesB); // Fallback
        clipped = SATUtils.clip(clipped[0], clipped[1], tangent.clone().mult(-1), offset2);
        if (clipped.length < 2) return SimpleSAT.testPolygons(verticesA, verticesB); // Fallback
        // Face clipping (keep only penetrating points)
        const refNormalLocal = new Vector2(tangent.y, -tangent.x); // Changed to outward normal for CW winding
        const refOffset = refNormalLocal.dot(p1);
        const contacts: Vector2[] = [];
        for (const p of clipped) {
            const depth = refNormalLocal.dot(p) - refOffset; // Renamed 'd' to 'depth'
            if (depth <= 0.1) contacts.push(p); // Small epsilon
        }

        if (contacts.length === 0) return SimpleSAT.testPolygons(verticesA, verticesB); // Fallback

        const normal = flip ? refNormalLocal.clone().mult(-1) : refNormalLocal.clone();
        const depth = Math.abs(Math.min(sepA, sepB));

        return { isColliding: true, depth, normal, contacts };
    }

    private static findMaxSeparation(poly1: Vector2[], poly2: Vector2[]): { separation: number, index: number } {
        let maxSep = -Infinity;
        let bestIdx = 0;

        for (let i = 0; i < poly1.length; i++) {
            const n = SATUtils.getNormal(poly1, i);
            const p1 = poly1[i];
            
            let minProj = Infinity;
            for (const v2 of poly2) {
                const proj = n.dot(Vector2.sub(v2, p1, new Vector2()));
                if (proj < minProj) minProj = proj;
            }

            if (minProj > maxSep) {
                maxSep = minProj;
                bestIdx = i;
            }
        }
        return { separation: maxSep, index: bestIdx };
    }

    private static findIncidentFace(poly: Vector2[], refNormal: Vector2): number {
        let minDot = Infinity;
        let bestIdx = 0;
        for (let i = 0; i < poly.length; i++) {
            const n = SATUtils.getNormal(poly, i);
            const dot = n.dot(refNormal);
            if (dot < minDot) {
                minDot = dot;
                bestIdx = i;
            }
        }
        return bestIdx;
    }
}

/**
 * Shared SAT Utilities
 */
export class SATUtils {
    public static projectVertices(vertices: Vector2[], axis: Vector2) {
        let min = Infinity, max = -Infinity;
        for (const v of vertices) {
            const p = v.dot(axis);
            if (p < min) min = p;
            if (p > max) max = p;
        }
        return { min, max };
    }

    public static getCenter(vertices: Vector2[]): Vector2 {
        let x = 0, y = 0;
        for (const v of vertices) { x += v.x; y += v.y; }
        return new Vector2(x / vertices.length, y / vertices.length);
    }

    public static isPointInPoly(p: Vector2, poly: Vector2[]): boolean {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            if (((poly[i].y > p.y) !== (poly[j].y > p.y)) && (p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)) inside = !inside;
        }
        return inside;
    }

    public static getNormal(poly: Vector2[], index: number): Vector2 {
        const p1 = poly[index];
        const p2 = poly[(index + 1) % poly.length];
        const edge = Vector2.sub(p2, p1, new Vector2());
        // For CW winding (standard in canvas), (dy, -dx) is the OUTWARD normal.
        return new Vector2(edge.y, -edge.x).normalize();
    }

    public static clip(v1: Vector2, v2: Vector2, n: Vector2, offset: number): Vector2[] {
        const out: Vector2[] = [];
        const d1 = n.dot(v1) - offset, d2 = n.dot(v2) - offset;
        if (d1 >= 0) out.push(v1);
        if (d2 >= 0) out.push(v2);
        if (d1 * d2 < 0) out.push(v1.clone().add(v2.clone().sub(v1).mult(d1 / (d1 - d2))));
        return out;
    }
}

/**
 * Main SAT Interface. 
 * Defaults to SimpleSAT for project-wide stability.
 */
export class SAT {
    public static testPolygons(verticesA: Vector2[], verticesB: Vector2[]): CollisionManifold {
        return SimpleSAT.testPolygons(verticesA, verticesB);
    }

    public static getCenter(vertices: Vector2[]): Vector2 { return SATUtils.getCenter(vertices); }
    public static projectVertices(vertices: Vector2[], axis: Vector2) { return SATUtils.projectVertices(vertices, axis); }
    public static isPointInPoly(p: Vector2, poly: Vector2[]): boolean { return SATUtils.isPointInPoly(p, poly); }
}
