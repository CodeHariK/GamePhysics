import Markdown from '../../../components/Markdown';
import jacobianContent from './JacobianBlog.md?raw';
import JacobianIterativeDemo from './JacobianIterativeDemo';
import JacobianRevoluteDemo from './JacobianRevoluteDemo';
import JacobianSwirlyDemo from './JacobianSwirlyDemo';

export default function JacobianBlog() {
    // Split the content to insert demos in between
    
    // Part 1: Intro up to Swirly Visualization
    const parts1 = jacobianContent.split('### **3. The Interactive Visualization**');
    const intro = parts1[0];
    const rest1 = parts1[1] || '';
    
    // Part 2: Swirly section up to Revolute Joint section
    const parts2 = rest1.split('Here is an interactive visualization of this exact matrix.');
    const swirlySection = parts2[0];
    const rest2 = parts2[1] || '';
    
    // Part 3: Revolute section up to Global Solver section
    const parts3 = rest2.split('Here is an interactive widget showing exactly why we need this iterative solver.');
    const revoluteSection = parts3[0];
    const globalSection = parts3[1] || '';

    return (
        <div class="blog-container" style={{
            "max-width": '900px',
            margin: '0 auto',
            padding: '20px',
            "font-family": "'JetBrains Mono', monospace",
            "line-height": '1.6',
            color: '#eee',
            display: 'flex',
            "flex-direction": 'column',
            gap: '40px'
        }}>
            <div class="blog-card" style={{
                background: 'rgba(20, 20, 20, 0.8)',
                "backdrop-filter": 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                "border-radius": '16px',
                padding: '40px',
                "box-shadow": '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}>
                <Markdown content={intro} />
                
                <h3 style={{ color: '#60a5fa', "margin-top": '20px' }}>3. The Interactive Visualization</h3>
                <div style={{ margin: '30px 0' }}>
                    <JacobianSwirlyDemo />
                </div>
                <Markdown content={swirlySection} />
                
                <div style={{ margin: '30px 0' }}>
                    <JacobianRevoluteDemo />
                </div>
                <Markdown content={revoluteSection} />

                <div style={{ margin: '30px 0' }}>
                    <JacobianIterativeDemo />
                </div>
                <Markdown content={globalSection} />

                <div style={{ 
                    padding: '20px', 
                    background: 'rgba(52, 152, 219, 0.05)', 
                    "border-left": '4px solid #3498db', 
                    "border-radius": '4px', 
                    "font-size": '14px', 
                    color: '#aaa', 
                    "margin-top": '40px' 
                }}>
                    <strong>Summary:</strong> The Jacobian is the bridge between the world of positions and the world of forces. It allows us to define complex constraints geometrically and solve them linearly, making stable real-time physics possible.
                </div>
            </div>
        </div>
    );
}
