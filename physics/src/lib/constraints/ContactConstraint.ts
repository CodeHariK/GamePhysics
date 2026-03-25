import { Body } from "../bodies/Body";
import { Vector2 } from "../math/Vector2";
import { Constraint, type ConstraintSettings, SLOP_LINEAR, getSoftConstraintParams } from "./Constraint";

export class ContactConstraint extends Constraint {
    public featureId: number | null;
    public isReused: boolean = false;
    public friction: number;
    public restitution: number;
    public accumulatedNormalLambda: number = 0;
    public accumulatedFrictionLambda: number = 0;

    private invMassA: number;
    private invMassB: number;
    private invIA: number;
    private invIB: number;

    // Geometric data
    public worldPoint: Vector2 = new Vector2();
    public normal: Vector2 = new Vector2();
    public penetration: number = 0;

    public localA: Vector2 = new Vector2();
    public localB: Vector2 = new Vector2();
    public worldA: Vector2 = new Vector2();
    public worldB: Vector2 = new Vector2();
    public rA: Vector2 = new Vector2();
    public rB: Vector2 = new Vector2();
    public tangent: Vector2 = new Vector2();

    public relativeVelocity: number = 0;

    constructor(bodyA: Body, bodyB: Body, worldPoint: Vector2, normal: Vector2, penetration: number, featureId: number | null = null) {
        super(bodyA, bodyB);
        this.featureId = featureId;
        
        // Use geometric mean
        this.friction = Math.sqrt(bodyA.friction * bodyB.friction);
        this.restitution = Math.sqrt(bodyA.restitution * bodyB.restitution);

        this.invMassA = bodyA.isStatic ? 0 : bodyA.invMass;
        this.invMassB = bodyB.isStatic ? 0 : bodyB.invMass;
        this.invIA = bodyA.isStatic ? 0 : bodyA.invInertia;
        this.invIB = bodyB.isStatic ? 0 : bodyB.invInertia;

        this.setCollisionData(worldPoint, normal, penetration);

        const velA = bodyA.velocity.clone().add(this.rA.crossSv(bodyA.angularVelocity));
        const velB = bodyB.velocity.clone().add(this.rB.crossSv(bodyB.angularVelocity));
        const relVel = Vector2.sub(velB, velA, new Vector2());
        this.relativeVelocity = this.normal.dot(relVel);
    }

    public setCollisionData(worldPoint: Vector2, normal: Vector2, penetration: number): void {
        this.worldPoint = worldPoint;
        this.normal = normal;
        this.penetration = penetration;

        this.localA = this.bodyA.worldToLocal(worldPoint);
        this.localB = this.bodyB.worldToLocal(worldPoint);
        this.worldA = this.bodyA.localToWorld(this.localA);
        this.worldB = this.bodyB.localToWorld(this.localB);
        this.rA = Vector2.sub(this.worldA, this.bodyA.position, new Vector2());
        this.rB = Vector2.sub(this.worldB, this.bodyB.position, new Vector2());
        this.tangent = this.normal.rotate90CW();
    }

    public update(_constraintSettings: ConstraintSettings): void {
        this.worldA = this.bodyA.localToWorld(this.localA);
        this.worldB = this.bodyB.localToWorld(this.localB);
        this.rA = Vector2.sub(this.worldA, this.bodyA.position, new Vector2());
        this.rB = Vector2.sub(this.worldB, this.bodyB.position, new Vector2());

        this.invMassA = this.bodyA.isStatic ? 0 : this.bodyA.invMass;
        this.invMassB = this.bodyB.isStatic ? 0 : this.bodyB.invMass;
        this.invIA = this.bodyA.isStatic ? 0 : this.bodyA.invInertia;
        this.invIB = this.bodyB.isStatic ? 0 : this.bodyB.invInertia;

        const velA = this.bodyA.velocity.clone().add(this.rA.crossSv(this.bodyA.angularVelocity));
        const velB = this.bodyB.velocity.clone().add(this.rB.crossSv(this.bodyB.angularVelocity));
        const relVel = Vector2.sub(velB, velA, new Vector2());
        this.relativeVelocity = this.normal.dot(relVel);

        const normalImpulse = this.normal.clone().mult(this.accumulatedNormalLambda);
        const frictionImpulse = this.tangent.clone().mult(this.accumulatedFrictionLambda);
        const totalImpulse = normalImpulse.add(frictionImpulse);

        this.bodyA.velocity.sub(totalImpulse.clone().mult(this.invMassA));
        this.bodyA.angularVelocity -= this.invIA * this.rA.cross(totalImpulse);
        this.bodyB.velocity.add(totalImpulse.clone().mult(this.invMassB));
        this.bodyB.angularVelocity += this.invIB * this.rB.cross(totalImpulse);
    }

    public solve(dt: number, constraintSettings: ConstraintSettings): void {
        const cs = this.constraintSettings || constraintSettings;
        this.solveContact(dt, cs);
        this.solveFriction(dt, cs);
    }

