import { Body } from '../bodies/Body';
import { Shape } from '../collision/Shape';
import { Vector2 } from '../math/Vector2';
import { Contact } from './Contact';
import type { CollisionManifold } from '../collision/LegacySAT';

/**
 * Manages the persistent collision state between two bodies.
 */
export class ContactPair {
    public bodyA: Body;
    public bodyB: Body;
    public shapeA: Shape;
    public shapeB: Shape;
    public id: string;
    
    public contacts: Contact[] = [];
    public normal: Vector2;
    public depth: number;
    
    public isActive: boolean = true;

    constructor(bodyA: Body, bodyB: Body, shapeA: Shape, shapeB: Shape) {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.shapeA = shapeA;
        this.shapeB = shapeB;
        this.id = ContactPair.getId(bodyA, bodyB, shapeA, shapeB);
        this.normal = new Vector2(0, 0);
        this.depth = 0;
    }

    /**
     * Updates the pair with new collision data.
     * Matches new contacts to old ones to preserve accumulated impulses.
     */
    public update(manifold: CollisionManifold): void {
        this.normal.copy(manifold.normal);
        this.depth = manifold.depth;
        this.isActive = true;

        const newContacts: Contact[] = [];

        for (let i = 0; i < manifold.contacts.length; i++) {
            const pos = manifold.contacts[i];
            // Simple ID based on position/indexing for now. 
            // In a better engine, we'd use feature IDs from SAT.
            const contactId = `c_${i}`; 
            
            // Try to find an existing contact to "warm start" from
            const oldContact = this.contacts.find(c => c.id === contactId);
            const contact = new Contact(pos, contactId);
            
            if (oldContact) {
                // Persist impulses from previous frame
                contact.normalImpulse = oldContact.normalImpulse;
                contact.tangentImpulse = oldContact.tangentImpulse;
            }
            
            newContacts.push(contact);
        }

        this.contacts = newContacts;
    }

    public static getId(a: Body, b: Body, sA: Shape, sB: Shape): string {
        const bodyIds = a.id < b.id ? `${a.id}_${b.id}` : `${b.id}_${a.id}`;
        const shapeIds = a.id < b.id ? `${sA.id}_${sB.id}` : `${sB.id}_${sA.id}`;
        return `${bodyIds}_${shapeIds}`;
    }
}
