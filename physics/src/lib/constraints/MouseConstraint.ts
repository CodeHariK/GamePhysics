import { Vector2 } from '../math/Vector2';
import { Body } from '../bodies/Body';
import { Constraint, type ConstraintSettings, getSoftConstraintParams } from './Constraint';

/**
 * A constraint that pulls a specific point on a body towards a target world position.
 * Useful for mouse interaction or dragging objects.
 */
export class MouseConstraint extends Constraint {
    public localPoint: Vector2;
    public target: Vector2;

    private r: Vector2 = new Vector2(0, 0);
    private K: number[][] = [[0, 0], [0, 0]];
    private accumulatedImpulse: Vector2 = new Vector2(0, 0);

    // Solver parameters
    public hertz: number = 4.0; // Lower hertz for "rubbery" mouse dragging
    public dampingRatio: number = 1.0; // Critically damped

    constructor(body: Body, worldPoint: Vector2) {
        super(body, body);
        this.localPoint = body.worldToLocal(worldPoint);
        this.target = worldPoint.clone();
    }

    /**
     * Updates the target position of the mouse constraint.
     */
    public setTarget(newTarget: Vector2): void {
        this.target.copy(newTarget);
    }

    public update(settings: ConstraintSettings): void {
        const worldPoint = this.bodyA.localToWorld(this.localPoint);
        this.r.copy(worldPoint).sub(this.bodyA.position);

        // Pre-compute K
        const m = this.bodyA.invMass;
        const i = this.bodyA.invInertia;
        this.K[0][0] = m + this.r.y * this.r.y * i;
        this.K[0][1] = -this.r.y * this.r.x * i;
        this.K[1][0] = this.K[0][1];
        this.K[1][1] = m + this.r.x * this.r.x * i;

        const cs = this.constraintSettings || settings;
        if (cs && cs.warmStarting !== false) {
            this.applyImpulse(this.accumulatedImpulse);
        }
    }

    private applyImpulse(impulse: Vector2): void {
        const m = this.bodyA.invMass;
        const i = this.bodyA.invInertia;

        this.bodyA.velocity.x += impulse.x * m;
        this.bodyA.velocity.y += impulse.y * m;
        this.bodyA.angularVelocity += i * this.r.cross(impulse);
    }

    public solve(dt: number, settings: ConstraintSettings): void {
        const cs = this.constraintSettings || settings;
        const worldPoint = this.bodyA.localToWorld(this.localPoint);
        
        // Velocity at point
        const v = new Vector2(-this.bodyA.angularVelocity * this.r.y, this.bodyA.angularVelocity * this.r.x).add(this.bodyA.velocity);

        // Bias
        const C = worldPoint.sub(this.target);
        
        let bias = new Vector2(0, 0);
        let massScale = 1.0;
        let impulseScale = 0.0;

        if (cs.mode === 'baumgarte') {
            bias = C.mult(cs.baumgarteFactor / dt);
        } else {
            const soft = getSoftConstraintParams(this.hertz, this.dampingRatio, dt);
            bias = C.mult(soft.biasRate);
            massScale = soft.massScale;
            impulseScale = soft.impulseScale;
        }

        // Solve K * impulse = -(v + bias)
        const b = v.add(bias).mult(-1);
        const det = this.K[0][0] * this.K[1][1] - this.K[0][1] * this.K[1][0];
        const invDet = det !== 0 ? 1.0 / det : 0;
        
        let impulse = new Vector2(
            invDet * (this.K[1][1] * b.x - this.K[0][1] * b.y),
            invDet * (this.K[0][0] * b.y - this.K[1][0] * b.x)
        );

        if (cs.mode === 'soft') {
            impulse.x = massScale * impulse.x - impulseScale * this.accumulatedImpulse.x;
            impulse.y = massScale * impulse.y - impulseScale * this.accumulatedImpulse.y;
        }

        this.applyImpulse(impulse);
        this.accumulatedImpulse.add(impulse);
    }
}
