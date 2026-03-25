# 4. Equality Constraints

In this section we'll be implementing velocity equality constraints. Simply put, the constraint will enforce the relative velocity of the constraint points to always equal 0.
Equality constraints are useful for creating chains of objects or ragdolls whose joints can freely rotate, and will also lay the groundwork for other types of constraints as the math is very similar. This is probably the most complicated part of the tutorial.

## What are constraints?

Constraints are what are used in physics engines to handle contact resolution (pushing objects apart when they collide), things like chains of objects linked together, and really just about any interaction between objects you want to simulate.
Everything starts with the idea of position constraints.
Take this skateboarder skating on the half pipe.
His board's position $p$ is constrained to the surface of the half pipe, and always must maintain a distance of 0 to it.
This is the position constraint.

However, position constraints are not super convenient to work with in physics engines.
It wouldn't be very realistic to constrain objects from colliding by just teleporting their positions apart if they are touching.
So instead, we use velocity constraints.
Instead of directly constraining the function $C$, we constrain its derivative, $C'$, which in this case would be the velocity of the skateboarder along the normal of the ramp.
By using velocity constraints, in the case of collision, objects will be pushed apart with force when they are overlapping and bounce away from eachother realistically.
But ultimately, everything comes back to position constraints, and velocity constraints are just a way to indirectly constrain the position.

## Revolute Constraint

Below is the code for the RevoluteConstraint class. It is a simple constraint that keeps the distance between 2 points on 2 objects equal to 0 distance from each other. Think of it like nailing two objects together, but letting them freely rotate around the point they're nailed together at. I'll explain each part of the code in the next sections.


```js
class RevoluteConstraint extends Constraint {
    constructor(objA, objB, worldPoint) {
        super(objA, objB);
        this.localA = objA.worldToLocal(worldPoint);
        this.localB = objB.worldToLocal(worldPoint);
        this.beta = 0.1; // Baumgarte stabilization factor

        this.worldA = new Vec2(0, 0);
        this.worldB = new Vec2(0, 0);
        this.rA = new Vec2(0, 0);
        this.rB = new Vec2(0, 0);
        this.K = mat_2x2(0, 0, 0, 0);

        // Pre-compute inverse masses / inertias
        this.invMassA = objA.isStatic ? 0 : 1 / objA.mass;
        this.invMassB = objB.isStatic ? 0 : 1 / objB.mass;
        this.invIA = objA.isStatic ? 0 : 1 / objA.momentOfInertia;
        this.invIB = objB.isStatic ? 0 : 1 / objB.momentOfInertia;
    }

    update() {
        // joint anchor positions
        this.worldA = this.bodyA.localToWorld(this.localA);
        this.worldB = this.bodyB.localToWorld(this.localB);
        this.rA = vec_2_sub(this.worldA, this.bodyA.position);
        this.rB = vec_2_sub(this.worldB, this.bodyB.position);

        this.invMassA = this.bodyA.isStatic ? 0 : 1 / this.bodyA.mass;
        this.invMassB = this.bodyB.isStatic ? 0 : 1 / this.bodyB.mass;
        this.invIA = this.bodyA.isStatic ? 0 : 1 / this.bodyA.momentOfInertia;
        this.invIB = this.bodyB.isStatic ? 0 : 1 / this.bodyB.momentOfInertia;
    }

    solve(dt) {
        const mA = this.invMassA, mB = this.invMassB;
        const iA = this.invIA, iB = this.invIB;
        const rA = this.rA, rB = this.rB;

        // effective mass matrix, also accounts for rotational effects
        this.K[0][0] = mA + mB + rA.y * rA.y * iA + rB.y * rB.y * iB;
        this.K[0][1] = -rA.y * rA.x * iA - rB.y * rB.x * iB;
        this.K[1][0] = this.K[0][1];
        this.K[1][1] = mA + mB + rA.x * rA.x * iA + rB.x * rB.x * iB;

        // velocity error
        const velA = vec_2_add(this.bodyA.velocity, vec_2_cross_sv(this.bodyA.angularVelocity, rA));
        const velB = vec_2_add(this.bodyB.velocity, vec_2_cross_sv(this.bodyB.angularVelocity, rB));
        const Cdot = vec_2_sub(velB, velA);

        // positional error
        const C = vec_2_sub(this.worldB, this.worldA);

        // bias term
        const bias = vec_2_scale(C, this.beta / dt);

        // impulse
        const impulse = mat_2_solve(this.K, vec_2_scale(vec_2_add(Cdot, bias), -1));

        // apply impulse
        this.bodyA.velocity = vec_2_sub(this.bodyA.velocity, vec_2_scale(impulse, mA));
        this.bodyA.angularVelocity -= iA * vec_2_cross(rA, impulse);
        this.bodyB.velocity = vec_2_add(this.bodyB.velocity, vec_2_scale(impulse, mB));
        this.bodyB.angularVelocity += iB * vec_2_cross(rB, impulse);
    }
}
```

