This is where a physics engine goes from being a static collection of data to a living simulation. You are stepping into the realm of numerical analysis and solving Ordinary Differential Equations (ODEs).

In game physics, an "Integrator" looks at an object's current state (position, velocity, forces) and mathematically predicts where it will be a fraction of a second later ($dt$ or Delta Time).

The choice of integrator dictates the soul of your engine. Let's break them down, implement them in TypeScript, and analyze exactly why certain ones cause games to explode while others remain stable.

### Part 3: The Integrator

To understand integrators, we must look at how they handle **Energy Conservation**. In a perfect simulation of a swinging pendulum or a bouncing spring, total energy (Kinetic + Potential) should remain perfectly constant.

Here is an interactive demonstration. Play with the time step and switch between integrators to see how they artificially add or remove energy from a simple spring system.

### The TypeScript Implementations

Let's look at how we write these for our engine. We will add a `step(dt: number)` method to our `Body` class (or handle it in an overarching `World` class). For simplicity, we assume acceleration is calculated as $a = \frac{F}{m}$.

#### 1. Explicit (Forward) Euler

The most intuitive, but the most dangerous. It uses the *current* velocity to update position, and the *current* acceleration to update velocity.
$v(t+dt) = v(t) + a(t) \cdot dt$
$x(t+dt) = x(t) + v(t) \cdot dt$

```typescript
// Inside Body.ts
public integrateExplicitEuler(dt: number): void {
    if (this.isStatic) return;
    
    // a = F * (1/m)
    const accelX = this.force.x * this.invMass;
    const accelY = this.force.y * this.invMass;

    // Update position using CURRENT velocity
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Update velocity
    this.velocity.x += accelX * dt;
    this.velocity.y += accelY * dt;
}

```

**Why it behaves that way:** It assumes the derivative (velocity) is constant across the entire time step $dt$. Because forces like springs or gravity change as position changes, overshooting the curve mathematically injects phantom energy into the system. The simulation will literally explode over time.

#### 2. Implicit (Backward) Euler

Instead of looking forward, Implicit Euler looks backward. It solves for the velocities and positions at the *next* time step based on the forces that *will* exist at that next time step.
$v(t+dt) = v(t) + a(t+dt) \cdot dt$
$x(t+dt) = x(t) + v(t+dt) \cdot dt$

*Note: We won't write generic TypeScript for this here. Because acceleration depends on position, you have an equation where the future state is on both sides of the equals sign. Solving this requires calculating the Jacobian matrix and solving a system of linear equations (like Newton-Raphson).*
**Why it behaves that way:** It is "unconditionally stable." Instead of adding energy, the math inherently *damps* (removes) energy. Things settle down quickly, making it great for cloth simulation where you want things to stretch but not explode, but terrible for bouncy rigid bodies.

#### 3. Semi-Implicit Euler (The Industry Standard)

This is what Box2D, Matter.js, and most game engines use. It is a tiny, one-line swap from Explicit Euler. We update the velocity first, and then use the *new* velocity to update the position.
$v(t+dt) = v(t) + a(t) \cdot dt$
$x(t+dt) = x(t) + v(t+dt) \cdot dt$

```typescript
public integrateSemiImplicitEuler(dt: number): void {
    if (this.isStatic) return;

    const accelX = this.force.x * this.invMass;
    const accelY = this.force.y * this.invMass;

    // 1. Update velocity FIRST
    this.velocity.x += accelX * dt;
    this.velocity.y += accelY * dt;

    // 2. Update position using the NEW velocity
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
}

```

**Why it behaves that way:** It is a "Symplectic" integrator. While it doesn't perfectly conserve the exact energy of the system, it perfectly conserves a "shadow" Hamiltonian (a system very close to the real one). Energy oscillates slightly but remains bounded. It never explodes, and it is incredibly cheap to compute.

#### 4. Verlet Integration

Famous for particle systems (like early Hitman ragdolls or spiderwebs). It doesn't store velocity explicitly. It calculates current velocity implicitly by looking at the difference between the current position and the previous frame's position.
$x(t+dt) = 2x(t) - x(t-dt) + a(t) \cdot dt^2$

