import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';

test('balanced smoke opens balanced view and SLA prediction', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Try to find the card action (top-right) or issuedetailsbutton
  const trigger = page.locator('.issuedetailsbutton, .card-action-btn, .card-action');
  await expect(trigger.first()).toBeVisible({ timeout: 8000 });

  await trigger.first().click();

  // Wait for the balanced content container to signal readiness
  await page.waitForSelector('#balancedContentContainer[data-balanced-ready="1"]', { timeout: 10000 });

  // Register a global flag for SLA prediction event
  await page.evaluate(() => {
    (window as any).__sla_prediction_received = false;
    window.addEventListener('sla:prediction', () => { (window as any).__sla_prediction_received = true; });
  });

  const slaLocator = page.locator('#slaMonitorContainer');
  await expect(slaLocator).toBeVisible({ timeout: 8000 });

  // Wait until SLA monitor updates or event fired
  const ok = await page.waitForFunction(() => {
    const el = document.querySelector('#slaMonitorContainer');
    if (!el) return false;
    const txt = (el.textContent || '').trim();
    if ((window as any).__sla_prediction_received) return true;
    if (!/loading\s*sla/i.test(txt) && txt.length > 0) return true;
    return false;
  }, null, { timeout: 10000 });

  // Capture a screenshot for visual review
  await page.screenshot({ path: 'balanced-smoke.png', fullPage: false });

  expect(ok).toBeTruthy();
});
