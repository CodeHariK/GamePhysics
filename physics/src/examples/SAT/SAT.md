### Separating Axis Theorem

The **Separating Axis Theorem (SAT)** is the gold standard for convex polygon collision detection. It states that if you can find an axis upon which the projections of two convex shapes do not overlap, then the shapes are not colliding.

#### The Logic

To check for a collision, we must test all the unique "face normals" (perpendicular vectors to the edges) of both polygons. If we find even one gap, we exit early with a *clear* result.

```js
function checkCollision(A, B):
  for each edge in (A + B):
    axis = perp(edge).norm()
    {minA, maxA} = project(A, axis)
    {minB, maxB} = project(B, axis)
    
    if maxA < minB or maxB < minA:
      return false // Separation!
  
  return true // All axes overlap
```

#### Minimum Translation Vector (MTV)

If all axes show an overlap, a collision exists. The **MTV** is the smallest overlap found during the loop. It represents the shortest path to move Polygon A so that it no longer touches Polygon B.

```js
// Finding the MTV
let minOverlap = Infinity;
let bestAxis = null;

for each axis:
  overlap = overlapAmount(A, B, axis)
  if overlap < minOverlap:
    minOverlap = overlap
    bestAxis = axis

const mtv = bestAxis.mult(minOverlap)
// Always push AWAY from A
if (mtv.dot(centerB - centerA) < 0) mtv.negate()
```

- **Depth:** The magnitude of the smallest overlap.
- **Normal:** The axis direction of that smallest overlap.

#### Contact Point Detection

Once we know a collision is happening, we need to find the **Contact Points**. This is crucial for calculating **Torque** (rotation).

#### Method 1: Point-in-Polygon (Heuristic)

The simplest way is to check which vertices of Shape A are inside Shape B, and vice versa.

```typescript
// For each vertex in A, check if it's inside B
if (isInside(vertex, B)) contacts.push(vertex)
```

#### Method 2: Sutherland-Hodgman Clipping (Robust)

While fast, the "Point-in-Polygon" method can be unstable for stacking. To achieve professional-grade stability, we use **Clipping**. 

*Check out the **Clipping** section below for a deep dive into stable manifold generation.*
