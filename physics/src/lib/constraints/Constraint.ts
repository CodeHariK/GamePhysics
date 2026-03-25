import { Body } from "../bodies/Body";
import { Vector2 } from "../math/Vector2";

export const SLOP_LINEAR = 0.002;

export function mat2x2Solve(K: number[][], b: Vector2): Vector2 {
    const det = K[0][0] * K[1][1] - K[0][1] * K[1][0];
    const invDet = det !== 0 ? 1.0 / det : 0;
    return new Vector2(invDet * (K[1][1] * b.x - K[0][1] * b.y), invDet * (K[0][0] * b.y - K[1][0] * b.x));
}

export interface SoftConstraintParams {
    biasRate: number;
    massScale: number;
    impulseScale: number;
}

export function getSoftConstraintParams(hertz: number, dampingRatio: number, timeStep: number): SoftConstraintParams {
    if (hertz === 0) {
        return { biasRate: 0, massScale: 0, impulseScale: 0 };
    }
    const omega = 2 * Math.PI * hertz;
    const a1 = 2 * dampingRatio + timeStep * omega;
    const a2 = timeStep * omega * a1;
    const a3 = 1 / (1 + a2);
    return {
        biasRate: omega / a1,
        massScale: a2 * a3,
        impulseScale: a3,
    };
}

export interface ConstraintSettings {
    mode: 'off' | 'baumgarte' | 'soft';
    baumgarteFactor: number;
    contactSoft: { hertz: number, dampingRatio: number };
    jointSoft: { hertz: number, dampingRatio: number };
    contactSpeed: number;
    warmStarting: boolean;
}

export abstract class Constraint {
    public bodyA: Body;
    public bodyB: Body;
    public constraintSettings: ConstraintSettings | null = null;

    constructor(bodyA: Body, bodyB: Body) {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
    }

    public abstract update(settings: ConstraintSettings): void;
    public abstract solve(dt: number, settings: ConstraintSettings): void;
}
