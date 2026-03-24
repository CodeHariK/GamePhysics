import { createSignal, Switch, Match } from 'solid-js';
import './Blog.css';
import Math from './components/Math';

// Import Demos
import IntegratorIntro from './examples/Integrator/IntegratorBlog';
import SATBlog from './examples/SAT/SATBlog';
import StressTestDemo from './examples/StressTestDemo';
import RotationFrictionDemo from './examples/RotationFrictionDemo';
import RotationalDynamicsBlog from './examples/RotationalDynamicsBlog';
import EnergyDynamicsBlog from './examples/Energy/EnergyDynamicsBlog';
import ImpulseDynamicsBlog from './examples/Impulse/ImpulseDynamicsBlog';
import LagrangeMultiplier from './examples/Maths/LagrangianMultiplier/LagrangeMultiplier';
import SkateboardDerivation from './examples/Skateboard/SkateboardDerivation';


const TABS = [
    { id: 'torque', label: 'Torque & Inertia' },
    { id: 'energy', label: 'Energy & Lagrangian' },
    { id: 'integrator', label: 'Integrators' },
    { id: 'collision', label: 'Collision & SAT' },
    { id: 'impulse', label: 'Impulse Resolution' },
    { id: 'lagrange', label: 'Lagrange Multipliers' },
    { id: 'stress', label: 'Stress Test' },
    { id: 'friction', label: 'Friction & Rotation' },
    { id: 'constraints', label: 'Constraints' },
];

export default function Blog() {
    const [activeTab, setActiveTab] = createSignal('constraints');

    return (
        <div class="blog-container">
            <header class="title-header">
                <h1>Game Physics Labs</h1>
                <p class="subtitle">A Deep Dive into Rigid Body Dynamics</p>
            </header>

            <div class="main-layout">
                <nav class="tabs-nav">
                    {TABS.map(tab => (
                        <button
                            class={`tab-btn ${activeTab() === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <main class="content-section">
                    <Switch>

                        {/* TAB 5: TORQUE & INERTIA */}
                        <Match when={activeTab() === 'torque'}>
                            <RotationalDynamicsBlog />
                        </Match>

                        {/* TAB 1: INTEGRATORS (MERGED) */}
                        <Match when={activeTab() === 'integrator'}>
                            <IntegratorIntro />
                        </Match>

                        {/* TAB 2: COLLISION & SAT */}
                        <Match when={activeTab() === 'collision'}>
                            <SATBlog />
                        </Match>

                        {/* TAB NEW: IMPULSE RESOLUTION */}
                        <Match when={activeTab() === 'impulse'}>
                            <ImpulseDynamicsBlog />
                        </Match>

                        {/* TAB 3: STRESS TEST */}
                        <Match when={activeTab() === 'stress'}>
                            <div class="blog-card">
                                <h2>06. Robust Dynamics Solver</h2>
                                <p>
                                    To simulate hundreds of bodies without "jitter," we use **Sequential Impulses**. We iterate through constraints multiple times per frame.
                                </p>

                                <div class="math-block">
                                    <Math block tex="J = \text{Impulse} = \frac{-(1+e) \cdot v_{rel} \cdot n}{n \cdot n (1/m_1 + 1/m_2)}" />
                                </div>

                                <div class="demo-container">
                                    <StressTestDemo />
                                </div>
                            </div>
                        </Match>

                        {/* TAB 4: FRICTION & ROTATION */}
                        <Match when={activeTab() === 'friction'}>
                            <div class="blog-card">
                                <h2>07. Rotation & Friction</h2>
                                <p>
                                    Friction is simulated as a **tangent impulse**, clamped by the **Coulomb Friction** model using the normal force magnitude.
                                </p>

                                <div class="math-block">
                                    <Math block tex="|F_{friction}| \le \mu \cdot |F_{normal}|" />
                                </div>

                                <div class="demo-container">
                                    <RotationFrictionDemo />
                                </div>
                            </div>
                        </Match>

                        {/* TAB 6: ENERGY & LAGRANGIAN */}
                        <Match when={activeTab() === 'energy'}>
                            <EnergyDynamicsBlog />
                        </Match>

                        {/* TAB NEW: LAGRANGE MULTIPLIERS */}
                        <Match when={activeTab() === 'lagrange'}>
                            <LagrangeMultiplier />
                        </Match>

                        {/* TAB 0: CONSTRAINTS */}
                        <Match when={activeTab() === 'constraints'}>
                            <div class="blog-card">
                                <SkateboardDerivation />
                            </div>
                        </Match>

                    </Switch>
                </main>
            </div>

            <footer style="text-align: center; color: #444; margin-top: 50px; font-size: 12px; padding-bottom: 50px;">
                &copy; 2026 Game Physics Labs | Powered by Solid.js & Custom SAT Engine
            </footer>
        </div>
    );
}