## Minimizing velocity and positional errors

The goal of the RevoluteConstraint is to minimize its velocity and position error values. $C$ is the position error, which is the distance between the 2 points on the 2 objects that are nailed together. $\dot{C}$ is the velocity error, or the speed at which the 2 points on the 2 objects are diverging.

In calculus terms we would call these 2 variables:
- **$C$** which is the constraint's position error.
- **$C'$** ($C$ prime, also known as $\dot{C}$, or just the first derivative of $C$), which is the rate of change of the constraint's position error, a.k.a. the velocity error. In plain terms, it's the velocity that the constraint is moving away from the target position.

We want the velocity error to be 0 (meaning the points are not currently moving away from each other at all). And we also want the position error to be 0 (meaning the constraint is properly in place and the points are nailed together).

To do this, we need to apply impulses to the 2 objects every frame. Based on the constraint error values, and the point at which the objects are nailed together, we'll calculate an impulse to try to correct their velocities before they drift apart

In a perfect world/simulation with 100% accuracy, we could solve for just the velocity error. Before the constraints ever have a chance to drift apart, apply an impulse to cancel out any difference in velocity, and keep the relative velocity of the constraint points always perfectly at 0.

In reality, if we only solve for the velocity error, it would be very unstable. Due to small numerical errors frame to frame, the constraint would slowly drift away from the target position. To fix this, we need to also solve for the position error. This is where the bias term comes in.

## Baumgarte Stabilization

Basically, we feed a tiny amount of the position error (the bias term) into the velocity error to encourage the constraint to converge to the target position.

So, if the constraint moves away from its target position on the X/Y axes, the velocity error on those axes will increase slightly as well. This will cause the constraint to overshoot/overcorrect when solving for the velocity error, and snap it back to its target position.

We scale the position error by a small constant called $\beta$, (here we use 0.1, chosen because it seems to work well from my testing) and divide it by the time step ($dt$) to convert from position units to velocity units. This is called Baumgarte Stabilization:


```js
// bias term
const bias = C.scale(this.beta / dt);

// Then, we add the bias term to Cdot when solving for the impulse
const impulse = mat2x2Solve(this.K, Cdot.add(bias).scale(-1));
```

Baumgarte stabilization is one of the most common and simplest ways to stabilize constraints. The method was created by Jürgen W. Baumgarte in 1972, who introduced it as a way to stabilize constraints in physics simulations by modifying the equations of motion to include feedback terms that counteract constraint drift. It might not be the best, but it's simple and easy to implement so we'll use it here. A good alternative that's only slightly more complex is [mass-spring soft constraints](https://box2d.org/posts/2024/02/solver2d/) like Box2D uses.

## The Constraint Matrix

To find the exact impulses needed to apply to each body to counteract the velocity error (Cdot) at the constraint points, we will need to account for several factors at once:

