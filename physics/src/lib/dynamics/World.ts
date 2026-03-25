import { Body } from '../bodies/Body';
import { Vector2 } from '../math/Vector2';
import { Constraint, type ConstraintSettings } from '../constraints/Constraint';
import { ContactConstraint } from '../constraints/ContactConstraint';
import { CollisionHelper } from '../collision/SAT';
import { SpatialHashGrid } from '../collision/SpatialHashGrid';

export class World {
    public bodies: Body[] = [];
    public constraints: Constraint[] = [];
    public spatialGrid: SpatialHashGrid;

    public gravity: Vector2 = new Vector2(0, 9.81 * 100);
    public constraintIterations: number = 10;
    
    // Default physics settings resembling robust Box2D tuning for 60-120hz
    public constraintSettings: ConstraintSettings = {
        mode: 'soft',
        baumgarteFactor: 0.1,
        contactSoft: { hertz: 30.0, dampingRatio: 10.0 },
        jointSoft: { hertz: 60.0, dampingRatio: 0.0 },
        contactSpeed: 3.0,
        warmStarting: true
    };

    constructor(cellSize: number = 100) {
        this.spatialGrid = new SpatialHashGrid(cellSize);
    }

    public addBody(body: Body): void {
        this.bodies.push(body);
    }

    public removeBody(body: Body): void {
        const index = this.bodies.indexOf(body);
        if (index !== -1) {
            this.bodies.splice(index, 1);
        }
    }

    public addConstraint(constraint: Constraint): void {
        this.constraints.push(constraint);
    }

    public removeConstraint(constraint: Constraint): void {
        const index = this.constraints.indexOf(constraint);
        if (index !== -1) {
            this.constraints.splice(index, 1);
        }
    }

    /**
     * Executes a single fixed physics step. 
     * The Engine handles the accumulator to call this at a strict dt.
     */
    public step(dt: number): void {
        // 1. Integrate Forces (Gravity)
        for (const obj of this.bodies) {
            if (obj.isStatic) continue;
            obj.velocity.add(this.gravity.clone().mult(dt));
            // Add custom forces
            obj.velocity.add(obj.force.mult(obj.invMass * dt));
        }

        // 2. Collision Detection
        this.detectCollisions();

        // 3. Solve Constraints (Contacts, Joints, Motors)
        this.solveConstraints(dt, this.constraintIterations);

        // 4. Integrate Velocities -> Positions
        for (const obj of this.bodies) {
            if (!obj.isStatic) {
                obj.step(dt);
            }
            // Always update transform (static objects might need it once, 
            // but dynamic objects need it every step to sync world vertices/AABBs)
            obj.updateTransform();
            obj.clearForces(); 
        }
    }

    private detectCollisions(): void {
        // Keep Contacts from last frame to re-use their warm starting impulses
        const contactConstraintsForReuse = this.constraints.filter(c => c instanceof ContactConstraint) as ContactConstraint[];
        
        // Remove old Contacts from active array (they will be replenished)
        this.constraints = this.constraints.filter(c => !(c instanceof ContactConstraint));
        
        // Broad Phase
        this.spatialGrid.clear();
        for (const body of this.bodies) {
            this.spatialGrid.insert(body);
        }
        const possiblePairs = this.spatialGrid.getPotentialPairs();

        // Narrow Phase (generates new/updated ContactConstraints)
        const newContacts: ContactConstraint[] = [];
        for (const [bodyA, bodyB] of possiblePairs) {
            const results = CollisionHelper.checkCollision(bodyA, bodyB, contactConstraintsForReuse);
            for (const c of results) {
                newContacts.push(c);
            }
        }
        
        // Add active contacts back to the constraint list
        this.constraints.push(...newContacts);
    }

    private solveConstraints(dt: number, numIterations: number): void {
        // Init properties
        for (const constraint of this.constraints) {
            if (constraint.update) {
                constraint.update(this.constraintSettings);
            }
        }

        // Velocity Solver
        for (let i = 0; i < numIterations; i++) {
            for (const constraint of this.constraints) {
                constraint.solve(dt, this.constraintSettings);
            }
        }

        // Restitution (Bounce) applied at end of step
        for (const constraint of this.constraints) {
            if (constraint instanceof ContactConstraint) {
                constraint.applyRestitution();
            }
        }
    }

    public clear(): void {
        this.bodies = [];
        this.constraints = [];
        this.spatialGrid.clear();
    }
}
