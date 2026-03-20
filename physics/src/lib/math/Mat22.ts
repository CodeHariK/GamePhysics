import { Vector2 } from './Vector2';

/**
 * A 2x2 matrix for linear transformations (rotation, scaling).
 * Based on Box2D Lite's Mat22 implementation.
 */
export class Mat22 {
    public col1: Vector2;
    public col2: Vector2;

    constructor();
    constructor(angle: number);
    constructor(col1: Vector2, col2: Vector2);
    constructor(arg1?: number | Vector2, arg2?: Vector2) {
        if (arg1 instanceof Vector2 && arg2 instanceof Vector2) {
            this.col1 = arg1.clone();
            this.col2 = arg2.clone();
        } else if (typeof arg1 === 'number') {
            const c = Math.cos(arg1);
            const s = Math.sin(arg1);
            this.col1 = new Vector2(c, s);
            this.col2 = new Vector2(-s, c);
        } else {
            this.col1 = new Vector2(1, 0);
            this.col2 = new Vector2(0, 1);
        }
    }

    /**
     * Sets the matrix to a rotation matrix for the given angle.
     */
    public setRotation(angle: number): this {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        this.col1.set(c, s);
        this.col2.set(-s, c);
        return this;
    }

    /**
     * Returns the transpose of this matrix.
     */
    public transpose(): Mat22 {
        return new Mat22(
            new Vector2(this.col1.x, this.col2.x),
            new Vector2(this.col1.y, this.col2.y)
        );
    }

    /**
     * Multiplies a vector by this matrix (M * v).
     */
    public mult(v: Vector2): Vector2 {
        return new Vector2(
            this.col1.x * v.x + this.col2.x * v.y,
            this.col1.y * v.x + this.col2.y * v.y
        );
    }

    /**
     * Multiplies this matrix with another matrix (this * B).
     */
    public multMat(B: Mat22): Mat22 {
        return new Mat22(this.mult(B.col1), this.mult(B.col2));
    }

    /**
     * Returns the inverse of this matrix.
     */
    public invert(): Mat22 {
        const a = this.col1.x, b = this.col2.x;
        const c = this.col1.y, d = this.col2.y;
        let det = a * d - b * c;
        if (det === 0) throw new Error("Matrix is singular and cannot be inverted.");
        
        det = 1.0 / det;
        return new Mat22(
            new Vector2(det * d, -det * c),
            new Vector2(-det * b, det * a)
        );
    }

    /**
     * Static helper: Multiplication M * v.
     */
    public static mult(M: Mat22, v: Vector2): Vector2 {
        return new Vector2(
            M.col1.x * v.x + M.col2.x * v.y,
            M.col1.y * v.x + M.col2.y * v.y
        );
    }
}
