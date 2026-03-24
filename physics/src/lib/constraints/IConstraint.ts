
export interface IConstraint {
    /**
     * Resolves the velocity constraint (impulse-based).
     * @param dt The time step.
     */
    solveVelocity(dt: number): void;

    /**
     * Resolves the position error (Baumgarte stabilization or projection).
     * This is usually called after the velocity solver to prevent drift.
     */
    solvePosition(): void;
}
