import { Math, InlineMath } from '../../components/Math';

import IntegratorLab from './IntegratorLab';
import PendulumLab from './PendulumLab';
import OrbitalLab from './OrbitalLab';

export default function IntegratorIntro() {
    return (
        <>
            <div class="integrator-intro">
                <section class="blog-section">
                    <h2>01. The Geometry of Stability</h2>
                    <p>
                        Numerical integration is the art of approximating the continuous laws of physics using discrete time steps.
                        However, not all approximations are created equal. The difference between a stable orbit and an exploding
                        simulation often boils down to a single property: <b>Symplecticity</b>.
                    </p>

                    <h3>The Taylor Series Foundation</h3>
                    <p>
                        Most integrators are derived from the Taylor expansion of the state vector <InlineMath formula="x(t + \Delta t)" />:
                    </p>
                    <Math formula="x(t + \Delta t) = x(t) + \dot{x}(t)\Delta t + \frac{1}{2}\ddot{x}(t)\Delta t^2 + \mathcal{O}(\Delta t^3)" />
                    <p>
                        <b>Explicit Euler</b> (Forward Euler) simply truncates this series after the first derivative:
                    </p>
                    <Math formula="x_{n+1} = x_n + v_n \Delta t" />
                    <Math formula="v_{n+1} = v_n + a(x_n, v_n) \Delta t" />

                    <div class="theory-card">
                        <h4>Why Explicit Euler Explodes</h4>
                        <p>
                            Consider a simple harmonic oscillator <InlineMath formula="\ddot{x} = -x" />. In matrix form, the update step is:
                        </p>
                        <Math formula="\begin{pmatrix} x_{n+1} \\ v_{n+1} \end{pmatrix} = \begin{pmatrix} 1 & \Delta t \\ -\Delta t & 1 \end{pmatrix} \begin{pmatrix} x_n \\ v_n \end{pmatrix}" />
                        <p>
                            The <b>Jacobian Determinant</b> of this transformation is <InlineMath formula="\det(J) = 1 + \Delta t^2" />.
                            Since <InlineMath formula="\det(J) > 1" />, the phase space area expands with every step. This isn't physics;
                            it's a numerical energy injection.
                        </p>
                    </div>

                    <h3>Implicit Euler: The Damping Void</h3>
                    <p>
                        <b>Implicit Euler</b> (Backward Euler) evaluates the acceleration at the <i>next</i> state:
                    </p>
                    <Math formula="x_{n+1} = x_n + v_{n+1} \Delta t" />
                    <Math formula="v_{n+1} = v_n + a(x_{n+1}, v_{n+1}) \Delta t" />
                    <p>
                        Following the same Jacobian analysis for the harmonic oscillator:
                    </p>
                    <Math formula="\det(J) = \frac{1}{1 + \Delta t^2}" />
                    <p>
                        Because <InlineMath formula="\det(J) < 1" />, the system constantly loses area in phase space. Energy is
                        artificially drained, leading to "numerical damping" where everything eventually spirals into a frozen state.
                    </p>

                    <div class="theory-card highlight">
                        <h4>Symplectic Integration: Area Conservation</h4>
                        <p>
                            <b>Semi-Implicit Euler</b> (Euler-Cromer) and <b>Verlet</b> are symplectic. They satisfy <InlineMath formula="\det(J) = 1" />.
                        </p>
                        <p>
                            Area is preserved, meaning energy oscillates around the true value rather than drifting indefinitely.
                            For orbits and long-running games, this is the gold standard.
                        </p>
                    </div>

                    <h3>Higher Order: Runge-Kutta</h3>
                    <p>
                        While Euler methods are first-order <InlineMath formula="\mathcal{O}(\Delta t)" />, we can sample the derivative
                        multiple times to cancel out higher-order error terms.
                    </p>
                    <ul>
                        <li><b>RK2 (Midpoint):</b> Samples velocity at the half-step. <InlineMath formula="\mathcal{O}(\Delta t^2)" /> accuracy.</li>
                        <li><b>RK4:</b> The "workhorse" of scientific computing. Four samples combined weighted to cancel terms up to <InlineMath formula="\mathcal{O}(\Delta t^4)" />.</li>
                    </ul>
                    <p>
                        <i>Note: RK4 is not symplectic. While extremely accurate for short durations, it can eventually drift in ways that Verlet doesn't.</i>
                    </p>
                </section>

            </div>

            <div class="separator-line" style="margin: 80px 0; border-top: 1px solid #222;"></div>
            <h1 style="text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 2rem; color: #444; margin-bottom: 40px;">LABS & EXPERIMENTS</h1>

            <div class="blog-card">
                <h2>02. Linear Dynamics: mass-spring</h2>
                <p>
                    At the heart of every physics engine is the integrator. Here, we simulate a **Simple Harmonic Oscillator** to compare mathematical methods in a 4-panel analysis.
                </p>

                <div class="demo-container">
                    <IntegratorLab />
                </div>

                <h2 style="margin-top: 80px;">03. Non-Linear Dynamics: Pendulum</h2>
                <p>
                    Unlike springs, a **Pendulum** has a restoring force proportional to $\sin(\theta)$, making it non-linear and more sensitive to integration errors.
                </p>

                <div class="demo-container">
                    <div style="padding: 10px; background: #333; font-size: 12px; color: #aaa;">EXPERIMENT: PENDULUM STABILITY & ENERGY</div>
                    <PendulumLab />
                </div>

                <h2 style="margin-top: 80px;">04. Orbital Mechanics: 2-Body</h2>
                <p>
                    Gravity follows the inverse-square law. Small numerical errors in position lead to massive errors in gravitational pull, causing orbits to spiral out or crash.
                </p>

                <div class="demo-container">
                    <div style="padding: 10px; background: #333; font-size: 12px; color: #aaa;">SIMULATION: SUN-EARTH ORBITAL STABILITY</div>
                    <OrbitalLab />
                </div>
            </div>
        </>
    );
}