    private solveContact(dt: number, cs: ConstraintSettings): void {
        const velA = this.bodyA.velocity.clone().add(this.rA.crossSv(this.bodyA.angularVelocity));
        const velB = this.bodyB.velocity.clone().add(this.rB.crossSv(this.bodyB.angularVelocity));
        const relVel = Vector2.sub(velB, velA, new Vector2());
        const Cdot = this.normal.dot(relVel);

        const rnA = this.rA.cross(this.normal);
        const rnB = this.rB.cross(this.normal);
        const effectiveMass = this.invMassA + this.invMassB + rnA * rnA * this.invIA + rnB * rnB * this.invIB;
        if (effectiveMass < 0.000001) return;

        const allowedPenetration = SLOP_LINEAR;
        let velocityBias = 0;
        let massScale = 1.0;
        let impulseScale = 0.0;

        if (cs.mode === 'baumgarte') {
            velocityBias = (cs.baumgarteFactor / dt) * Math.min(0, -this.penetration + allowedPenetration);
        } else if (cs.mode === 'soft') {
            const maxHertz = 0.25 / dt;
            const hz = Math.min(cs.contactSoft.hertz, maxHertz);
            const soft = getSoftConstraintParams(hz, cs.contactSoft.dampingRatio, dt);
            const separation = Math.min(0, -this.penetration + allowedPenetration);
            velocityBias = Math.max(soft.biasRate * separation, -cs.contactSpeed);
            massScale = soft.massScale;
            impulseScale = soft.impulseScale;
        }

        let lambda = -(massScale * Cdot + velocityBias) / effectiveMass;
        lambda += -impulseScale * this.accumulatedNormalLambda / effectiveMass;

        const oldAccum = this.accumulatedNormalLambda;
        this.accumulatedNormalLambda = Math.max(oldAccum + lambda, 0);
        lambda = this.accumulatedNormalLambda - oldAccum;

        if (lambda === 0) return;

        const impulse = this.normal.clone().mult(lambda);
        this.bodyA.applyImpulse(impulse.clone().mult(-1), this.worldA);
        this.bodyB.applyImpulse(impulse, this.worldB);
    }

    private solveFriction(_dt: number, _cs: ConstraintSettings): void {
        if (this.friction <= 0) return;

        const velA = this.bodyA.velocity.clone().add(this.rA.crossSv(this.bodyA.angularVelocity));
        const velB = this.bodyB.velocity.clone().add(this.rB.crossSv(this.bodyB.angularVelocity));
        const relVel = Vector2.sub(velB, velA, new Vector2());
        const Cdot = this.tangent.dot(relVel);

        const rtA = this.rA.cross(this.tangent);
        const rtB = this.rB.cross(this.tangent);
        const effectiveMassTangent = this.invMassA + this.invMassB + rtA * rtA * this.invIA + rtB * rtB * this.invIB;
        if (effectiveMassTangent < 0.000001) return;

        let lambda = -Cdot / effectiveMassTangent;

        const maxFriction = this.friction * this.accumulatedNormalLambda;
        const oldAccum = this.accumulatedFrictionLambda;
        this.accumulatedFrictionLambda = Math.max(-maxFriction, Math.min(oldAccum + lambda, maxFriction));
        lambda = this.accumulatedFrictionLambda - oldAccum;

        const frictionImpulse = this.tangent.clone().mult(lambda);
        this.bodyA.applyImpulse(frictionImpulse.clone().mult(-1), this.worldA);
        this.bodyB.applyImpulse(frictionImpulse, this.worldB);
    }

    public applyRestitution(): void {
        const restitutionThreshold = 1.0;

        if (this.restitution === 0 || this.isReused) {
            return;
        }

        if (this.relativeVelocity > -restitutionThreshold) {
            return;
        }

        const rnA = this.rA.cross(this.normal);
        const rnB = this.rB.cross(this.normal);
        const effectiveMass = this.invMassA + this.invMassB + rnA * rnA * this.invIA + rnB * rnB * this.invIB;
        if (effectiveMass < 0.000001) return;

        const velA = this.bodyA.velocity.clone().add(this.rA.crossSv(this.bodyA.angularVelocity));
        const velB = this.bodyB.velocity.clone().add(this.rB.crossSv(this.bodyB.angularVelocity));
        const relVel = Vector2.sub(velB, velA, new Vector2());
        const vn = this.normal.dot(relVel);

        const impulse = -(vn + this.restitution * this.relativeVelocity) / effectiveMass;

        if (impulse > 0) {
            const restitutionImpulse = this.normal.clone().mult(impulse);
            this.bodyA.applyImpulse(restitutionImpulse.clone().mult(-1), this.worldA);
            this.bodyB.applyImpulse(restitutionImpulse, this.worldB);
        }
    }
}