```typescript
// Requires adding `public previousPosition: Vector2;` to the Body class
public integrateVerlet(dt: number): void {
    if (this.isStatic) return;

    const accelX = this.force.x * this.invMass;
    const accelY = this.force.y * this.invMass;

    const tempX = this.position.x;
    const tempY = this.position.y;

    // pos = pos + (pos - prevPos) + a * dt^2
    this.position.x += (this.position.x - this.previousPosition.x) + accelX * (dt * dt);
    this.position.y += (this.position.y - this.previousPosition.y) + accelY * (dt * dt);

    this.previousPosition.x = tempX;
    this.previousPosition.y = tempY;
}

```

**Why it behaves that way:** It is highly stable and time-reversible. It handles harsh constraints (like pulling a rope taut) beautifully because if you explicitly move the position to satisfy a constraint, the "velocity" automatically updates on the next frame.

#### 5. Runge-Kutta 4 (RK4)

The gold standard for scientific accuracy. Instead of taking one blind jump across $dt$, it calculates the forces at four different points (the start, two midpoints, and the end) and takes a weighted average.

```typescript
// Pseudo-code conceptualization, as true RK4 requires 
// evaluating the whole world's force function 4 times per frame.
function RK4(state, dt, calculateForcesFunction) {
    const k1 = calculateForcesFunction(state);
    const k2 = calculateForcesFunction(state + k1 * dt/2);
    const k3 = calculateForcesFunction(state + k2 * dt/2);
    const k4 = calculateForcesFunction(state + k3 * dt);
    
    return state + (dt / 6) * (k1 + 2*k2 + 2*k3 + k4);
}

```

**Why it behaves that way:** The error rate scales at $O(dt^4)$, meaning cutting the time step in half makes it 16 times more accurate. However, evaluating collision detection and forces four times per frame is far too CPU-heavy for real-time games with hundreds of objects.

### The Verdict for Our Engine

For the core of this tutorial series and our engine, we will exclusively use **Semi-Implicit Euler**. It is the perfect intersection of performance, code simplicity, and stability.

Now that our bodies can move accurately over time and respond to gravity, they will just fall through the void forever.

---

This is a brilliant pivot. If you are building a physics engine from scratch, you cannot just trust that the formulas work; you need to understand the numerical analysis behind *why* they behave the way they do.

To prove exactly why Forward Euler explodes (adds energy) and Backward Euler dampens (removes energy), we need to look at **Taylor Series expansions**, **Truncation Error**, and **Phase Space Area**.

To do this, we use the standard testing ground for physics integrators: the **Simple Harmonic Oscillator** (a mass on a spring without friction).

### 1. The Model System

The equation for a simple spring (where mass $m=1$ and stiffness $k=1$) is:


$$\frac{d^2x}{dt^2} = -x$$

To solve this numerically, we split this second-order differential equation into two first-order equations (velocity and position):

1. $\frac{dx}{dt} = v$
2. $\frac{dv}{dt} = -x$

In vector notation, our state is $Y = \begin{bmatrix} x \\ v \end{bmatrix}$.

---

### 2. Forward (Explicit) Euler: Derivation & Error

We derive integrators using the **Taylor Series expansion**, which predicts a function's future value based on its current derivatives.

$$y(t + h) = y(t) + h \cdot y'(t) + \frac{h^2}{2!} y''(t) + \frac{h^3}{3!} y'''(t) + \dots$$

 *(where $h$ is our time step, $\Delta t$)*

Forward Euler simply chops off everything after the first derivative.


$$y_{n+1} = y_n + h \cdot f(t_n, y_n)$$

**Error Calculation:**
Because we discarded $\frac{h^2}{2} y''(t)$ and beyond, the error for a *single step* (Local Truncation Error) is proportional to $O(h^2)$. However, over a full simulation of $t$ seconds, we take $t/h$ steps. Multiplying the local error by the number of steps gives us a **Global Truncation Error of $O(h)$**. This is a "First-Order" integrator.

#### Why it adds energy (Stability Analysis)

Let's apply Forward Euler to our spring system:
$x_{n+1} = x_n + h \cdot v_n$
$v_{n+1} = v_n - h \cdot x_n$

We can write this as a matrix transformation:


$$\begin{bmatrix} x_{n+1} \\ v_{n+1} \end{bmatrix} = \begin{bmatrix} 1 & h \\ -h & 1 \end{bmatrix} \begin{bmatrix} x_n \\ v_n \end{bmatrix}$$

