It is great that you are diving into rigid body dynamics! Calculating the impulse for convex polygon collisions is one of the most foundational—and notoriously tricky—concepts when building or understanding a physics engine. 

To tackle this, we have to look at the collision at a single point first. When two polygons collide, they often form a "contact manifold" (a line segment of contact in 2D, or a polygonal patch in 3D). Most physics engines (like Box2D) solve this by finding the discrete contact points (usually 1 or 2 in 2D) that make up this manifold and applying a single-point impulse formula to each point iteratively. This technique is called **Sequential Impulse**.

Here is the complete derivation for the impulse at a single contact point, followed by an interactive diagram so you can visualize the vectors at play.

---

### **1. The Core Variables**

Imagine two convex rigid bodies, $A$ and $B$, colliding at a specific contact point $\mathbf{p}$. We need the following properties:
* $m_A, m_B$: The masses of bodies A and B.
* $I_A, I_B$: The moment of inertia scalars (in 2D) for A and B.
* $\mathbf{v}_A, \mathbf{v}_B$: The linear velocity vectors of their centers of mass.
* $\omega_A, \omega_B$: The angular velocity scalars.
* $\mathbf{n}$: The collision normal vector (a normalized vector pointing from A to B).
* $e$: The coefficient of restitution (bounciness), where $0$ is a perfectly inelastic collision and $1$ is perfectly elastic.

We also define the vectors from the centers of mass to the contact point $\mathbf{p}$:
* $\mathbf{r}_A = \mathbf{p} - \mathbf{c}_A$
* $\mathbf{r}_B = \mathbf{p} - \mathbf{c}_B$

---

### **2. Pre-Collision Relative Velocity**

First, we need to know how fast the two bodies are moving *into* each other at the exact point of contact. The velocity of the contact point on each body is the sum of its linear velocity and its angular velocity crossed with the radius vector.

For 2D, the cross product of a scalar $\omega$ and a vector $\mathbf{r} = (r_x, r_y)$ is $(-\omega r_y, \omega r_x)$.

$$\mathbf{v}_{Ap} = \mathbf{v}_A + (\omega_A \times \mathbf{r}_A)$$
$$\mathbf{v}_{Bp} = \mathbf{v}_B + (\omega_B \times \mathbf{r}_B)$$

The **relative velocity** at the contact point is:
$$\mathbf{v}_{rel} = \mathbf{v}_{Bp} - \mathbf{v}_{Ap}$$

We only care about the velocity along the collision normal, as that is the axis where they are penetrating. The scalar relative normal velocity is:
$$v_{rel,n} = \mathbf{v}_{rel} \cdot \mathbf{n}$$

*(Note: If $v_{rel,n} > 0$, the bodies are moving apart, and we do not apply an impulse.)*

---

### **3. The Goal of the Impulse**

According to Newton's Law of Restitution, the post-collision relative normal velocity ($v'_{rel,n}$) must relate to the pre-collision relative normal velocity by the coefficient of restitution $e$:

$$v'_{rel,n} = -e \cdot v_{rel,n}$$

We want to find a scalar impulse magnitude, $j$, applied along the normal vector $\mathbf{n}$. 
* Body A receives an impulse of $-j\mathbf{n}$
* Body B receives an impulse of $+j\mathbf{n}$

Applying this impulse will change both the linear and angular velocities of the bodies according to Newton's Second Law:
$$\mathbf{v}'_A = \mathbf{v}_A - \frac{j}{m_A}\mathbf{n}$$
$$\mathbf{v}'_B = \mathbf{v}_B + \frac{j}{m_B}\mathbf{n}$$
$$\omega'_A = \omega_A - \frac{\mathbf{r}_A \times \mathbf{n}}{I_A} j$$
$$\omega'_B = \omega_B + \frac{\mathbf{r}_B \times \mathbf{n}}{I_B} j$$

---

### **4. Deriving the Formula for $j$**

To find $j$, we substitute our new velocity equations into the restitution equation. 

The new relative velocity at the contact point is:
$$\mathbf{v}'_{rel} = \left( \mathbf{v}'_B + \omega'_B \times \mathbf{r}_B \right) - \left( \mathbf{v}'_A + \omega'_A \times \mathbf{r}_A \right)$$

Dotting this with the normal $\mathbf{n}$ gives us $v'_{rel,n}$. If we expand this fully (which involves some vector algebra and the triple product property), we can isolate $j$ relative to the pre-collision state.

The change in normal velocity ($\Delta v$) caused by a unit of impulse $j=1$ is known as the effective mass of the collision:
$$\text{Effective Mass} = \frac{1}{m_A} + \frac{1}{m_B} + \frac{(\mathbf{r}_A \times \mathbf{n})^2}{I_A} + \frac{(\mathbf{r}_B \times \mathbf{n})^2}{I_B}$$

By combining the target velocity change $(-(1 + e)v_{rel,n})$ with the effective mass, we arrive at the final scalar impulse equation:

$$j = \frac{-(1 + e)(\mathbf{v}_{rel} \cdot \mathbf{n})}{\frac{1}{m_A} + \frac{1}{m_B} + \frac{(\mathbf{r}_A \times \mathbf{n})^2}{I_A} + \frac{(\mathbf{r}_B \times \mathbf{n})^2}{I_B}}$$

### **5. One Normal, Multiple Points (The Manifold)**

A common point of confusion is whether multiple contact points mean multiple normals. 

In a rigid body collision:
1.  **One Normal ($\mathbf{n}$)**: There is only one direction of penetration (the axis of minimum separation found by SAT). Even in an edge-on-edge collision, both bodies share this single normal vector.
2.  **Multiple Points**: While there's only one normal, the bodies might touch at multiple locations (e.g., two corners of a box hitting a floor). This set of points is the **Contact Manifold**.
3.  **Separate Impulses**: We calculate a unique impulse magnitude $j$ for **each** point in the manifold. Even though they share the same $\mathbf{n}$, the lever arms $\mathbf{r}_A$ and $\mathbf{r}_B$ are different for each point, meaning each point contributes differently to the final change in angular velocity.

> [!NOTE]
> **What happens if $e = 0$?**
> If both objects have $e = 0$, the collision is **perfectly inelastic**.
> - **Relative Velocity**: $v_{rel}' = 0$. After the hit, the objects move with the exact same velocity along the normal. They "stick" together in that direction.
> - **World Velocity**: They **do not stop** in world space. If a 100mph car hits a 0mph car and they stick, they both continue at a shared speed (determined by conservation of momentum).
> - **Energy**: This is the configuration that dissipates the **maximum** possible kinetic energy.

### **6. Combining Restitution**

In the real world, "restitution" is a property of the collision *event*, not just one object. However, in game engines, we usually assign an `restitution` value to each material. When two objects collide, we must decide on an **effective restitution** ($e_{combined}$):

1.  **Minimum** (`min(e1, e2)`): If one object is a "sponge" ($e=0$) and the other is a "superball" ($e=1$), the collision will likely be inelastic. This is the most common default in engines.
2.  **Maximum** (`max(e1, e2)`): The bounciest object wins.
3.  **Multiplication** (`e1 * e2`): A hybrid approach.
4.  **Average** (`(e1 + e2) / 2`): A simple compromise.

In our simulation above, we use the **Minimum** approach.

