const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const errors = [];
    page.on('pageerror', err => errors.push({ type: 'PageError', msg: err.message }));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push({ type: 'ConsoleError', msg: msg.text() });
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Click through each tab
    const tabs = ['Torque & Inertia', 'Energy & Lagrangian', 'Integrators', 'Collision & SAT', 'Impulse Resolution', 'Lagrange Multipliers', 'Stress Test', 'Friction & Rotation', 'Constraints', 'Inequality'];
    
    for (const tab of tabs) {
        console.log(`Checking tab: ${tab}`);
        const btn = await page.locator(`text="${tab}"`);
        if (await btn.count() > 0) {
            await btn.click();
            await page.waitForTimeout(500); // Give time to render/crash
        } else {
            console.log(`  Tab not found: ${tab}`);
        }
    }

    await browser.close();

    if (errors.length > 0) {
        console.log("RUNTIME ERRORS FOUND:");
        console.dir(errors, {depth: null});
    } else {
        console.log("SUCCESS: No runtime errors found across all tabs.");
    }
})();