Let's call that transformation matrix $A$. In Hamiltonian systems (like perfectly bouncy physics), **the determinant of the transformation matrix represents the change in phase space volume (energy).** For a perfectly conservative system, the determinant must equal exactly $1$.

Let's calculate the determinant of Forward Euler's matrix $A$:


$$\det(A) = (1)(1) - (h)(-h) = 1 + h^2$$

Because $h$ (time step) is always greater than 0, **$1 + h^2$ is always strictly greater than $1$.** This is the mathematical proof: Every single frame, Forward Euler multiplies the phase space volume by $1 + h^2$. It artificially manufactures energy out of thin air, causing the simulation to explode.

---

### 3. Backward (Implicit) Euler: Derivation & Error

Backward Euler evaluates the derivative at the *future* time step.


$$y_{n+1} = y_n + h \cdot f(t_{n+1}, y_{n+1})$$

The error profile is the exact same as Forward Euler: Local error is $O(h^2)$, Global error is $O(h)$. It is also a First-Order integrator.

#### Why it removes energy (Stability Analysis)

Let's apply it to our spring:
$x_{n+1} = x_n + h \cdot v_{n+1}$
$v_{n+1} = v_n - h \cdot x_{n+1}$

Notice that the future state ($n+1$) is on both sides of the equation. We have to do algebra to solve for the future state. Rearranging the terms:
$x_{n+1} - h \cdot v_{n+1} = x_n$
$h \cdot x_{n+1} + v_{n+1} = v_n$

In matrix form:


$$\begin{bmatrix} 1 & -h \\ h & 1 \end{bmatrix} \begin{bmatrix} x_{n+1} \\ v_{n+1} \end{bmatrix} = \begin{bmatrix} x_n \\ v_n \end{bmatrix}$$

To find the matrix that updates our state, we must invert the matrix on the left. The inverse of $\begin{bmatrix} 1 & -h \\ h & 1 \end{bmatrix}$ is $\frac{1}{1+h^2} \begin{bmatrix} 1 & h \\ -h & 1 \end{bmatrix}$.

So our update matrix $B$ is:


$$B = \begin{bmatrix} \frac{1}{1+h^2} & \frac{h}{1+h^2} \\ \frac{-h}{1+h^2} & \frac{1}{1+h^2} \end{bmatrix}$$

Let's find the determinant of $B$:


$$\det(B) = \left(\frac{1}{1+h^2}\right)\left(\frac{1}{1+h^2}\right) - \left(\frac{h}{1+h^2}\right)\left(\frac{-h}{1+h^2}\right) = \frac{1 + h^2}{(1+h^2)^2} = \frac{1}{1+h^2}$$

Because $h > 0$, the denominator is larger than the numerator. **$\det(B)$ is always strictly less than $1$.**
Mathematical proof: Every single frame, Backward Euler multiplies the energy by a fraction. It artificially destroys energy, causing moving objects to drag to a halt as if moving through molasses.

---

### Phase Space Diagrams

To truly visualize this, we use a Phase Diagram. Instead of plotting position over time, we plot **Position ($x$) on the X-axis** and **Velocity ($v$) on the Y-axis**.

* In a perfect system, a swinging pendulum traces a perfect closed circle in phase space. Energy is constant.
* If it spirals outward, energy is being added.
* If it spirals inward, energy is being lost.

Here is an interactive phase space widget. Watch how the matrix determinants we just calculated dictate the visual geometry of the simulation.

This mathematical reality is exactly why we decided to use **Semi-Implicit Euler** for the TypeScript engine in Part 3. By updating velocity first, its transformation matrix yields a determinant of exactly $1$. It perfectly preserves the phase space volume, making it incredibly stable for game physics.

Now that the foundational math of our rigid bodies and integrators is airtight, we can actually start smashing them into each other.

----

It is completely normal to feel overwhelmed by that! Building a physics engine is notorious for suddenly dropping you into the deep end of university-level calculus and mechanics.

Let's step completely away from the heavy math notation. You don't need a math degree to build this engine; you just need to understand the *concepts* behind the formulas.

Here is the plain-English translation of what those three things mean and why they matter for your code.

### 1. Where did the Taylor Series come from?

**The Concept: The "Predict the Future" Formula**