- How much the mass of the 2 bodies will resist motion of the constraint points in the X and Y directions
- How much the moment of inertia of the 2 bodies resisting rotation contributes to resistance to motion of the constraint points in the X and Y directions
- How applying force off center could act as a lever to cause the bodies to have rotational velocity, thus affecting the constraint point velocity, increasing the velocity error ($\dot{C}$).
- How pushing in the X direction can cause motion in both the X and Y directions due to rotation, and same with pushing in the Y direction.

> [!NOTE]
> The mass matrix and all these factors are concerned with the point of application of force (the constraint points).
> $\dot{\mathbf{C}}$ is the relative velocity of the constraint points, not the relative velocity of the bodies themselves.
> Not only does the matrix account for the mass and inertia, but also calculates the effect of rotation on the X and Y velocity of the constraint points.

There's many different factors here to account for all at once to perfectly get the impulse we need which would make $\dot{C} = 0$. It ends up being a system of equations (2 variables and 2 equations), which can also be solved using a 2x2 matrix.

After solving the matrix, we will get an impulse vector that when scaled by the body's masses, and applied as rotation scaled by their moments of inertia, will cause $\dot{C}$ (the relative velocities of the constraint points) to equal 0.

## Deriving the Constraint Matrix

We can derive the matrix from these 4 lines which applies the impulse to the bodies:


```js
// apply impulse
this.bodyA.velocity = this.bodyA.velocity.sub(impulse.scale(mA));
this.bodyA.angularVelocity -= iA * rA.cross(impulse);
this.bodyB.velocity = this.bodyB.velocity.add(impulse.scale(mB));
this.bodyB.angularVelocity += iB * rB.cross(impulse);
```

The matrix is essentially predicting how these lines will affect the relative velocity of the constraint points for a given impulse.

When multiplied with any given impulse, the matrix should output what the change in relative velocity of the constraint points will be after applying the impulse. If we can construct a matrix that does this, we can solve for the impulse needed to create a change in relative velocity of exactly $-\dot{C}$, cancelling out the velocity error and making $\dot{C} = 0$.

Let's write out how each line will affect the velocity of the constraint points. $v_A$ and $v_B$ are the velocities of the constraint points, and $\omega_A$ and $\omega_B$ are the angular velocities of the bodies. $\Delta$ is the symbol for change in velocity. $J$ is the impulse vector, and $\times$ denotes a cross product operation. Each of these lines is a direct translation of the lines of code above:

$$
\begin{aligned}
\Delta v_A &= -m_A \mathbf{J} \\
\Delta \omega_A &= -i_A (\mathbf{r}_A \times \mathbf{J}) \\
\Delta v_B &= m_B \mathbf{J} \\
\Delta \omega_B &= i_B (\mathbf{r}_B \times \mathbf{J})
\end{aligned}
$$

By adding the velocity change due to linear motion and the velocity change due to rotation (using the cross product with the lever arm vector), we get the total velocity change at each constraint point:

$$
\begin{aligned}
\Delta \mathbf{vel}_A &= \Delta \mathbf{v}_A + \Delta \omega_A \times \mathbf{r}_A \\
\Delta \mathbf{vel}_B &= \Delta \mathbf{v}_B + \Delta \omega_B \times \mathbf{r}_B
\end{aligned}
$$

Plugging in the values from the previous equation, we get:

$$
\begin{aligned}
\Delta \mathbf{vel}_A &= -m_A \mathbf{J} - (i_A (\mathbf{r}_A \times \mathbf{J})) \times \mathbf{r}_A \\
\Delta \mathbf{vel}_B &= m_B \mathbf{J} + (i_B (\mathbf{r}_B \times \mathbf{J})) \times \mathbf{r}_B
\end{aligned}
$$

Now we expand out the first cross product:

$$
\begin{aligned}
\Delta \mathbf{vel}_A &= -m_A \mathbf{J} - i_A (r_{A,x} J_y - r_{A,y} J_x) \times \mathbf{r}_A \\
\Delta \mathbf{vel}_B &= m_B \mathbf{J} + i_B (r_{B,x} J_y - r_{B,y} J_x) \times \mathbf{r}_B
\end{aligned}
$$

