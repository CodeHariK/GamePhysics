import { Math, InlineMath } from '../../components/Math';
import BrachistochroneDemo from './BrachistochroneDemo';
import DoublePendulumDemo from './DoublePendulumDemo';

export default function EnergyDynamicsBlog() {
    return (
        <div class="blog-card">
            <h2>Symmetry & Energy: The Lagrangian</h2>

            <p>
                In previous sections, we focused on **Forces** and **Torques**—the Newtonian approach to dynamics. While intuitive, Newton's laws can become cumbersome when dealing with complex constraints. Today, we look at the universe through the lens of **Energy** and **Symmetry**, leading us to the powerful **Lagrangian Mechanics**.
            </p>

            <h3>1. Momentum: The Quantity of Motion</h3>
            <p>
                Linear momentum <InlineMath formula="\mathbf{p}" /> is the product of an object's mass and its velocity. It represents the "push" an object has.
            </p>
            <div class="math-block">
                <Math block tex="\mathbf{p} = m\mathbf{v}" />
            </div>
            <p>
                Newton's Second Law is more fundamentally stated as the rate of change of momentum: <InlineMath formula="\mathbf{F} = \frac{d\mathbf{p}}{dt}" />. In an isolated system, momentum is conserved—a consequence of <b>translational symmetry</b>.
            </p>

            <p>
                Similarly, <b>Angular Momentum</b> <InlineMath formula="\mathbf{L}" /> describes rotational motion:
            </p>
            <div class="math-block">
                <Math block tex="\mathbf{L} = \mathbf{I}\boldsymbol{\omega}" />
            </div>
            <p>
                Where <InlineMath formula="\mathbf{I}" /> is the moment of inertia tensor and <InlineMath formula="\boldsymbol{\omega}" /> is the angular velocity.
            </p>

            <h3>2. The Two Faces of Energy</h3>
            <p>
                Energy comes in two primary forms in classical mechanics: <b>Kinetic (T)</b> and <b>Potential (V)</b>.
            </p>

            <h4>Kinetic Energy (T)</h4>
            <p>
                Energy associated with motion. For a rigid body, it consists of translational and rotational components:
            </p>
            <div class="math-block">
                <Math block tex="T = \frac{1}{2}mv^2 + \frac{1}{2}I\omega^2" />
            </div>

            <h4>Potential Energy (V)</h4>
            <p>
                Energy stored due to position or configuration. Common examples include:
            </p>
            <ul>
                <li><b>Gravity:</b> <InlineMath formula="V_g = mgh" /></li>
                <li><b>Springs (Hooke's Law):</b> <InlineMath formula="V_s = \frac{1}{2}kx^2" /></li>
            </ul>

            <h3>3. The Hamiltonian & Conservation</h3>
            <p>
                The total energy of a system, the <b>Hamiltonian (H)</b>, is the sum of kinetic and potential energy:
            </p>
            <div class="math-block">
                <Math block tex="E_{total} = H = T + V" />
            </div>
            <p>
                If a system is <b>conservative</b> (no non-conservative forces like friction or air resistance), then <InlineMath formula="\frac{dE}{dt} = 0" />. In game physics, we strive for "Symplectic" integrators (like Velocity Verlet) to maintain this conservation and prevent orbital drift or explosion.
            </p>

            <h3>4. Lagrangian Mechanics: Nature is Lazy</h3>
            <p>
                In Newtonian mechanics, we ask: <i>"What force is pushing this object right now?"</i> In Lagrangian mechanics, we ask: <i>"What path would this object take to spend its energy most efficiently?"</i>
            </p>

            <p>
                We define the **Lagrangian (L)** as the difference between kinetic and potential energy:
            </p>
            <div class="math-block">
                <Math block tex="L = T - V" />
            </div>

            <p>
                Think of <InlineMath formula="L" /> as the "net energy" of the system at any instant.
            </p>

            <h4>What is "Action"?</h4>
            <p>
                The **Action (S)** is simply the "total score" of the Lagrangian over a period of time. Imagine taking a snapshot of the Lagrangian every millisecond and adding them all up. Mathematically, this "adding up over time" is an <b>integral</b>:
            </p>
            <div class="math-block">
                <Math block tex="S = \int_{t_1}^{t_2} L \, dt" />
            </div>

            <p>
                The <b>Principle of Least Action</b> states that nature is "lazy"—it always chooses a path where the total Action is <i>stationary</i> (usually a minimum). It doesn't waste kinetic energy and it doesn't stay in high potential energy areas longer than it has to.
            </p>

            <p>
                From this simple rule—<i>Nature path-finds to minimize Action</i>—we can derive all of classical physics using the <b>Euler-Lagrange Equations</b>:
            </p>
            <div class="math-block">
                <Math block tex="\frac{d}{dt} \left( \frac{\partial L}{\partial \dot{q}_i} \right) - \frac{\partial L}{\partial q_i} = 0" />
            </div>

            <h3>5. Deriving the Equations of Motion</h3>
            <p>
                How do we get from the "stationary action" to the actual equations of motion? We use the <b>Calculus of Variations</b>. We consider a small change (variation) in the path <InlineMath formula="\delta q(t)" />, where the start and end points are fixed: <InlineMath formula="\delta q(t_1) = \delta q(t_2) = 0" />.
            </p>

            <p>
                Applying the variation to the Action integral and using <b>Integration by Parts</b>, we arrive at the Euler-Lagrange formula. This allows us to handle complex constraints (like a bead on a wire) without manually calculating constraint forces.
            </p>

            <h3>6. Case Study: The Brachistochrone Problem</h3>
            <p>
                The <b>Brachistochrone</b> (from Greek: "shortest time") is the classic problem: <i>"What is the shape of the path between two points that allows a bead to slide down in the shortest possible time?"</i>
            </p>

            <p>
                Using the Lagrangian approach, we want to minimize the total travel time <InlineMath formula="T" />. Since <InlineMath formula="v = \frac{ds}{dt}" />, the time is:
            </p>
            <div class="math-block">
                <Math block tex="T = \int \frac{ds}{v} = \int \frac{\sqrt{1 + y'^2}}{\sqrt{2gy}} dx" />
            </div>

            <p>
                Our "Lagrangian" to minimize is <InlineMath formula="f(y, y') = \sqrt{\frac{1 + (y')^2}{y}}" />. Because this doesn't depend on <InlineMath formula="x" />, we use the <b>Beltrami Identity</b>:
            </p>
            <div class="math-block">
                <Math block tex="f - y' \frac{\partial f}{\partial y'} = C" />
            </div>

            <p>
                Solving this differential equation yields the <b>Cycloid</b>—the path traced by a point on a rolling wheel. Even though a straight line is the shortest <i>distance</i>, gravity accelerates the bead faster on a cycloid, "buying" speed early to finish the journey sooner.
            </p>

            <BrachistochroneDemo />

            <h3>7. Scaling Complexity: The Double Pendulum</h3>
            <p>
                While the Brachistochrone involves finding an <i>optimal</i> path, the <b>Double Pendulum</b> shows how the Lagrangian handles <i>complex coupling</i>. In Newtonian mechanics, you would have to solve for the tension in both rods—vectors that change direction and magnitude every frame.
            </p>

            <p>
                In Lagrangian mechanics, we simply write down the kinetic and potential energy in terms of the angles <InlineMath formula="\theta_1" /> and <InlineMath formula="\theta_2" />:
            </p>
            <div class="math-block">
                <Math block tex="L = T(\theta, \dot{\theta}) - V(\theta)" />
            </div>

            <p>
                The resulting <b>Euler-Lagrange Equations</b> are two coupled second-order ODEs. They reveal the chaotic nature of the system: a tiny change in initial conditions leading to wildly different outcomes. Yet, as the charts below show, the <b>Total Energy</b> remains conserved!
            </p>

            <DoublePendulumDemo />

            <p>
                <b>Why use this?</b> Because it handles constraints automatically. If a bead is on a wire, you don't need to calculate the "normal force" of the wire; you simply define your coordinate <InlineMath formula="q" /> as the distance along the wire, and the Lagrangian gives you the physics for free.
            </p>
        </div>
    );
}