Imagine you are driving a car on the highway. You close your eyes for exactly one second (this one second is our time step, $dt$). Can you predict exactly where your car will be when you open your eyes?

* **Level 1 Guess:** You know your current position. You guess you haven't moved. (Terrible guess).
* **Level 2 Guess:** You look at your speedometer (Velocity). You multiply your speed by one second and add it to your position. (Better guess).
* **Level 3 Guess:** You look at the speedometer, *and* you feel how hard your foot is pressing the gas pedal (Acceleration). You calculate both to guess your future position. (Highly accurate guess).

The **Taylor Series** is simply the formal mathematical name for this "Level 3 Guess." It is a formula that predicts the future of an object by looking at what it is doing right now (its position, its velocity, its acceleration, etc.).

In our physics engine, we use the Taylor Series to say: *"Okay, frame 1 just ended. Based on how fast this box is moving right now, where should I draw it on frame 2?"* Forward Euler is basically just the "Level 2 Guess"—it ignores acceleration during that tiny fraction of a second, which makes it inaccurate over time.

### 2. What is a Hamiltonian System?

**The Concept: The "Perfect Vacuum" Reality**

In the real world, if you drop a bouncy ball, it bounces a little less high every time until it stops. This happens because energy is lost to air resistance, heat, and sound.

A **Hamiltonian System** is a perfectly magical, idealized physics world where absolutely zero energy is ever lost or created. If you drop a bouncy ball in a Hamiltonian system, it will bounce back to the exact same height, forever, until the end of time.

**Why we care:** When you are coding a game engine, you want your *baseline engine* to be Hamiltonian (perfect). You want total control. If an asteroid is floating through space, it shouldn't randomly speed up or slow down because of bad math. You want the math to keep energy perfectly stable. Then, you—the programmer—can *manually* write a line of code to add friction or air drag if you want things to slow down.

### 3. Why the Determinant?

**The Concept: The "Area Squisher"**

Imagine you take all the energy in your game—the speed of all the boxes, the gravity, the bounciness—and you represent it as a square drawn on a piece of paper. The area of that square represents your total energy.

Every single frame (60 times a second), your Integrator math takes that square and redraws it for the next frame. The **Determinant** is just a math tool that tells us if the rule we used to redraw the square changed its size.

* **Determinant = 1:** The square might rotate or stretch into a rectangle, but the *total area inside* stays exactly the same. Energy is preserved. (This is what Semi-Implicit Euler does).
* **Determinant > 1:** The math secretly acted like a magnifying glass. The square got 1% bigger. Next frame, it gets 1% bigger again. Suddenly, a box sitting still on the floor shoots into the sky at the speed of light. (This is Forward Euler).
* **Determinant < 1:** The math acted like a shrink ray. The square loses 1% of its area every frame. Your bouncy ball feels like it's moving through thick mud. (This is Backward Euler).

### The Big Takeaway for Your Engine

You don't need to write the Taylor Series or calculate determinants in your TypeScript code. You just need to know the moral of the story: **Always update your velocity first, and then use that new velocity to update your position.** By doing that one simple trick (Semi-Implicit Euler), the math gods are happy, the "determinant is 1," and your game won't randomly explode.

---

These are exactly the right questions to ask. When you are building a physics engine, treating these formulas as "black boxes" is dangerous. Understanding the derivation gives you complete control over your engine's stability.

Let's break down exactly where the math comes from, step by step.

### 1. Where does the Taylor Series come from?

The Taylor Series is a fundamental tool in calculus used to approximate what a function will do in the future based on what it is doing right now.

If we have a function for position over time, $x(t)$, the Taylor Series states that we can find the future position $x(t + h)$ (where $h$ is our time step, or Delta Time) using an infinite sum of its derivatives:

$$x(t + h) = x(t) + h \cdot x'(t) + \frac{h^2}{2!} \cdot x''(t) + \frac{h^3}{3!} \cdot x'''(t) + \dots$$

In physics, we have specific names for the derivatives of position:

