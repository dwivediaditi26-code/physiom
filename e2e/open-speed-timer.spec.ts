import { test, expect } from '@playwright/test';
import { signUp, uniqueSuffix } from './appMap';

// A signed-in student's open is timed and reported once: only times, the connection type and a
// size band of the patient list. Checked on the request the page sends (the TEST project may not
// have the analytics table, so the request is answered locally).

test('a signed-in open is reported once, with times only', async ({ page }) => {
  test.setTimeout(90_000);
  const sent: Array<Record<string, any>> = [];
  await page.route('**/rest/v1/analytics_events*', async (route) => {
    if (route.request().method() === 'POST') {
      try { const body = route.request().postDataJSON(); sent.push(...(Array.isArray(body) ? body : [body])); } catch { /* not JSON */ }
      return route.fulfill({ status: 201, body: '' });
    }
    return route.continue();
  });
  const unique = uniqueSuffix();
  await signUp(page, { name: `E2E Timer ${unique}`, email: `e2e-timer-${unique}@physiomind-test.dev`, password: 'TestPass123!' });
  await expect.poll(() => sent.filter((e) => e.event_name === 'app_loaded').length, { timeout: 45_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  const loads = sent.filter((e) => e.event_name === 'app_loaded');
  expect(loads).toHaveLength(1);
  const p = loads[0].properties;
  expect(p.appReadyMs).toBeGreaterThan(0);
  expect(p.appReadyMs).toBeLessThan(60_000);
  expect(['0', '1-5', '6-20', '21+', 'unknown']).toContain(p.patients);
  expect(['first', 'return', 'reload']).toContain(p.visit);
  expect(typeof p.connection).toBe('string');
  expect(JSON.stringify(p)).not.toContain(unique); // no name or email in it
});