And the second cross product is the 2D scalar form which goes like $s \times [x, y] = [-s \cdot y, s \cdot x]$, so we can calculate that and fully break everything into its X and Y components:

$$
\begin{aligned}
\Delta vel_{A,x} &= -m_A J_x - i_A (-r_{A,y}) (r_{A,x} J_y - r_{A,y} J_x) \\
\Delta vel_{A,y} &= -m_A J_y - i_A r_{A,x} (r_{A,x} J_y - r_{A,y} J_x) \\
\Delta vel_{B,x} &= m_B J_x + i_B (-r_{B,y}) (r_{B,x} J_y - r_{B,y} J_x) \\
\Delta vel_{B,y} &= m_B J_y + i_B r_{B,x} (r_{B,x} J_y - r_{B,y} J_x)
\end{aligned}
$$

Multiplying out the terms, we get:

$$
\begin{aligned}
\Delta vel_{A,x} &= -m_A J_x + i_A r_{A,x} r_{A,y} J_y - i_A r_{A,y}^2 J_x \\
\Delta vel_{A,y} &= -m_A J_y - i_A r_{A,x}^2 J_y + i_A r_{A,x} r_{A,y} J_x \\
\Delta vel_{B,x} &= m_B J_x - i_B r_{B,x} r_{B,y} J_y + i_B r_{B,y}^2 J_x \\
\Delta vel_{B,y} &= m_B J_y + i_B r_{B,x}^2 J_y - i_B r_{B,x} r_{B,y} J_x
\end{aligned}
$$

Now we can group and factor out the $J_x$ and $J_y$ terms:

$$
\begin{aligned}
\Delta vel_{A,x} &= -J_x (m_A + i_A r_{A,y}^2) + J_y (i_A r_{A,x} r_{A,y}) \\
\Delta vel_{A,y} &= -J_y (m_A + i_A r_{A,x}^2) + J_x (i_A r_{A,x} r_{A,y}) \\
\Delta vel_{B,x} &= J_x (m_B + i_B r_{B,y}^2) - J_y (i_B r_{B,x} r_{B,y}) \\
\Delta vel_{B,y} &= J_y (m_B + i_B r_{B,x}^2) - J_x (i_B r_{B,x} r_{B,y})
\end{aligned}
$$

And now by subtracting $\Delta vel_A$ from $\Delta vel_B$, splitting into X and Y components, and doing a final factoring out of $J_x$ and $J_y$, we can get this big equation which will tell us the change in relative velocity of the constraint points ($\dot{C}$) for any given impulse ($J_x$ and $J_y$):

$$
\begin{aligned}
\Delta \dot{C} &= \Delta vel_B - \Delta vel_A \\
\Delta \dot{C}_x &= J_x (m_A + m_B + i_A r_{A,y}^2 + i_B r_{B,y}^2) - J_y (i_A r_{A,x} r_{A,y} + i_B r_{B,x} r_{B,y}) \\
\Delta \dot{C}_x &= J_x (m_A + m_B + r_{A,y}^2 i_A + r_{B,y}^2 i_B) + J_y (-r_{A,x} r_{A,y} i_A - r_{B,x} r_{B,y} i_B) \\
\Delta \dot{C}_y &= J_x (-r_{A,x} r_{A,y} i_A - r_{B,x} r_{B,y} i_B) + J_y (m_A + m_B + r_{A,x}^2 i_A + r_{B,x}^2 i_B)
\end{aligned}
$$

Now if you're familiar with matrices, you can see that this is a system of 2 equations and 2 unknowns (Jx and Jy). If we formulate the same exact formula above as a 2x2 matrix, we get:


