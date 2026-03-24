import SkateboardDemo from './SkateboardDemo';
import Markdown from '../../components/Markdown';
import skateboardContent from './SkateboardConstraint.md?raw';
import Math from '../../components/Math';

export default function SkateboardDerivation() {
    return (
        <>

            <h2>08. Position & Velocity Constraints</h2>
            <p>
                Until now, we've focused on <strong>inequality constraints</strong>—collisions that push bodies apart only when they overlap.
                However, many physical systems require <strong>equality constraints</strong>, where a body is forced to stay exactly on a path or maintain a fixed distance from a point.
            </p>

            <div class="math-block">
                <p>A position constraint is defined by an equation <Math tex="C(p) = 0" block={false} />.</p>
                <p>For a body to satisfy this over time, its velocity must also satisfy <Math tex="C'(p) = Jv = 0" block={false} />, where <Math tex="J" block={false} /> is the Jacobian matrix.</p>
            </div>

            <p>
                In the demo below, the skater is constrained to the surface of a half-pipe.
                The engine solves this by calculating the nearest point on the track and applying an <strong>impulse</strong> to keep the velocity tangent to the surface.
            </p>

            <div class="demo-container">
                <SkateboardDemo />
            </div>

            <div class="blog-card" style="margin-top: 40px; border-top: 1px solid rgba(52, 152, 219, 0.2); padding-top: 30px; background: #0a0a0a; color: #ccc; border-radius: 12px; padding: 40px; font-family: 'Rajdhani', sans-serif;">
                <Markdown content={skateboardContent} />
            </div>


            <h3>The Mechanics of "Sticking"</h3>
            <p>
                We extend our engine's <code>World</code> class to handle a list of general constraints.
                During each physics step, the solver iterates through these constraints alongside collisions:
            </p>
            <ul>
                <li><strong>Velocity Solver:</strong> Applies an impulse <Math tex="\lambda" block={false} /> to satisfy <Math tex="Jv = 0" block={false} />. We use <em>Baumgarte stabilization</em> to slowly pull the body back if it drifts off the track.</li>
                <li><strong>Position Solver:</strong> Performs a non-linear projection to snap the body back to the surface, counteracting numerical drift.</li>
            </ul>
        </>
    );
}
