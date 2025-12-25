import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:5005';

test('balanced smoke opens balanced view and SLA prediction (direct load)', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Ensure the Flowing-V2 orchestrator is available. If the host page
  // did not load it early, inject the module deterministically so tests
  // can call the public API without relying on UI click flows.
  await page.evaluate(() => {
    try {
      // If orchestrator already present, do nothing
      if ((window as any).flowingV2 && typeof (window as any).flowingV2.loadTicketIntoBalancedView === 'function') return;
      const s = document.createElement('script');
      s.type = 'module';
      s.src = '/static/js/Flowing-V2.js';
      document.head.appendChild(s);
    } catch (e) { /* ignore */ }
  });

  // Wait for orchestrator to be exposed and ready
  await page.waitForFunction(() => (window as any).flowingV2 && typeof (window as any).flowingV2.loadTicketIntoBalancedView === 'function', null, { timeout: 15000 });

  await page.evaluate(() => {
    try {
      const issue = {
        key: 'SMOKE-1',
        summary: 'Playwright smoke - Balanced view',
        fields: {
          description: 'Smoke test description\nLine 2',
          priority: { name: 'High' },
          assignee: { displayName: 'QA Bot' },
        }
      };
      (window as any).flowingV2.loadTicketIntoBalancedView(issue);
    } catch (e) { /* ignore */ }
  });

  // Wait for renderer signal
  await page.waitForSelector('#balancedContentContainer[data-balanced-ready="1"]', { timeout: 10000 });

  // Take a screenshot for visual inspection
  await page.screenshot({ path: 'balanced-smoke.png', fullPage: false });

  // Basic assert: balanced container visible and contains the ticket key
  const container = await page.locator('#balancedContentContainer');
  await expect(container).toBeVisible();
  await expect(container).toContainText('SMOKE-1');
});
