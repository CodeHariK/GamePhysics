import { Body } from '../bodies/Body';
import { Vector2 } from '../math/Vector2';
import type { CollisionManifold } from '../collision/SAT';
import { ContactPair } from './ContactPair';

export class Resolver {
    /**
     * Applies the accumulated impulses from the previous frame to "warm start" the solver.
     */
    public static warmStart(pair: ContactPair): void {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        const normal = pair.normal;
        const tangent = new Vector2(-normal.y, normal.x);

        for (const contact of pair.contacts) {
            const rA = Vector2.sub(contact.position, bodyA.position, new Vector2());
            const rB = Vector2.sub(contact.position, bodyB.position, new Vector2());

            // Total impulse = normal + friction
            const P = new Vector2(
                normal.x * contact.normalImpulse + tangent.x * contact.tangentImpulse,
                normal.y * contact.normalImpulse + tangent.y * contact.tangentImpulse
            );

            bodyA.velocity.x -= P.x * bodyA.invMass;
            bodyA.velocity.y -= P.y * bodyA.invMass;
            bodyA.angularVelocity -= rA.cross(P) * bodyA.invInertia;

            bodyB.velocity.x += P.x * bodyB.invMass;
            bodyB.velocity.y += P.y * bodyB.invMass;
            bodyB.angularVelocity += rB.cross(P) * bodyB.invInertia;
        }
    }

    /**
     * Resolves velocities for two colliding bodies using persistent impulses.
     */
    public static resolveVelocities(pair: ContactPair): void {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        const normal = pair.normal;
        const tangent = new Vector2(-normal.y, normal.x);
        
        const invMassSumLin = bodyA.invMass + bodyB.invMass;
        if (invMassSumLin === 0) return;

        const e = Math.min(bodyA.restitution, bodyB.restitution);
        const mu = Math.sqrt(bodyA.friction * bodyA.friction + bodyB.friction * bodyB.friction);

        for (const contact of pair.contacts) {
            const rA = Vector2.sub(contact.position, bodyA.position, new Vector2());
            const rB = Vector2.sub(contact.position, bodyB.position, new Vector2());

            // --- NORMAL IMPULSE ---
            let rv = this.getRelativeVelocity(bodyA, bodyB, rA, rB);
            const velAlongNormal = rv.dot(normal);

            // Baumgarte / Restitution Bias
            let velocityBias = 0;
            if (velAlongNormal < -30) {
                velocityBias = -e * velAlongNormal;
            }

            const rA_cross_N = rA.cross(normal);
            const rB_cross_N = rB.cross(normal);
            const invMassSumNormal = invMassSumLin + 
                             (rA_cross_N * rA_cross_N) * bodyA.invInertia + 
                             (rB_cross_N * rB_cross_N) * bodyB.invInertia;

            let jn = -(velAlongNormal - velocityBias);
            jn /= invMassSumNormal;

            // Accumulate and clamp normal impulse
            const oldNormalImpulse = contact.normalImpulse;
            contact.normalImpulse = Math.max(oldNormalImpulse + jn, 0);
            const jn_actual = contact.normalImpulse - oldNormalImpulse;

            const impulse = new Vector2(normal.x * jn_actual, normal.y * jn_actual);
            this.applyImpulse(bodyA, bodyB, rA, rB, impulse);

            // --- FRICTION IMPULSE ---
            rv = this.getRelativeVelocity(bodyA, bodyB, rA, rB);
            const velAlongTangent = rv.dot(tangent);

            const rA_cross_T = rA.cross(tangent);
            const rB_cross_T = rB.cross(tangent);
            const invMassSumTangent = invMassSumLin + 
                                    (rA_cross_T * rA_cross_T) * bodyA.invInertia + 
                                    (rB_cross_T * rB_cross_T) * bodyB.invInertia;

            let jt = -velAlongTangent;
            jt /= invMassSumTangent;

            // Accumulate and clamp friction impulse using Coulomb's law
            const maxFriction = contact.normalImpulse * mu;
            const oldTangentImpulse = contact.tangentImpulse;
            contact.tangentImpulse = Math.max(-maxFriction, Math.min(oldTangentImpulse + jt, maxFriction));
            const jt_actual = contact.tangentImpulse - oldTangentImpulse;

            const frictionImpulse = new Vector2(tangent.x * jt_actual, tangent.y * jt_actual);
            this.applyImpulse(bodyA, bodyB, rA, rB, frictionImpulse);
        }
    }

    private static getRelativeVelocity(bodyA: Body, bodyB: Body, rA: Vector2, rB: Vector2): Vector2 {
        const vA = new Vector2(bodyA.velocity.x - bodyA.angularVelocity * rA.y, bodyA.velocity.y + bodyA.angularVelocity * rA.x);
        const vB = new Vector2(bodyB.velocity.x - bodyB.angularVelocity * rB.y, bodyB.velocity.y + bodyB.angularVelocity * rB.x);
        return Vector2.sub(vB, vA, new Vector2());
    }

    private static applyImpulse(bodyA: Body, bodyB: Body, rA: Vector2, rB: Vector2, impulse: Vector2): void {
        bodyA.velocity.x -= impulse.x * bodyA.invMass;
        bodyA.velocity.y -= impulse.y * bodyA.invMass;
        bodyA.angularVelocity -= rA.cross(impulse) * bodyA.invInertia;

        bodyB.velocity.x += impulse.x * bodyB.invMass;
        bodyB.velocity.y += impulse.y * bodyB.invMass;
        bodyB.angularVelocity += rB.cross(impulse) * bodyB.invInertia;
    }

    public static resolvePenetration(bodyA: Body, bodyB: Body, manifold: CollisionManifold): void {
        const invMassSum = bodyA.invMass + bodyB.invMass;
        if (invMassSum === 0) return;

        const slop = 0.05; 
        const percent = 0.4; 
        
        const correctionMagnitude = Math.max(manifold.depth - slop, 0) / invMassSum * percent;
        const correction = new Vector2(
            manifold.normal.x * correctionMagnitude,
            manifold.normal.y * correctionMagnitude
        );

        if (!bodyA.isStatic) {
            bodyA.position.x -= correction.x * bodyA.invMass;
            bodyA.position.y -= correction.y * bodyA.invMass;
        }

        if (!bodyB.isStatic) {
            bodyB.position.x += correction.x * bodyB.invMass;
            bodyB.position.y += correction.y * bodyB.invMass;
        }
    }
}
