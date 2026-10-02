import { test, expect } from '@playwright/test';
import { enterGuestMode, noCrash } from './appMap';

// The "installed web app" messages (src/pwa/PwaBanners.jsx). Guest mode, so no
// account or database is involved.

test.describe('Web app messages @pwa', () => {
  test('"A new version is ready" appears and Refresh reloads the app', async ({ page }) => {
    await enterGuestMode(page);
    await page.evaluate(() => window.dispatchEvent(new Event('pm:update-ready')));
    const banner = page.getByText(/A new version of PhysioMind is ready/);
    await expect(banner).toBeVisible();

    // Later hides it.
    await page.getByRole('button', { name: 'Later' }).click();
    await expect(banner).toHaveCount(0);

    // Refresh reloads the page.
    await page.evaluate(() => window.dispatchEvent(new Event('pm:update-ready')));
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Refresh' }).click(),
    ]);
    await noCrash(page);
  });
});