```js
this.K[0][0] = mA + mB + rA.y * rA.y * iA + rB.y * rB.y * iB; // X-X
this.K[0][1] = -rA.y * rA.x * iA - rB.y * rB.x * iB; // X-Y
this.K[1][0] = this.K[0][1]; // Y-X
this.K[1][1] = mA + mB + rA.x * rA.x * iA + rB.x * rB.x * iB; // Y-Y
```

From our calculations above put in matrix form, notice each term has a clear physical meaning:
- **K[0][0]**: When you push horizontally (X direction), this tells you how much the constraint points will move horizontally in response.
- **K[0][1]**: When you push horizontally (X direction), this tells you how much the constraint points will move vertically (Y direction) as a side effect of rotation.
- **K[1][0]**: When you push vertically (Y direction), this tells you how much the constraint points will move horizontally (X direction) as a side effect of rotation.
- **K[1][1]**: When you push vertically (Y direction), this tells you how much the constraint points will move vertically in response.

Boom! We have a matrix, that when multiplied with any impulse vector, will output the change in relative velocity of the constraint points ($\dot{C}$).

## Solving the Matrix System

Like I said before, now we have a matrix that when multiplied with an input vector, will output the change in $\dot{C}$:

$$ \mathbf{K} \mathbf{J} = \Delta \dot{\mathbf{C}} $$

$$
\Delta \dot{\mathbf{C}}
=
\begin{bmatrix}
    K_{00} & K_{01}\\
    K_{10} & K_{11}
\end{bmatrix}
\begin{bmatrix}
    J_x\\
    J_y
\end{bmatrix}
=
\begin{bmatrix}
    J_x K_{00} + J_y K_{01}\\
    J_x K_{10} + J_y K_{11}
\end{bmatrix}
$$


We can formulate the equation for $\Delta \dot{C}$ as a 2x2 matrix, because it exactly matches the structure of a matrix. The way 2x2 matrix by vector multiplication is defined is shown above, and you'll see, that the resulting X/Y vector (If you multiply impulse $\mathbf{J}$ with the entries of matrix $\mathbf{K}$) comes out to exactly our equation for $\Delta \dot{C}$. Next we need to use that matrix to solve for $\Delta \dot{C} = -\dot{C}$.

