import CollisionSimulation from './CollisionSimulation';
import InteractiveImpulseDiagram from './InteractiveImpulseDiagram';
import Markdown from '../../components/Markdown';
import IMPULSE_MARKDOWN from './Impulse.md?raw';

export default function ImpulseDynamicsBlog() {
    const sections = (IMPULSE_MARKDOWN || '').split('---');

    return (
        <div class="blog-card" style="padding: 40px; color: #fff; max-width: 900px; margin: 0 auto;">
            <h2 style="font-size: 2.5rem; margin-bottom: 20px; background: linear-gradient(135deg, #4ea8de, #56cfe1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                Impulse & Collision Resolution
            </h2>

            {/* Part 1: Intro */}
            {sections[0] && <Markdown content={sections[0]} />}

            {/* Interactive Diagram 1: Vectors (NOW INTERACTIVE) */}
            <div style="margin: 40px 0;">
                <InteractiveImpulseDiagram />
            </div>

            {/* Part 2: Derivation */}
            <div class="derivation-content">
                {sections.slice(1).map((section, i) => (
                    <>
                        {i > 0 && <hr style="border: 0; border-top: 1px solid #333; margin: 40px 0;" />}
                        <Markdown content={section} />
                    </>
                ))}
            </div>

            <hr style="border: 0; border-top: 1px solid #4ea8de; margin: 60px 0; opacity: 0.3;" />

            {/* Interactive Lab: Simulation */}
            <div style="margin: 40px 0;">
                <h3 style="color: #4ea8de; margin-bottom: 20px;">Interactive Lab: Impulse Simulation</h3>
                <CollisionSimulation />
                <p style="color: #888; font-size: 14px; text-align: center; margin-top: 15px;">
                    Use the <strong>Right Arrow</strong> to step forward, <strong>Left Arrow</strong> to step backward, or <strong>Space</strong> to Play/Pause.
                </p>
            </div>

            <div style="background: rgba(230, 126, 34, 0.1); padding: 20px; border-left: 4px solid #e67e22; border-radius: 4px; margin-top: 40px;">
                <h4 style="color: #e67e22; margin-top: 0;">Pro Tip: Sequential Impulses</h4>
                <p style="font-size: 14px; margin-bottom: 0;">
                    In real engines, we don't just solve for $j$ once. We apply these impulses in a loop (iterations) to satisfy multiple constraints simultaneously (like friction and collision) across all contact points.
                </p>
            </div>
        </div>
    );
}
