import { createSignal, Switch, Match } from 'solid-js';
import './Blog.css';
import Math from './components/Math';

// Import Demos
import IntegratorIntro from './examples/Integrator/IntegratorBlog';
import SATVisualization from './examples/SATDemo';
import StressTestDemo from './examples/StressTestDemo';
import RotationFrictionDemo from './examples/RotationFrictionDemo';

const TABS = [
    { id: 'integrator', label: 'Integrators' },
    { id: 'collision', label: 'Collision & SAT' },
    { id: 'stress', label: 'Stress Test' },
    { id: 'friction', label: 'Friction & Rotation' }
];

export default function Blog() {
    const [activeTab, setActiveTab] = createSignal('integrator');

    return (
        <div class="blog-container">
            <header class="title-header">
                <h1>Game Physics Labs</h1>
                <p class="subtitle">A Deep Dive into Rigid Body Dynamics</p>
            </header>

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
                    {/* TAB 1: INTEGRATORS (MERGED) */}
                    <Match when={activeTab() === 'integrator'}>
                        <IntegratorIntro />
                    </Match>

                    {/* TAB 2: COLLISION & SAT */}
                    <Match when={activeTab() === 'collision'}>
                        <div class="blog-card">
                            <h2>05. Detection: SAT & Broadphase</h2>
                            <p>
                                Collision detection is a two-step process. First, the **Broadphase** filters out pairs that are too far apart to touch using a **Spatial Hash Grid**.
                            </p>

                            <p>
                                Second, the **Narrowphase** uses the **Separating Axis Theorem (SAT)** to find the exact penetration depth and contact normal.
                            </p>

                            <div class="math-block">
                                <Math block tex="\text{overlap} = \min(\text{projA.max} - \text{projB.min}, \text{projB.max} - \text{projA.min})" />
                            </div>

                            <div class="demo-container">
                                <SATVisualization />
                            </div>
                        </div>
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
                </Switch>
            </main>

            <footer style="text-align: center; color: #444; margin-top: 50px; font-size: 12px; padding-bottom: 50px;">
                &copy; 2026 Game Physics Labs | Powered by Solid.js & Custom SAT Engine
            </footer>
        </div>
    );
}