* The first derivative $x'(t)$ is **Velocity** $v(t)$.
* The second derivative $x''(t)$ is **Acceleration** $a(t)$.
* The third derivative $x'''(t)$ is **Jerk** $j(t)$.

If we substitute those physics terms into the mathematical Taylor Series, we get the exact equation for motion:

$$x(t + h) = x(t) + h \cdot v(t) + \frac{1}{2} h^2 \cdot a(t) + \frac{1}{6} h^3 \cdot j(t) + \dots$$

**How we get Forward Euler:**
Computers cannot calculate an infinite series. We have to chop the equation off (truncate it) at some point. **Forward Euler simply chops off everything after velocity.** 

$$x(t + h) \approx x(t) + h \cdot v(t)$$

By throwing away the acceleration term ($\frac{1}{2}h^2a$) and everything after it, we introduce a mathematical error. Because the largest piece we threw away has an $h^2$ in it, we say the "truncation error" is proportional to $O(h^2)$.

### 2. How did we get that particular Matrix?

To understand integrators, we test them on a simple, predictable system: a mass on a spring (a Simple Harmonic Oscillator).

Hooke's Law for a spring is $Force = -k \cdot x$ (where $k$ is stiffness and $x$ is the stretch distance).
Newton's Law is $Force = m \cdot a$.
Therefore, $m \cdot a = -k \cdot x$.

To make the math as simple as possible to study, mathematicians set the mass $m=1$ and stiffness $k=1$. This simplifies our acceleration to just:


$$a = -x$$

Now, let's look at the **Forward Euler** formulas we derived for our next frame ($n+1$):

1. **Position update:** $x_{n+1} = x_n + h \cdot v_n$
2. **Velocity update:** $v_{n+1} = v_n + h \cdot a_n$

Because we know $a = -x$, we substitute that into the velocity update:

1. $x_{n+1} = x_n + h \cdot v_n$
2. $v_{n+1} = v_n - h \cdot x_n$

**Converting to a Matrix:**
We want to represent this system of linear equations as a single matrix transformation. We are looking for a matrix that multiplies with our current state $\begin{bmatrix} x_n \\ v_n \end{bmatrix}$ to give us our future state.

$$\begin{bmatrix} x_{n+1} \\ v_{n+1} \end{bmatrix} = \begin{bmatrix} A & B \\ C & D \end{bmatrix} \begin{bmatrix} x_n \\ v_n \end{bmatrix}$$

If you remember matrix multiplication, the top row is calculated as $(A \cdot x_n) + (B \cdot v_n)$.
Looking at our position equation ($x_{n+1} = 1 \cdot x_n + h \cdot v_n$), we can see that **$A = 1$** and **$B = h$**.

The bottom row is calculated as $(C \cdot x_n) + (D \cdot v_n)$.
Looking at our velocity equation ($v_{n+1} = -h \cdot x_n + 1 \cdot v_n$), we can see that **$C = -h$** and **$D = 1$**.

Plug those in, and we get our transformation matrix for Forward Euler:


$$\begin{bmatrix} 1 & h \\ -h & 1 \end{bmatrix}$$

### 3. Why does the Determinant have to be 1?

This connects linear algebra directly to the laws of physics, specifically **Liouville's Theorem**.

In physics, if you plot an object's Position on the X-axis and Velocity on the Y-axis, you create a "Phase Space" diagram. Total energy in a spring system is calculated as $Energy = \frac{1}{2}kx^2 + \frac{1}{2}mv^2$. If you graph this equation on your X-Y phase space, it forms a circle (or an ellipse).

**The area inside that circle is directly proportional to the total energy of the system.**

In linear algebra, a matrix is just a mathematical instruction that stretches, squishes, or rotates space. The **Determinant** of a matrix tells you exactly how much the *area* of a shape changes after the matrix modifies it.

* If you draw a square with an area of 5, and multiply it by a matrix with a determinant of 2, the new shape will have an area of 10.
* If you multiply it by a matrix with a determinant of 1, the shape might skew into a weird parallelogram, but its area will remain exactly 5.

**The Conclusion:**
Because the area on our Phase Space graph *is* our total energy, the math dictates that if we want our physics engine to conserve energy (like a real-world idealized vacuum), the matrix doing the updating **must** have a determinant of exactly 1.

* **Forward Euler's matrix** has a determinant of $1 + h^2$. It scales the area (energy) up by a tiny fraction every single frame, causing the simulation to explode.
* **Semi-Implicit Euler** (where we update velocity first, then position) forms a matrix with a determinant of exactly $1$. It perfectly preserves the area, which is why it is the rock-solid foundation of Box2D, Matter.js, and the engine we are building.

---
