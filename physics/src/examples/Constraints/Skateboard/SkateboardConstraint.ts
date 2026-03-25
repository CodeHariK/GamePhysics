import { Vector2 } from '../../../lib/math/Vector2';
import { Body } from '../../../lib/bodies/Body';
import { Constraint, type ConstraintSettings } from '../../../lib/constraints/Constraint';

export class SkateboardConstraint extends Constraint {
    public body: Body;
    public radius: number;
    public flatLength: number;
    public baseY: number;

    private leftCenter: Vector2;
    private rightCenter: Vector2;

    // Solver parameters
    private beta: number = 0.6; // Increased stabilization factor
    private slop: number = 0.01; // Allowed penetration/separation before correction

    private centerX: number;

    constructor(body: Body, radius: number, flatLength: number, baseY: number, centerX: number) {
        super(body, body);
        this.body = body;
        this.radius = radius;
        this.flatLength = flatLength;
        this.baseY = baseY;
        this.centerX = centerX;

        // In y-down, center is above the flat bottom for a bowl opening up
        this.leftCenter = new Vector2(this.centerX - this.flatLength / 2, this.baseY - this.radius);
        this.rightCenter = new Vector2(this.centerX + this.flatLength / 2, this.baseY - this.radius);
    }

    public getProjectedPoint(p: Vector2): { pos: Vector2; normal: Vector2; distance: number } {
        const r = this.radius;
        const cL = this.leftCenter;
        const cR = this.rightCenter;

        let bestPos = new Vector2();
        let bestNormal = new Vector2();
        let minDistance = Infinity;

        // --- Left Arc Candidate ---
        // Range: [PI/2, PI]
        let thetaL = Math.atan2(p.y - cL.y, p.x - cL.x);
        if (thetaL < Math.PI * 0.5) thetaL = Math.PI * 0.5;
        if (thetaL > Math.PI) thetaL = Math.PI;

        const posL = new Vector2(cL.x + r * Math.cos(thetaL), cL.y + r * Math.sin(thetaL));
        const distL = Vector2.dist(p, posL);
        if (distL < minDistance) {
            minDistance = distL;
            bestPos.copy(posL);
            // Normal points from surface TOWARDS center (upward/inward)
            bestNormal.set(cL.x - posL.x, cL.y - posL.y).normalize();
        }

        // --- Bottom Flat Candidate ---
        let xB = Math.max(this.centerX - this.flatLength / 2, Math.min(this.centerX + this.flatLength / 2, p.x));
        const posB = new Vector2(xB, this.baseY);
        const distB = Vector2.dist(p, posB);
        if (distB < minDistance) {
            minDistance = distB;
            bestPos.copy(posB);
            bestNormal.set(0, -1); // Normal is UP
        }

        // --- Right Arc Candidate ---
        // Range: [0, PI/2]
        let thetaR = Math.atan2(p.y - cR.y, p.x - cR.x);
        if (thetaR < 0) thetaR = 0;
        if (thetaR > Math.PI * 0.5) thetaR = Math.PI * 0.5;

        const posR = new Vector2(cR.x + r * Math.cos(thetaR), cR.y + r * Math.sin(thetaR));
        const distR = Vector2.dist(p, posR);
        if (distR < minDistance) {
            minDistance = distR;
            bestPos.copy(posR);
            bestNormal.set(cR.x - posR.x, cR.y - posR.y).normalize();
        }

        return { pos: bestPos, normal: bestNormal, distance: minDistance };
    }

    public getTangent(p: Vector2): Vector2 {
        const n = this.getProjectedPoint(p).normal;
        // Tangent is normal rotated 90 degrees CCW
        return new Vector2(-n.y, n.x);
    }

    public update(_settings: ConstraintSettings): void {}

    public solve(dt: number, _settings: ConstraintSettings): void {
        const p = this.body.position;
        const v = this.body.velocity;
        const projection = this.getProjectedPoint(p);

        // Use a normal that always points from the surface towards the body
        // and handle the case where p is exactly on the surface
        const normal = new Vector2();
        if (projection.distance > 0.0001) {
            normal.set(p.x - projection.pos.x, p.y - projection.pos.y).normalize();
        } else {
            // Use the surface normal if we are exactly on it
            normal.copy(projection.normal);
        }

        const vn = v.dot(normal);
        const invMass = this.body.invMass;
        if (invMass === 0) return;

        // Bias for position correction (Baumgarte)
        // distance can be used as C here because we use the 'normal' pointing to p
        const bias = (this.beta / dt) * Math.max(projection.distance - this.slop, 0);

        const lambda = -(vn + bias) / invMass;

        // Apply impulse
        this.body.velocity.x += lambda * normal.x * invMass;
        this.body.velocity.y += lambda * normal.y * invMass;
    }

    public getLeftCenter(): Vector2 { return this.leftCenter; }
    public getRightCenter(): Vector2 { return this.rightCenter; }
}
