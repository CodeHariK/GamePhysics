import { Vector2 } from '../math/Vector2';

/**
 * Represents a single point of contact between two bodies.
 * Persists across frames to allow for warm starting and accumulated impulses.
 */
export class Contact {
    /** The position of the contact in world space */
    public position: Vector2;
    
    /** The accumulated normal impulse applied at this point */
    public normalImpulse: number = 0;
    
    /** The accumulated tangent (friction) impulse applied at this point */
    public tangentImpulse: number = 0;

    /** 
     * A unique ID for this contact point to match it across frames.
     * Often generated from vertex indices or feature IDs.
     */
    public id: string;

    constructor(position: Vector2, id: string) {
        this.position = position.clone();
        this.id = id;
    }
}
