import Markdown from '../../../components/Markdown';
import revoluteContent from './RevoluteBlog.md?raw';
import RevoluteIterativeDemo from './RevoluteIterativeDemo';
import RevoluteMinimalDemo from './RevoluteMinimalDemo';
import RevoluteAdvancedDemo from './RevoluteAdvancedDemo';

export default function RevoluteBlog() {
    // Split the content to insert demos in between
    const parts = revoluteContent.split('## Interactive Example');
    const intro = parts[0];
    const rest = parts[1] || '';
    
    // Further split to put the minimal demo at the end
    const restParts = rest.split('## Limits and Motors');
    const theory = restParts[0];
    const limitsAndMotors = restParts[1] || '';

    const finalParts = limitsAndMotors.split('## Soft Constraints');
    const limitsContent = finalParts[0];
    const softConstraints = finalParts[1] || '';

    return (
        <div class="blog-container" style="max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Inter', monospace; line-height: 1.6; color: #eee; display: flex; flex-direction: column; gap: 40px;">
            <div class="blog-card" style="background: rgba(20, 20, 20, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
                <Markdown content={intro} />
                
                <h2 id="interactive-example" style="color: #3498db; margin-top: 40px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">04. INTERACTIVE SOLVER</h2>
                <div style="margin: 20px 0;">
                    <RevoluteIterativeDemo />
                </div>

                <Markdown content={theory} />

                <h2 id="limits-and-motors" style="color: #9b59b6; margin-top: 40px; border-bottom: 2px solid #9b59b6; padding-bottom: 10px;">05. LIMITS & MOTORS</h2>
                <Markdown content={'## Limits and Motors' + limitsContent} />
                <div style="margin: 20px 0;">
                    <RevoluteAdvancedDemo />
                </div>
                
                {softConstraints && (
                    <>
                        <h2 id="soft-constraints" style="color: #2ecc71; margin-top: 40px; border-bottom: 2px solid #2ecc71; padding-bottom: 10px;">06. SOFT CONSTRAINTS & ITERATION</h2>
                        <Markdown content={'## Soft Constraints' + softConstraints} />
                    </>
                )}

                <h2 id="minimal-demo" style="color: #e67e22; margin-top: 40px; border-bottom: 2px solid #e67e22; padding-bottom: 10px;">07. MINIMAL IMPLEMENTATION</h2>
                <div style="margin: 20px 0;">
                    <RevoluteMinimalDemo />
                </div>
                
                <div style="padding: 20px; background: rgba(230, 126, 34, 0.05); border-left: 4px solid #e67e22; border-radius: 4px; font-size: 14px; color: #aaa; margin-top: 20px;">
                    <strong>Minimal Demo:</strong> This version replicates the minimal `simple_phys.js` implementation, featuring a dynamic chain creation tool and responsive dragging.
                </div>
            </div>
        </div>
    );
}