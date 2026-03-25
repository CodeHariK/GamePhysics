const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Go to the main site where Inequality demo is default
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  
  // Wait a moment for initial scene (Boxes) to settle
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/physics_boxes.png' });
  console.log('Saved Boxes');

  // Switch to Composite scene
  const compositeBtn = await page.locator('text="COMPOSITE"');
  if (await compositeBtn.count() > 0) {
    await compositeBtn.click();
    await page.waitForTimeout(500); // Wait for items to fall
    await page.screenshot({ path: '/tmp/physics_composite_initial.png' });
    console.log('Saved Composite Initial');
    
    // Let it settle for 3 seconds to prove it doesn't sink
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/physics_composite_settled.png' });
    console.log('Saved Composite Settled');
  }

  // Switch to Bouncy scene
  const bouncyBtn = await page.locator('text="BOUNCY"');
  if (await bouncyBtn.count() > 0) {
    await bouncyBtn.click();
    await page.waitForTimeout(2000); // Wait for bouncing to disperse
    await page.screenshot({ path: '/tmp/physics_bouncy.png' });
    console.log('Saved Bouncy');
  }

  await browser.close();
  console.log('All screenshots saved');
})();
