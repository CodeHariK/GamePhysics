import Markdown from '../../components/Markdown';
import SATContent from './SAT.md?raw';
import ClippingContent from './Clipping.md?raw';
import SATLab from './SATLab';
import ClippingLab from './ClippingLab';

export default function SATBlog() {
    return (
        <div style="font-family: 'Rajdhani', sans-serif; background: #0a0a0a; color: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 60px; max-width: 1000px; margin: 0 auto; line-height: 1.6;">
            
            {/* --- SECTION 1: SAT --- */}
            <section style="display: flex; flex-direction: column; gap: 30px;">
                <div style="border-bottom: 1px solid rgba(52, 152, 219, 0.2); padding-bottom: 15px;">
                    <h1 style="margin: 0; font-family: 'Orbitron', sans-serif; letter-spacing: 4px; background: linear-gradient(90deg, #3498db, #2ecc71); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px;">01. SEPARATING AXIS THEOREM</h1>
                    <p style="color: #555; margin-top: 5px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Narrow-Phase Collision Detection</p>
                </div>

                <div style="padding: 0 10px;">
                    <Markdown content={SATContent} />
                </div>

                <SATLab />

                <div style="padding: 20px; background: rgba(52, 152, 219, 0.05); border-left: 4px solid #3498db; border-radius: 4px; font-size: 14px; color: #aaa;">
                    <strong>Observation:</strong> In the lab above, the shadows on the white axis represent the range of the shape. If there is <em>any</em> gap between the two shadows, there is no collision.
                </div>
            </section>

            {/* --- SECTION 2: CLIPPING --- */}
            <section style="display: flex; flex-direction: column; gap: 30px;">
                <div style="border-bottom: 1px solid rgba(0, 251, 255, 0.2); padding-bottom: 15px;">
                    <h1 style="margin: 0; font-family: 'Orbitron', sans-serif; letter-spacing: 4px; background: linear-gradient(90deg, #00fbff, #0099ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px;">02. SUTHERLAND-HODGMAN CLIPPING</h1>
                    <p style="color: #555; margin-top: 5px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Contact Manifold Generation</p>
                </div>

                <div style="padding: 0 10px;">
                    <Markdown content={ClippingContent} />
                </div>

                <ClippingLab />

                <div style="padding: 20px; background: rgba(0, 251, 255, 0.05); border-left: 4px solid #00fbff; border-radius: 4px; font-size: 14px; color: #aaa;">
                    <strong>Stability Note:</strong> Clipping creates a 1D contact segment. This allows the physics engine to apply vertical forces and frictional torque at multiple points, keeping the shapes from falling through each other during complex stacks.
                </div>
            </section>

            <footer style="text-align: center; border-top: 1px solid #222; padding-top: 30px; margin-top: 20px; color: #444; font-size: 12px; letter-spacing: 1px;">
                END OF COLLISION DETECTION MODULE
            </footer>
        </div>
    );
}
