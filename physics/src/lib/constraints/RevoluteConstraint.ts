import { Body } from "../bodies/Body";
import { Vector2 } from "../math/Vector2";
import { Constraint, type ConstraintSettings, getSoftConstraintParams, mat2x2Solve } from "./Constraint";

export class RevoluteConstraint extends Constraint {
    public localA: Vector2;
    public localB: Vector2;
    public lowerAngleLimit: number | null;
    public upperAngleLimit: number | null;
    public stiffness: number;
    public currentAngle: number = 0;
    public angleViolation: number = 0;

    public motorEnabled: boolean = false;
    public motorSpeed: number = 0;
    public maxMotorForce: number = 5;
    public motorTargetAngle: number | null = null;
    public motorFreq: number = 6.0;
    public motorDampingRatio: number = 1.0;

    public accumulatedPointImpulse: Vector2 = new Vector2(0, 0);

    // Scratch vars
    private worldA: Vector2 = new Vector2();
    private worldB: Vector2 = new Vector2();
    private rA: Vector2 = new Vector2();
    private rB: Vector2 = new Vector2();
    private K: number[][] = [[0, 0], [0, 0]];

    private invMassA: number;
    private invMassB: number;
    private invIA: number;
    private invIB: number;

    constructor(bodyA: Body, bodyB: Body, worldPoint: Vector2, lowerAngleLimit: number | null = null, upperAngleLimit: number | null = null, stiffness: number = 1.0) {
        super(bodyA, bodyB);

        this.localA = bodyA.worldToLocal(worldPoint);
        this.localB = bodyB.worldToLocal(worldPoint);

        this.lowerAngleLimit = lowerAngleLimit;
        this.upperAngleLimit = upperAngleLimit;
        this.stiffness = stiffness;

        this.invMassA = bodyA.isStatic ? 0 : bodyA.invMass;
        this.invMassB = bodyB.isStatic ? 0 : bodyB.invMass;
        this.invIA = bodyA.isStatic ? 0 : bodyA.invInertia;
        this.invIB = bodyB.isStatic ? 0 : bodyB.invInertia;
    }

    public update(constraintSettings: ConstraintSettings): void {
        this.worldA = this.bodyA.localToWorld(this.localA);
        this.worldB = this.bodyB.localToWorld(this.localB);
        this.rA = Vector2.sub(this.worldA, this.bodyA.position, new Vector2());
        this.rB = Vector2.sub(this.worldB, this.bodyB.position, new Vector2());

        this.currentAngle = this.bodyB.rotation - this.bodyA.rotation;

        this.invMassA = this.bodyA.isStatic ? 0 : this.bodyA.invMass;
        this.invMassB = this.bodyB.isStatic ? 0 : this.bodyB.invMass;
        this.invIA = this.bodyA.isStatic ? 0 : this.bodyA.invInertia;
        this.invIB = this.bodyB.isStatic ? 0 : this.bodyB.invInertia;

        const cs = this.constraintSettings || constraintSettings;
        if (cs && cs.warmStarting !== false) {
            this.bodyA.applyImpulse(this.accumulatedPointImpulse.clone().mult(-1), this.worldA);
            this.bodyB.applyImpulse(this.accumulatedPointImpulse, this.worldB);
        }

        if (this.lowerAngleLimit !== null && this.currentAngle < this.lowerAngleLimit) {
            this.angleViolation = this.currentAngle - this.lowerAngleLimit;
        } else if (this.upperAngleLimit !== null && this.currentAngle > this.upperAngleLimit) {
            this.angleViolation = this.currentAngle - this.upperAngleLimit;
        } else {
            this.angleViolation = 0;
        }
    }

    public solve(dt: number, constraintSettings: ConstraintSettings): void {
        const cs = this.constraintSettings || constraintSettings;
        this.solvePointConstraint(dt, cs);
        this.solveMotor(dt);
        this.solveAngleLimits(dt, cs);
    }

    private solvePointConstraint(dt: number, cs: ConstraintSettings): void {
        const mA = this.invMassA;
        const mB = this.invMassB;
        const iA = this.invIA;
        const iB = this.invIB;
        const rA = this.rA;
        const rB = this.rB;

        this.K[0][0] = mA + mB + rA.y * rA.y * iA + rB.y * rB.y * iB;
        this.K[0][1] = -rA.y * rA.x * iA - rB.y * rB.x * iB;
        this.K[1][0] = this.K[0][1];
        this.K[1][1] = mA + mB + rA.x * rA.x * iA + rB.x * rB.x * iB;

        const velA = this.bodyA.velocity.clone().add(rA.crossSv(this.bodyA.angularVelocity));
        const velB = this.bodyB.velocity.clone().add(rB.crossSv(this.bodyB.angularVelocity));
        const Cdot = Vector2.sub(velB, velA, new Vector2());
        const C = Vector2.sub(this.worldB, this.worldA, new Vector2());

        let bias = new Vector2(0, 0);
        let massScale = 1.0;
        let impulseScale = 0.0;

        if (cs.mode === 'baumgarte') {
            bias = C.clone().mult(cs.baumgarteFactor / dt);
        } else if (cs.mode === 'soft') {
            const maxHertz = 0.25 / dt;
            const hz = Math.min(cs.jointSoft.hertz, maxHertz);
            const soft = getSoftConstraintParams(hz, cs.jointSoft.dampingRatio, dt);
            bias = C.clone().mult(soft.biasRate);
            massScale = soft.massScale;
            impulseScale = soft.impulseScale;
        }

        let impulse = mat2x2Solve(this.K, Cdot.add(bias).mult(-1));

        if (cs.mode === 'soft') {
            impulse.x = massScale * impulse.x - impulseScale * this.accumulatedPointImpulse.x;
            impulse.y = massScale * impulse.y - impulseScale * this.accumulatedPointImpulse.y;
        }

        this.bodyA.applyImpulse(impulse.clone().mult(-1), this.worldA);
        this.bodyB.applyImpulse(impulse, this.worldB);

        if (cs && cs.warmStarting !== false) {
            this.accumulatedPointImpulse.add(impulse);
        }
    }

