import Markdown from '../../../components/Markdown';
import LAGRANGE_MARKDOWN from './LagrangeMultiplier.md?raw';
import LagrangeMultiplier2D from './LagrangeMultiplier2D';
import LagrangeMultiplier3D from './LagrangeMultiplier3D';

export default function LagrangeMultiplier() {
    const sections = (LAGRANGE_MARKDOWN || '').split('---');

    return (
        <div class="blog-card" style="padding: 40px; color: #fff; max-width: 900px; margin: 0 auto;">
            <h2 style="font-size: 2.5rem; margin-bottom: 20px; background: linear-gradient(135deg, #f1c40f, #e67e22); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                Lagrange Multipliers: The Math of Constraints
            </h2>

            {/* Part 1: Intro */}
            {sections[0] && <Markdown content={sections[0]} />}

            {/* 2D Interactive Visualization */}
            <div style="margin: 40px 0;">
                <h3 style="color: #f1c40f; margin-bottom: 20px;">1. Interactive 2D: Gradient Alignment</h3>
                <LagrangeMultiplier2D />
            </div>

            {/* Section 2: Visualization explanation */}
            {sections[1] && <Markdown content={sections[1]} />}

            {/* 3D Visualization */}
            <div style="margin: 40px 0;">
                <h3 style="color: #f1c40f; margin-bottom: 20px;">2. 3D Perspective: The Intersection</h3>
                <LagrangeMultiplier3D />
            </div>

            {/* Video Insight */}
            <div style="margin: 40px 0; border-radius: 12px; overflow: hidden; border: 1px solid #333; background: #000;">
                <div style="padding: 15px; background: #1a1a1a; border-bottom: 1px solid #333;">
                    <h4 style="margin: 0; color: #f1c40f; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                        Interactive Insight: Understanding Lagrange Multipliers Visually
                    </h4>
                </div>
                <iframe
                    width="100%"
                    height="500"
                    src="https://www.youtube.com/embed/5A39Ht9Wcu0?list=PLjHDjmY5z0pn_p5haaVYA-Epp5Hwx1gXO"
                    title="Understanding Lagrange Multipliers Visually"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen
                ></iframe>
            </div>

            {/* Remaining Sections */}
            <div class="derivation-content">
                {sections.slice(2).map((section) => (
                    <>
                        <hr style="border: 0; border-top: 1px solid #333; margin: 40px 0;" />
                        <Markdown content={section} />
                    </>
                ))}
            </div>

            <div style="background: rgba(241, 196, 15, 0.1); padding: 25px; border-left: 4px solid #f1c40f; border-radius: 4px; margin-top: 50px;">
                <h4 style="color: #f1c40f; margin-top: 0;">Beyond Impulses</h4>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 0;">
                    While impulses solve "instantaneous" velocity changes (collisions), Lagrange multipliers solve for the "continuous" forces that maintain joints and resting contacts. In modern engines like Box2D, these are often unified into a **Sequential Impulse** solver, which effectively solves for these multipliers iteratively.
                </p>
            </div>
        </div>
    );
}
