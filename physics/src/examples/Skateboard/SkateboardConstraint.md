# The Half-Pipe Constraint: Mathematical Derivation

This document explains the physical and mathematical implementation of the **Half-Pipe Constraint** used in our 2D physics engine. Unlike simple joints (like a point-to-point hinge), this constraint is based on a **custom geometry surface**.

## 1. The Constraint Equation
At its core, a constraint is a mathematical rule that restricts the motion of a body. For a body to be "on the track," its position $p$ must satisfy:
$$C(p) = \text{dist}(p, \text{surface}) = 0$$

Where $\text{surface}$ is the piecewise combination of the two circular arcs and the flat bottom.

### Geometry Definition
The surface is defined by:
- **Left Arc**: A circle with center $c_L$ and radius $r$. 
- **Right Arc**: A circle with center $c_R$ and radius $r$.
- **Flat Bottom**: A horizontal line segment at $y = y_{base}$.

To solve this, we first find the **closest point** on the surface to our current body position $p$, which we call $p_{proj}$. The constraint error is then the distance between them.

---

## 2. Velocity Constraint (The Jacobian)
To maintain the constraint over time, we need to ensure the body doesn't move "off" the surface. This means its velocity $v$ must be perpendicular to the surface normal. Mathematically, the time derivative of our constraint must be zero:
$$\dot{C}(p) = \frac{\partial C}{\partial p} \cdot \frac{dp}{dt} = \nabla C \cdot v = 0$$

The term $J = \nabla C$ is known as the **Jacobian**. For a surface constraint, the Jacobian is simply the **surface normal vector** $n$:
$$J = n^T = [n_x, n_y]$$

Thus, our velocity-level requirement is:
$$J v = 0$$

---

## 3. Impulse-Based Solution
We solve this by applying an **impulse** $P$ that corrects the velocity. In a sequential impulse solver, the magnitude of the impulse $\lambda$ is calculated as:
$$\lambda = -\frac{J v}{\text{effective mass}}$$

For a single body of mass $m$, the effective mass in the direction of the normal is simply $1/m$. Therefore:
$$\lambda = -(n \cdot v) \cdot m$$

We then apply this impulse along the normal:
$$\Delta v = \frac{1}{m} P = \frac{1}{m} (n \cdot \lambda) = n \cdot \left(-(n \cdot v)\right)$$

This effectively removes any velocity component pointing into or out of the surface, leaving only the **tangential velocity**.

---

## 4. Position Correction (Baumgarte Stabilization)
Due to numerical errors (floating point precision and discrete time steps), the body will eventually "drift" off the surface. To fix this, we add a **bias term** to the velocity solver:
$$\text{bias} = \frac{\beta}{\Delta t} C(p)$$

Where $\beta$ is a "stabilization factor" (typically 0.1 to 0.8). The final impulse identity becomes:
$$\lambda = -\frac{J v + \text{bias}}{1/m}$$

Additionally, we use **Non-linear Position Projection** at the end of the frame, which directly moves the body's position towards the surface by a small percentage of the error $C(p)$ to ensure the skater stays perfectly glued to the ramp.

---

## 5. Tangent & Visual Alignment
Because the Half-pipe is curved, the skater must rotate to remain "upright" relative to the surface. We calculate the **Tangent Vector** $t$ by rotating the normal $n$ 90 degrees:
$$t = \begin{pmatrix} -n_y \\ n_x \end{pmatrix}$$

The drawing routine then uses $\theta = \operatorname{atan2}(t_y, t_x)$ to align the skateboard and stick figure with the track.