Formulating our equations for $\Delta \dot{C}_x$ and $\Delta \dot{C}_y$ as a matrix (and therefore a standardized system of linear equations) gives it a bunch of convenient properties, and now there are multiple paths we can take to solve them by leveraging algebra/linear algebra rules.
You could do substition using some basic algebra, and balance the equations solving for $J_x$ and $J_y$ one at a time.
You could do a full matrix inversion, which would then give you another matrix that when multiplied with the velocity error, would give you the impulse (going the opposite way, $\mathbf{K} \mathbf{J} = \dot{\mathbf{C}}$, whereas after it's inverted, $\mathbf{K}^{-1} \dot{\mathbf{C}} = \mathbf{J}$).
But since a lot of this tutorial is based on learnings from Box2D, we'll use a `mat_2x2_solve(mat, b)` with the same logic that Box2D uses to solve the equations:


```js
// 2x2 matrix solve using Cramer's rule
function mat2x2Solve(mat, b) {
    const a11 = mat[0][0], a12 = mat[0][1];
    const a21 = mat[1][0], a22 = mat[1][1];

    const det = a11 * a22 - a12 * a21;
    const invDet = det !== 0 ? 1.0 / det : 0;

    return new Vec2(
        invDet * (a22 * b.x - a12 * b.y),
        invDet * (a11 * b.y - a21 * b.x)
    );
}
```

The mat_2x2_solve function above uses Cramer's rule. If you want to learn more about it, I'd recommend [3Blue1Brown's video on the topic](https://www.youtube.com/watch?v=jBsC34PxzoM). You could also just use basic substition, and you will end up with an equivalent formula:

$$
\begin{aligned}
K_{00} J_x + K_{01} J_y &= -\dot{C}_x \\
K_{10} J_x + K_{11} J_y &= -\dot{C}_y
\end{aligned}
$$

From the first equation, we can solve for $J_x$:

$$ J_x = \frac{-\dot{C}_x - K_{01} J_y}{K_{00}} $$

Now substitute this expression for $J_x$ into the second equation:

$$ K_{10} \left( \frac{-\dot{C}_x - K_{01} J_y}{K_{00}} \right) + K_{11} J_y = -\dot{C}_y $$

Multiply through by $K_{00}$ and rearrange to solve for $J_y$:

$$
\begin{aligned}
K_{10} (-\dot{C}_x - K_{01} J_y) + K_{11} K_{00} J_y &= -\dot{C}_y K_{00} \\
-K_{10} \dot{C}_x - K_{10} K_{01} J_y + K_{11} K_{00} J_y &= -\dot{C}_y K_{00} \\
J_y (K_{00} K_{11} - K_{01} K_{10}) &= -\dot{C}_y K_{00} + \dot{C}_x K_{10} \\
J_y &= \frac{-\dot{C}_y K_{00} + \dot{C}_x K_{10}}{K_{00} K_{11} - K_{01} K_{10}}
\end{aligned}
$$

And then back-substitute to get $J_x$:

$$ J_x = \frac{-\dot{C}_x K_{11} + \dot{C}_y K_{01}}{K_{00} K_{11} - K_{01} K_{10}} $$

Notice that the denominator $(K_{00} K_{11} - K_{01} K_{10})$ is exactly the determinant of the $\mathbf{K}$ matrix, and the same formula is used above in `mat_2x2_solve`. So we get an equivalent result to the Cramer's rule method.

Now that we know how to solve the equation for $-\dot{C}$, let's finally apply the proper impulse to all of our constraints, solving them!


```js
class RevoluteConstraint extends Constraint {
    // ...
    solve(dt) {
        // ...
        // Solve the matrix system
        const impulse = mat2x2Solve(this.K, Cdot.add(bias).scale(-1));

        // Apply the impulse to each body, weighted by mass & inertia, to make $\dot{C} = 0$
        this.bodyA.velocity = this.bodyA.velocity.sub(impulse.scale(mA));
        this.bodyA.angularVelocity -= iA * rA.cross(impulse);
        this.bodyB.velocity = this.bodyB.velocity.add(impulse.scale(mB));
        this.bodyB.angularVelocity += iB * rB.cross(impulse);
    }
}

class PhysWorld {
    // ...
    update(dt) {
        this.solveConstraints(dt);
    }

    solveConstraints(dt) {
        for (const constraint of this.constraints) {
            constraint.update();
        }
        for (const constraint of this.constraints) {
            constraint.solve(dt);
        }
    }
}
```

> [!NOTE]
> Much of the code in this section is based on Box2D's implementation of constraint solving, see [here](https://github.com/erincatto/box2d/blob/af12713103083d4f853cfb1c65edaf96b0e43598/src/revolute_joint.c#L430) for the original point constraint solving implementation in Box2D's revolute constraint.


## Why Energy is Conserved

Intuitively, constraining 2 objects together shouldn't add energy to the system.
If these two objects were in a completely closed system with only them and their constraints, the constraints should only trade energy between the bodies, and not add any momentum or energy that wasn't already there.
This does actually hold true for our constraints, they don't add any energy to the system (aside from the Baumgarte term for error correction).
To me, this wasn't intuitively obvious why.

## Adding Warm Starting

Our revolute constraint works fine, but adding more links to the chain will cause it to sag more and more. One simple technique that helps reduce this sagging is **warm starting** - reusing impulse values from the previous frame as initial guesses for the current frame. This can be implemented by accumulating impulses and applying them at the start of each constraint solve:


```js
class RevoluteConstraint extends Constraint {
    constructor(objA, objB, worldPoint) {
        // Rest of constructor remains the same...

        // Warm starting properties
        this.useWarmStarting = true;
        this.accumulatedImpulse = new Vec2(0, 0);  // For point constraint warm starting
    }

    update(dt) {
        // Rest of update remains the same...

        // Warm starting: apply the accumulated point impulse from the previous frame
        if (this.useWarmStarting) {
            this.bodyA.applyImpulse(this.accumulatedImpulse.scale(-1), this.worldA);
            this.bodyB.applyImpulse(this.accumulatedImpulse, this.worldB);
        }
    }

    solve(dt, useBias) {
        // Rest of solve remains the same...

        // Accumulate the impulse for warm starting at the very end
        if (this.useWarmStarting) {
            this.accumulatedImpulse = this.accumulatedImpulse.add(impulse);
        }
    }
}
```

Warm starting helps stabilize the long chain but is still not perfect. In the next section we'll explore iterative constraint solvers which can stabilize our simulation even further.

## Limits and Motors

Basic revolute joints allow for free 360-degree rotation. However, in many real-world scenarios, you need more control:

- **Angular Limits**: These restrict the relative rotation between two bodies to a specific range (e.g., a knee joint). When a limit is violated, the solver applies a restorative impulse to push the bodies back into the allowed range.
- **Motors**: These apply a constant torque to reach or maintain a specific target velocity (e.g., a car wheel or a rotor blade). The motor impulse is clamped by a `maxMotorForce` to prevent it from overcoming other constraints (like a wall).

### Advanced Implementation Example

Below is a more complex demonstration featuring travel limits and motorized rotors.

## Soft Constraints (Mass–Spring–Damper)

An improved alternative to Baumgarte stabilization is soft constraints.
This is a more modern technique used in the [current versions of Box2D](https://box2d.org/posts/2024/02/solver2d/#soft-constraints).
Originally I was just going to include Baumgarte in this tutorial, but was having trouble getting the walking ragdoll simulation stable enough with it.
Soft constraints let you dampen the response of the constraint positional error and tune it to your needs, often leading to more stability.

Here's the core function that Box2D uses to calculate the soft constraint parameters.
It takes in a frequency in hertz (the spring's natural frequency), a damping ratio, and the time step.
It returns a bias rate similar to Baumgarte, but also a mass scale and impulse scale to simulate a mass-spring-damper system:


```js
// Equivalent to Box2D's b2MakeSoft function
function getSoftConstraintParams(hertz, dampingRatio, timeStep) {
    if (hertz === 0) {
        return { biasRate: 0, massScale: 0, impulseScale: 0 };
    }
    const omega = 2 * Math.PI * hertz;
    const a1 = 2 * dampingRatio + timeStep * omega;
    const a2 = timeStep * omega * a1;
    const a3 = 1 / (1 + a2);
    return {
        biasRate: omega / a1,
        massScale: a2 * a3,
        impulseScale: a3,
    };
}
```

Usage inside the solver looks like this. We form a soft bias from position error using `biasRate`, add a compliance term to the effective mass via `massScale`, and scale the resulting impulse by `impulseScale`:


```js
class RevoluteConstraint extends Constraint {
    // ...

    solve(dt, useBias) {
        // Rest of solve remains the same...

        // Get soft constraint parameters and use them to compute bias
        const { biasRate, massScale, impulseScale } = getSoftConstraintParams(hz, zeta, dt);
        const bias = C.scale(biasRate);

        // Solve for impulse as normal
        let impulse = mat2x2Solve(this.K, Cdot.add(bias).scale(-1));

        // Apply massScale and impulseScale soft constraint parameters
        impulse.x = massScale * impulse.x - impulseScale * this.accumulatedImpulse.x;
        impulse.y = massScale * impulse.y - impulseScale * this.accumulatedImpulse.y;

        // Then apply the impulse to the bodies the same way as before...
    }
}
```

> [!IMPORTANT]
> **Tuning:** Hertz controls stiffness (higher feels tighter), dampingRatio controls how bouncy it is (0 = oscillates, 1 ≈ critically damped).
> For contact constraints we'll use 30hz with 10 damping and for regular joints we'll use 60hz with 0 damping.
> You can also dial these to intentionally simulate actual springs.