    private solveAngleLimits(dt: number, cs: ConstraintSettings): void {
        if ((this.lowerAngleLimit === null && this.upperAngleLimit === null) || this.angleViolation === 0) return;

        const invI = this.invIA + this.invIB;
        if (invI < 1e-6) return;

        const C = this.angleViolation;
        const Cdot = this.bodyB.angularVelocity - this.bodyA.angularVelocity;

        let bias = 0;
        let massScale = 1.0;
        let impulseScale = 0.0;

        if (cs.mode === 'baumgarte') {
            bias = (cs.baumgarteFactor / dt) * C;
        } else if (cs.mode === 'soft') {
            const maxHertz = 0.25 / dt;
            const hz = Math.min(cs.jointSoft.hertz, maxHertz);
            const soft = getSoftConstraintParams(hz, cs.jointSoft.dampingRatio, dt);
            bias = soft.biasRate * C;
            massScale = soft.massScale;
            impulseScale = soft.impulseScale;
        }

        let lambda = -(massScale * (Cdot + bias) + impulseScale * 0) / invI;

        if (C > 0) lambda = Math.min(lambda, 0);
        else lambda = Math.max(lambda, 0);

        this.bodyA.angularVelocity -= this.invIA * lambda;
        this.bodyB.angularVelocity += this.invIB * lambda;
    }

    private solveMotor(dt: number): void {
        if (!this.motorEnabled) return;

        const invI = this.invIA + this.invIB;
        if (invI === 0) return;

        let impulse = 0;
        const relVel = this.bodyB.angularVelocity - this.bodyA.angularVelocity;

        if (this.motorTargetAngle !== null) {
            const Ieff = 1 / invI;
            const omega = 2 * Math.PI * this.motorFreq;
            const k = Ieff * omega * omega;
            const c = 2 * Ieff * this.motorDampingRatio * omega;
            const gamma = 1 / (dt * (c + k * dt));
            const motorBias = (this.currentAngle - this.motorTargetAngle) * k * dt * gamma;

            impulse = -(relVel + motorBias) / (invI + gamma);
        } else {
            impulse = (this.motorSpeed - relVel) / invI;
        }

        const maxImp = this.maxMotorForce * dt;
        if (impulse > maxImp) impulse = maxImp;
        if (impulse < -maxImp) impulse = -maxImp;

        this.bodyA.angularVelocity -= this.invIA * impulse;
        this.bodyB.angularVelocity += this.invIB * impulse;
    }

    public setMotorTargetAngle(targetAngle: number | null = null, maxForce: number | null = null, freq: number | null = null, dampingRatio: number | null = null, targetToWrappedClosest: boolean = true): void {
        if (targetAngle !== null && targetToWrappedClosest) {
            const angleDiffRad = (a: number, b: number) => ((a - b + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
            const delta = Math.atan2(Math.sin(targetAngle - this.currentAngle), Math.cos(targetAngle - this.currentAngle));
            targetAngle = this.currentAngle + delta;

            if (this.lowerAngleLimit !== null && this.upperAngleLimit !== null && (targetAngle < this.lowerAngleLimit || targetAngle > this.upperAngleLimit)) {
                if (Math.abs(angleDiffRad(this.lowerAngleLimit, targetAngle)) < Math.abs(angleDiffRad(this.upperAngleLimit, targetAngle))) {
                    targetAngle = this.lowerAngleLimit;
                } else {
                    targetAngle = this.upperAngleLimit;
                }
            }
            targetAngle = Math.min(Math.max(targetAngle, this.lowerAngleLimit ?? -Infinity), this.upperAngleLimit ?? Infinity);
        }

        this.motorEnabled = true;
        this.motorTargetAngle = targetAngle;
        if (maxForce !== null) this.maxMotorForce = maxForce;
        if (freq !== null) this.motorFreq = freq;
        if (dampingRatio !== null) this.motorDampingRatio = dampingRatio;
    }

    public getRotation(): number {
        return this.bodyB.rotation - this.bodyA.rotation;
    }
}
