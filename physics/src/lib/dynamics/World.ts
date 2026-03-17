import { Body } from '../bodies/Body';
import { Integrator } from './Integrator';
import { SpatialHashGrid } from '../collision/SpatialHashGrid';
import { SAT } from '../collision/SAT';
import { Resolver } from './Resolver';
import { Vector2 } from '../math/Vector2';
import { ContactPair } from './ContactPair';

export class World {
    public bodies: Body[] = [];
    public spatialGrid: SpatialHashGrid;
    public pairs: Map<string, ContactPair> = new Map();

    public gravity: Vector2 = new Vector2(0, 9.81 * 100); // Default Earth gravity in pixels

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

    public step(dt: number): void {
        // 1. INTEGRATE (Apply forces and move velocities)
        for (const body of this.bodies) {
            if (body.isStatic) continue;
            
            // Apply Gravity
            body.addForce(new Vector2(this.gravity.x * body.mass, this.gravity.y * body.mass));
            
            // We use semi-implicit Euler inside the integrator
            Integrator.semiImplicitEuler(body, dt);
            body.updateTransform();
        }

        // 2. BROAD-PHASE
        this.spatialGrid.clear();
        for (const body of this.bodies) {
            this.spatialGrid.insert(body);
        }
        const possiblePairs = this.spatialGrid.getPotentialPairs();

        // 3. NARROW-PHASE & PAIR PERSISTENCE
        // Mark all existing pairs as inactive initially
        for (const pair of this.pairs.values()) {
            pair.isActive = false;
        }

        for (const [bodyA, bodyB] of possiblePairs) {
            const manifold = SAT.testPolygons(bodyA.vertices, bodyB.vertices);
            
            if (manifold.isColliding) {
                const pairId = ContactPair.getId(bodyA, bodyB);
                let pair = this.pairs.get(pairId);
                
                if (!pair) {
                    pair = new ContactPair(bodyA, bodyB);
                    this.pairs.set(pairId, pair);
                }
                
                pair.update(manifold);
            }
        }

        // Remove inactive pairs (collisions that ended)
        for (const [id, pair] of this.pairs.entries()) {
            if (!pair.isActive) {
                this.pairs.delete(id);
            }
        }

        const activePairs = Array.from(this.pairs.values());

        // 4. WARM STARTING
        // Apply impulses from the previous frame to start the simulation closer to equilibrium
        for (const pair of activePairs) {
            Resolver.warmStart(pair);
        }

        // 5. VELOCITY SOLVER (Sequential Impulses)
        const VELOCITY_ITERATIONS = 10;
        for (let i = 0; i < VELOCITY_ITERATIONS; i++) {
            for (const pair of activePairs) {
                Resolver.resolveVelocities(pair);
            }
        }

        // 6. POSITION SOLVER (Pseudo-velocities / Nonlinear Projection)
        const POSITION_ITERATIONS = 3;
        for (let i = 0; i < POSITION_ITERATIONS; i++) {
            for (const pair of activePairs) {
                // Re-run SAT to get fresh depths as bodies move apart
                const manifold = SAT.testPolygons(pair.bodyA.vertices, pair.bodyB.vertices);
                if (manifold.isColliding) {
                    Resolver.resolvePenetration(pair.bodyA, pair.bodyB, manifold);
                    pair.bodyA.updateTransform();
                    pair.bodyB.updateTransform();
                }
            }
        }

        // 7. CLEAR FORCES
        for (const body of this.bodies) {
            body.clearForces();
        }
    }

    public clear(): void {
        this.bodies = [];
        this.pairs.clear();
        this.spatialGrid.clear();
    }
}
