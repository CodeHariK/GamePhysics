import InequalityDemo from './InequalityDemo';
import Markdown from '../../../components/Markdown';

const introduction = `
# Inequality Constraints & Compound Bodies

In physical simulation, **collisions** are known as *inequality constraints*. Unlike equality constraints (like a revolute joint where $C(p) = 0$), a collision constraint only activates when objects overlap: $C(p) \ge 0$.

### 1. Beyond Monolithic Polygons
To support complex gaming assets, we've extended the engine from a single-polygon model to a **Compound Body** architecture. A single rigid body can now be composed of multiple shapes (Circles and Polygons), each with its own local offset.

### 2. Multi-Shape SAT
The Separating Axis Theorem (SAT) has been generalized to handle:
*   **Circle-Circle**: Efficient distance-based detection.
*   **Circle-Polygon**: Feature-based detection (Voronoi region check for vertices).
*   **Polygon-Polygon**: Standard axis projection.

### 3. Contact Persistence
When a compound body (like the star below) collides, it might generate multiple contact manifolds simultaneously across different shapes. Our solver tracks these independently using unique Shape-Pair IDs, allowing for stable **Warm Starting** even for intricate geometries.
`;

export default function InequalityBlog() {
    return (
        <div class="blog-card" style="display: flex; flex-direction: column; gap: 30px;">
            <div style="border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
                <h2 style="margin: 0; color: #2c3e50; font-family: 'JetBrains Mono', monospace;">08. Inequality Constraints</h2>
                <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Compound Bodies & Narrow Phase</p>
            </div>

            <Markdown content={introduction} />

            <div class="demo-container" style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <InequalityDemo />
            </div>

            <div style="background: #fff9db; padding: 15px; border-radius: 8px; border-left: 4px solid #f1c40f; font-size: 13px; color: #856404;">
                <strong>Pro Tip:</strong> Try the <strong>COMPOSITE</strong> scene to see how multiple triangles and circles can form a single rigid "Star" or "Capsule" body.
            </div>
        </div>
    );
}
