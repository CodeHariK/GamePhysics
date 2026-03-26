import { Vector2 } from '../math/Vector2';
import { Body } from '../bodies/Body';
import { CircleShape, PolygonShape, CapsuleShape } from './Shape';
import { ContactConstraint } from '../constraints/ContactConstraint';
import { SLOP_LINEAR } from '../constraints/Constraint';

export class CollisionHelper {
    public static shouldCollide(objA: Body, objB: Body): boolean {
        if (objA.isStatic && objB.isStatic) return false;
        if ((objA.collisionMask & objB.collisionMask) === 0) return false;
        if ((objA.collisionMaskIgnore & objB.collisionMask) === objB.collisionMask) return false;
        if ((objB.collisionMaskIgnore & objA.collisionMask) === objA.collisionMask) return false;
        return true;
    }

    public static projectVerts(verts: Vector2[], axis: Vector2): [number, number] {
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < verts.length; i++) {
            const p = verts[i].dot(axis);
            if (p < min) min = p;
            if (p > max) max = p;
        }
        return [min, max];
    }

    public static clipLineSegmentToLine(p1: Vector2, p2: Vector2, normal: Vector2, offset: Vector2): Vector2[] {
        let clippedPoints: Vector2[] = [];
        const distance0 = Vector2.sub(p1, offset, new Vector2()).dot(normal);
        const distance1 = Vector2.sub(p2, offset, new Vector2()).dot(normal);
        
        if (distance0 <= 0) clippedPoints.push(p1.clone());
        if (distance1 <= 0) clippedPoints.push(p2.clone());
        
        if (Math.sign(distance0) !== Math.sign(distance1) && clippedPoints.length < 2) {
            const pctAcross = distance1 / (distance1 - distance0);
            const intersectionPt = p2.clone().add(Vector2.sub(p1, p2, new Vector2()).mult(pctAcross));
            clippedPoints.push(intersectionPt);
        }
        return clippedPoints;
    }

    public static handleCollisions(objects: Body[], contactConstraintsForReuse: ContactConstraint[] = []): ContactConstraint[] {
        const newContacts: ContactConstraint[] = [];

        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                const bodyA = objects[i];
                const bodyB = objects[j];
                const results = CollisionHelper.checkCollision(bodyA, bodyB, contactConstraintsForReuse);
                for (let k = 0; k < results.length; k++) {
                    newContacts.push(results[k]);
                }
            }
        }

        return newContacts;
    }

    public static checkCollision(objA: Body, objB: Body, contactConstraintsForReuse: ContactConstraint[] = []): ContactConstraint[] {
        if (!this.shouldCollide(objA, objB)) return [];
        objA.updateAABB(); 
        objB.updateAABB();
        if (!objA.aabb.overlaps(objB.aabb)) return [];

        const contactConstraints: ContactConstraint[] = [];

        for (let idxA = 0; idxA < objA.shapes.length; idxA++) {
            const shapeA = objA.shapes[idxA];
            for (let idxB = 0; idxB < objB.shapes.length; idxB++) {
                const shapeB = objB.shapes[idxB];

                let collision: any = {};
                let clippedResult: { points: Vector2[], featureIds: number[] } = { points: [], featureIds: [] };

                if (shapeA instanceof CircleShape && shapeB instanceof CircleShape) {
                    collision = this.circleToCircleSAT(objA, shapeA, objB, shapeB);
                } else if (shapeA instanceof CircleShape && shapeB instanceof PolygonShape) {
                    collision = this.circleToPolySAT(objA, shapeA, objB, shapeB);
                } else if (shapeA instanceof PolygonShape && shapeB instanceof CircleShape) {
                    collision = this.circleToPolySAT(objB, shapeB, objA, shapeA);
                    if (collision.normal) collision.normal.mult(-1);
                } else if (shapeA instanceof CircleShape && shapeB instanceof CapsuleShape) {
                    collision = this.capsuleToCircleSAT(objB, shapeB, objA, shapeA);
                    if (collision.normal) collision.normal.mult(-1);
                } else if (shapeA instanceof CapsuleShape && shapeB instanceof CircleShape) {
                    collision = this.capsuleToCircleSAT(objA, shapeA, objB, shapeB);
                } else {
                    collision = this.polyToPolySAT(objA, shapeA as PolygonShape, objB, shapeB as PolygonShape);
                }

                if (!collision.normal) continue;
                
                if (collision.normal.dot(Vector2.sub(objB.position, objA.position, new Vector2())) < 0) {
                    collision.normal.mult(-1);
                }

                if (shapeA instanceof CircleShape && shapeB instanceof CircleShape) {
                    clippedResult = this.clipCircleToCircle(objA, shapeA, objB, shapeB, collision);
                } else if (shapeA instanceof CircleShape && shapeB instanceof PolygonShape) {
                    clippedResult = this.clipCircleToPoly(objA, shapeA, objB, shapeB, collision);
                } else if (shapeA instanceof PolygonShape && shapeB instanceof CircleShape) {
                    clippedResult = this.clipCircleToPoly(objB, shapeB, objA, shapeA, collision);
                } else if (shapeA instanceof CircleShape && shapeB instanceof CapsuleShape) {
                    clippedResult = this.clipCapsuleToCircle(objB, shapeB, objA, shapeA, collision);
                } else if (shapeA instanceof CapsuleShape && shapeB instanceof CircleShape) {
                    clippedResult = this.clipCapsuleToCircle(objA, shapeA, objB, shapeB, collision);
                } else {
                    if (collision.referenceIsA) {
                        clippedResult = this.clipPolyToPoly(objA, shapeA as PolygonShape, objB, shapeB as PolygonShape, collision);
                    } else {
                        clippedResult = this.clipPolyToPoly(objB, shapeB as PolygonShape, objA, shapeA as PolygonShape, collision);
                    }
                }

                for (let ptIdx = 0; ptIdx < clippedResult.points.length; ptIdx++) {
                    const wp = clippedResult.points[ptIdx];
                    const featureId = clippedResult.featureIds[ptIdx];
                    
                    let reusedConstraint: ContactConstraint | null = null;
                    for (let k = 0; k < contactConstraintsForReuse.length; k++) {
                        const oldContact = contactConstraintsForReuse[k];
                        if (oldContact.bodyA === objA && oldContact.bodyB === objB && oldContact.featureId === featureId) {
                            reusedConstraint = oldContact;
                            contactConstraintsForReuse.splice(k, 1);
                            break;
                        }
                    }
                    
                    if (reusedConstraint) {
                        reusedConstraint.isReused = true;
                        reusedConstraint.setCollisionData(wp, collision.normal, collision.penetration);
                        contactConstraints.push(reusedConstraint);
                    } else {
                        contactConstraints.push(new ContactConstraint(objA, objB, wp, collision.normal, collision.penetration, featureId));
                    }
                }
            }
        }

        return contactConstraints;
    }

    public static polyToPolySAT(objA: Body, shapeA: PolygonShape, objB: Body, shapeB: PolygonShape): any {
        const vertsA = shapeA.localVertices.map(v => objA.localToWorld(v));
        const vertsB = shapeB.localVertices.map(v => objB.localToWorld(v));
        
        const normalsA = this.getNormals(vertsA);
        const normalsB = this.getNormals(vertsB);

        let minSepA = -Infinity, minEdgeA = 0;
        let minSepB = -Infinity, minEdgeB = 0;

        for (let i = 0; i < normalsA.length; i++) {
            const [minA, maxA] = this.projectVerts(vertsA, normalsA[i]);
            const [minB, maxB] = this.projectVerts(vertsB, normalsA[i]);
            if (minA > maxB || minB > maxA) return {};
            const sep = minB - maxA;
            if (sep > minSepA) { minSepA = sep; minEdgeA = i; }
        }

        for (let i = 0; i < normalsB.length; i++) {
            const [minA, maxA] = this.projectVerts(vertsA, normalsB[i]);
            const [minB, maxB] = this.projectVerts(vertsB, normalsB[i]);
            if (minA > maxB || minB > maxA) return {};
            const sep = minA - maxB;
            if (sep > minSepB) { minSepB = sep; minEdgeB = i; }
        }

        let referenceIsA = true;
        let referenceEdgeIndex = minEdgeA;
        let normal = normalsA[referenceEdgeIndex];
        const FACE_SWITCH_TOL = 1e-4;
        
        if (minSepB > minSepA + FACE_SWITCH_TOL) {
            referenceIsA = false;
            referenceEdgeIndex = minEdgeB;
            normal = normalsB[referenceEdgeIndex];
        }

        return { normal: normal.clone(), penetration: referenceIsA ? -minSepA : -minSepB, referenceIsA, referenceEdgeIndex };
    }

    public static circleToPolySAT(objA: Body, shapeA: CircleShape, objB: Body, shapeB: PolygonShape): any {
        const circlePos = objA.localToWorld(shapeA.offset);
        const verts = shapeB.localVertices.map(v => objB.localToWorld(v));
        let minPen = Infinity;
        let normal: Vector2 | null = null;
        const normals = this.getNormals(verts);

        for (const n of normals) {
            const [minA, maxA] = this.projectVerts(verts, n);
            const minB = circlePos.dot(n) - shapeA.radius;
            const maxB = circlePos.dot(n) + shapeA.radius;
            
            if (minA > maxB || minB > maxA) return {};

            const pen = Math.min(maxA, maxB) - Math.max(minA, minB);
            if (pen < minPen) {
                minPen = pen;
                normal = n;
            }
        }

        let closestVert = verts[0];
        let minDist = Math.sqrt(Vector2.sub(closestVert, circlePos, new Vector2()).lengthSq());
        for (const v of verts) {
            const d = Math.sqrt(Vector2.sub(v, circlePos, new Vector2()).lengthSq());
            if (d < minDist) { closestVert = v; minDist = d; }
        }
        
        const axisObj = Vector2.sub(closestVert, circlePos, new Vector2());
        if (axisObj.lengthSq() === 0) return {};
        const axis = axisObj.normalize();
        
        const [minA, maxA] = this.projectVerts(verts, axis);
        const cProj = circlePos.dot(axis);
        const minB = cProj - shapeA.radius;
        const maxB = cProj + shapeA.radius;
        
        if (minA > maxB || minB > maxA) return {};

        const pen = Math.min(maxA, maxB) - Math.max(minA, minB);
        if (pen < minPen) {
            minPen = pen;
            normal = axis;
        }

        return { normal: normal!.clone(), penetration: minPen };
    }

    public static circleToCircleSAT(objA: Body, shapeA: CircleShape, objB: Body, shapeB: CircleShape): any {
        const worldA = objA.localToWorld(shapeA.offset);
        const worldB = objB.localToWorld(shapeB.offset);
        const d = Vector2.sub(worldB, worldA, new Vector2());
        const distSq = d.lengthSq();
        const total = shapeA.radius + shapeB.radius;
        
        if (distSq > total * total || distSq === 0) return {};
        
        const dist = Math.sqrt(distSq);
        return { normal: d.mult(1 / dist), penetration: total - dist };
    }

    public static clipPolyToPoly(refObj: Body, refShape: PolygonShape, incObj: Body, incShape: PolygonShape, collision: any): any {
        const refVerts = refShape.localVertices.map(v => refObj.localToWorld(v));
        const incVerts = incShape.localVertices.map(v => incObj.localToWorld(v));
        const refNormals = this.getNormals(refVerts);
        const incNormals = this.getNormals(incVerts);

        const a1 = refVerts[collision.referenceEdgeIndex];
        const a2 = refVerts[(collision.referenceEdgeIndex + 1) % refVerts.length];
        const n = refNormals[collision.referenceEdgeIndex];

        let lowestDot = Infinity;
        let incidentIndex = 0;
        for (let i = 0; i < incNormals.length; i++) {
            const d = n.dot(incNormals[i]);
            if (d < lowestDot) { lowestDot = d; incidentIndex = i; }
        }
        
        let b2 = incVerts[incidentIndex];
        let b1 = incVerts[(incidentIndex + 1) % incVerts.length];

        const refTangent = Vector2.sub(a2, a1, new Vector2()).normalize();
        let clippedPoints = this.clipLineSegmentToLine(b1, b2, refTangent.clone().mult(-1), a1);
        if (clippedPoints.length === 0) return { points: [], featureIds: [] };
        clippedPoints = this.clipLineSegmentToLine(clippedPoints[0], clippedPoints[1], refTangent, a2);

        const finalPoints = clippedPoints.filter(v => n.dot(Vector2.sub(v, a1, new Vector2())) <= SLOP_LINEAR);
        
        const i11 = collision.referenceEdgeIndex;
        const i12 = (i11 + 1) % refVerts.length;
        const i21 = (incidentIndex + 1) % incVerts.length;
        const i22 = incidentIndex;
        
        const prefix = ((refObj.id & 0xFF) << 24) | ((incObj.id & 0xFF) << 16) | ((refShape.id & 0xF) << 12) | ((incShape.id & 0xF) << 8);
        
        const featureIds = finalPoints.map((_, idx) => {
            const vertexBits = idx === 0 ? ((i11 & 0xF) << 4) | (i22 & 0xF) : ((i12 & 0xF) << 4) | (i21 & 0xF);
            return prefix | vertexBits;
        });
        
        return { points: finalPoints, featureIds };
    }

    public static clipCircleToPoly(objA: Body, shapeA: CircleShape, objB: Body, shapeB: PolygonShape, collision: any): any {
        const circleCenter = objA.localToWorld(shapeA.offset);
        const dirToPoly = Vector2.sub(objB.position, circleCenter, new Vector2());
        const sign = Math.sign(collision.normal.dot(dirToPoly)) || 1;
        const point = circleCenter.clone().add(collision.normal.clone().mult(shapeA.radius * sign));
        
        const featureId = ((objA.id & 0xFF) << 24) | ((objB.id & 0xFF) << 16) | ((shapeA.id & 0xFF) << 8) | (shapeB.id & 0xFF);
        return { points: [point], featureIds: [featureId] };
    }

    public static clipCircleToCircle(objA: Body, shapeA: CircleShape, objB: Body, shapeB: CircleShape, collision: any): any {
        const worldCenterA = objA.localToWorld(shapeA.offset);
        const point = worldCenterA.clone().add(collision.normal.clone().mult(shapeA.radius));
        const featureId = ((objA.id & 0xFF) << 24) | ((objB.id & 0xFF) << 16) | ((shapeA.id & 0xFF) << 8) | (shapeB.id & 0xFF);
        return { points: [point], featureIds: [featureId] };
    }

    public static capsuleToCircleSAT(objA: Body, shapeA: CapsuleShape, objB: Body, shapeB: CircleShape): any {
        const wp1 = objA.localToWorld(shapeA.p1);
        const wp2 = objA.localToWorld(shapeA.p2);
        const circlePos = objB.localToWorld(shapeB.offset);

        // Closest point on segment
        const ab = Vector2.sub(wp2, wp1, new Vector2());
        let t = ab.dot(ab);
        let closest: Vector2;
        if (t === 0) {
            closest = wp1.clone();
        } else {
            const ap = Vector2.sub(circlePos, wp1, new Vector2());
            t = Math.max(0, Math.min(1, ap.dot(ab) / t));
            closest = wp1.clone().add(ab.mult(t));
        }

        const d = Vector2.sub(circlePos, closest, new Vector2());
        const distSq = d.lengthSq();
        const totalRadius = shapeA.radius + shapeB.radius;

        if (distSq > totalRadius * totalRadius) return {};

        if (distSq === 0) {
            return { normal: new Vector2(0, 1), penetration: totalRadius };
        }

        const dist = Math.sqrt(distSq);
        return { normal: d.mult(1 / dist), penetration: totalRadius - dist };
    }

    public static clipCapsuleToCircle(objA: Body, shapeA: CapsuleShape, objB: Body, shapeB: CircleShape, collision: any): any {
        // Contact point is along the normal from the circle center
        const circleCenter = objB.localToWorld(shapeB.offset);
        const point = circleCenter.clone().add(collision.normal.clone().mult(-shapeB.radius));
        
        const featureId = ((objA.id & 0xFF) << 24) | ((objB.id & 0xFF) << 16) | ((shapeA.id & 0xFF) << 8) | (shapeB.id & 0xFF);
        return { points: [point], featureIds: [featureId] };
    }

    public static getNormals(verts: Vector2[]): Vector2[] {
        return verts.map((v, i) => Vector2.sub(verts[(i + 1) % verts.length], v, new Vector2()).rotate90CW().normalize());
    }
}
