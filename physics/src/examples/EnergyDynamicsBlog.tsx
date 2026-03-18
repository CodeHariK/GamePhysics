import { Math, InlineMath } from '../components/Math';

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

            <h3>4. Lagrangian Mechanics: The Path of Least Action</h3>
            <p>
                While the Hamiltonian looks at the <i>sum</i> of energy, the **Lagrangian (L)** looks at the <i>difference</i>:
            </p>
            <div class="math-block">
                <Math block tex="L = T - V" />
            </div>

            <p>
                Lagrangian mechanics is built on the <b>Principle of Least Action</b>. It states that nature always follows the path that "minimizes" (strictly, makes stationary) the **Action** <InlineMath formula="S" />, which is the integral of the Lagrangian over time:
            </p>
            <div class="math-block">
                <Math block tex="S = \int_{t_1}^{t_2} L(q, \dot{q}, t) \, dt" />
            </div>

            <p>
                From this principle, we derive the <b>Euler-Lagrange Equations</b>, which provide the equations of motion for any generalized coordinates <InlineMath formula="q" />:
            </p>
            <div class="math-block">
                <Math block tex="\frac{d}{dt} \left( \frac{\partial L}{\partial \dot{q}_i} \right) - \frac{\partial L}{\partial q_i} = 0" />
            </div>

            <h3>5. Deriving the Euler-Lagrange Equations</h3>
            <p>
                How do we get from the "stationary action" to the actual equations of motion? We use the <b>Calculus of Variations</b>. We consider a small change (variation) in the path <InlineMath formula="\delta q(t)" />, where the start and end points are fixed: <InlineMath formula="\delta q(t_1) = \delta q(t_2) = 0" />.
            </p>

            <p>
                The variation of the action is:
            </p>
            <div class="math-block">
                <Math block tex="\delta S = \delta \int_{t_1}^{t_2} L(q, \dot{q}, t) \, dt = 0" />
            </div>

            <p>
                Applying the variation inside the integral:
            </p>
            <div class="math-block">
                <Math block tex="\int_{t_1}^{t_2} \left( \frac{\partial L}{\partial q} \delta q + \frac{\partial L}{\partial \dot{q}} \delta \dot{q} \right) dt = 0" />
            </div>

            <p>
                Note that <InlineMath formula="\delta \dot{q} = \frac{d}{dt} \delta q" />. We can use <b>Integration by Parts</b> on the second term:
            </p>
            <div class="math-block">
                <Math block tex="\int_{t_1}^{t_2} \frac{\partial L}{\partial \dot{q}} \frac{d}{dt} \delta q \, dt = \left[ \frac{\partial L}{\partial \dot{q}} \delta q \right]_{t_1}^{t_2} - \int_{t_1}^{t_2} \frac{d}{dt} \left( \frac{\partial L}{\partial \dot{q}} \right) \delta q \, dt" />
            </div>

            <p>
                Since the endpoints are fixed (<InlineMath formula="\delta q = 0" /> at <InlineMath formula="t_1, t_2" />), the boundary term vanishes. Substituting back into the original variation:
            </p>
            <div class="math-block">
                <Math block tex="\int_{t_1}^{t_2} \left( \frac{\partial L}{\partial q} - \frac{d}{dt} \frac{\partial L}{\partial \dot{q}} \right) \delta q \, dt = 0" />
            </div>

            <p>
                For this to be true for <i>any</i> variation <InlineMath formula="\delta q" />, the term inside the parentheses must be zero. Thus, we arrive at the <b>Euler-Lagrange Equation</b>:
            </p>
            <div class="math-block">
                <Math block tex="\frac{d}{dt} \left( \frac{\partial L}{\partial \dot{q}} \right) - \frac{\partial L}{\partial q} = 0" />
            </div>

            <p>
                <b>Why use this?</b> Because it handles constraints automatically. If a bead is on a wire, you don't need to calculate the "normal force" of the wire; you simply define your coordinate <InlineMath formula="q" /> as the distance along the wire, and the Lagrangian gives you the physics for free.
            </p>
        </div>
    );
}
