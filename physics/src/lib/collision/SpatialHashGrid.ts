import { Body } from '../bodies/Body';

export class SpatialHashGrid {
    private cellSize: number;
    // We use a Map where the Key is the grid coordinate (e.g., "5,2") 
    // and the Value is an array of Bodies in that cell.
    private cells: Map<string, Body[]>;

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    /**
     * Clears the grid at the start of every frame.
     */
    public clear(): void {
        this.cells.clear();
    }


    /**
     * Inserts a body into the grid based on its AABB.
     * Large bodies might span multiple cells!
     */
    public insert(body: Body): void {
        const minKeyX = Math.floor(body.aabb.min.x / this.cellSize);
        const maxKeyX = Math.floor(body.aabb.max.x / this.cellSize);
        const minKeyY = Math.floor(body.aabb.min.y / this.cellSize);
        const maxKeyY = Math.floor(body.aabb.max.y / this.cellSize);

        // Register the body in every cell its AABB touches
        for (let x = minKeyX; x <= maxKeyX; x++) {
            for (let y = minKeyY; y <= maxKeyY; y++) {
                const key = `${x},${y}`;
                if (!this.cells.has(key)) {
                    this.cells.set(key, []);
                }
                this.cells.get(key)!.push(body);
            }
        }
    }

    /**
     * Returns a list of potential collision pairs (bodies that share cells).
     */
    public getPotentialPairs(): [Body, Body][] {
        const pairs: [Body, Body][] = [];
        const checked = new Set<string>(); // Prevent checking A vs B, then B vs A

        // Loop through every active cell in the grid
        for (const [, bodies] of this.cells.entries()) {
            // If there's more than 1 body in a cell, they might be colliding
            for (let i = 0; i < bodies.length; i++) {
                for (let j = i + 1; j < bodies.length; j++) {
                    const bodyA = bodies[i];
                    const bodyB = bodies[j];

                    // Create a unique ID for this pair to avoid duplicates
                    const pairId = bodyA.id < bodyB.id
                        ? `${bodyA.id}-${bodyB.id}`
                        : `${bodyB.id}-${bodyA.id}`;

                    if (!checked.has(pairId)) {
                        checked.add(pairId);

                        // Final Broad-Phase Check: Do their AABBs actually overlap?
                        if (bodyA.aabb.overlaps(bodyB.aabb)) {
                            pairs.push([bodyA, bodyB]);
                        }
                    }
                }
            }
        }
        return pairs;
    }
}
