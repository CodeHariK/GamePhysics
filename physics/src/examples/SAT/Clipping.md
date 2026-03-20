### Sutherland-Hodgman Clipping

The **Separating Axis Theorem** tells us *if* two shapes collide and the *direction* to push them apart. However, it doesn't tell us *where* they touch.

For a physics engine to calculate stable stacking and friction, we need a **Contact Manifold**—a set of points representing the overlap area.

#### The Clipping Pipeline

Professional engines like Box2D Lite use **Sutherland-Hodgman Clipping** to generate this manifold in three steps:

1. **Identify the Reference Face**: 
   We look at the collision normal and find the face on either Polygon A or B that is most perpendicular to it. This becomes our "ground truth" for clipping.

2. **Identify the Incident Face**: 
   The face on the *other* polygon that is most pointing towards the reference face. This is the edge that will be "cut."

3. **Clip the Incident Face**:
   - **Step A: Side Clipping**: We create two clipping planes at the start and end of the reference face, pointing inwards. We clip the incident edge against these planes.
   - **Step B: Final Clipping**: We take the remaining segment and clip it against the reference face plane itself. Anything "above" the face (not penetrating) is discarded.

#### Why is this better?

- **Stability**: Unlike a simple "Point-in-Poly" check, clipping produces a consistent 1D segment (the manifold).
- **Warm Starting**: Professional engines "remember" the impulses applied at these specific contact points between frames, which drastically reduces jitter in stacks.

*In the Lab below, move the polygons to see the **Reference Face (Green)**, **Incident Face (Cyan)**, and the resulting **Manifold (Cyan Dots)**.*
