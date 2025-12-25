const { test, expect } = require('@playwright/test');

test('open visual test page and verify balanced view renders', async ({ page }) => {
    // Attach console/page error handlers to capture client-side failures in the test output
    page.on('console', msg => console.log('PAGE LOG>', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR>', err && err.message ? err.message : String(err)));
    page.on('requestfailed', req => console.log('REQUEST FAILED>', req.url(), req.failure() && req.failure().errorText));

    // Navigate to the visual test page served by the Flask dev server
    await page.goto('http://127.0.0.1:5005/static/dev/visual-test.html');

    // Wait for the test card open button and click it
    await page.waitForSelector('.btn-open-balanced', { timeout: 30000 });
    await page.click('.btn-open-balanced');

    // Wait for deterministic readiness signal emitted by the balanced renderer
    await page.waitForSelector('#balancedContentContainer[data-balanced-ready="1"]', { timeout: 30000 });

    // Assert that the balanced container has content
    const balancedCount = await page.$$eval('#balancedContentContainer', els => els.filter(e => (e.textContent || '').trim().length > 0).length);
    expect(balancedCount).toBeGreaterThan(0);
});
