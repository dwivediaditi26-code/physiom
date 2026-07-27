// smoke-starter.spec.ts — the simplest possible Playwright test.
// Zero setup: no Supabase, no secrets, no login. It just opens the app in a
// real browser and checks the page loaded and rendered something. Great first
// test to confirm your Playwright install works end to end.
import { test, expect } from "@playwright/test";

test("app loads and renders in a real browser", async ({ page }) => {
  await page.goto("/");                       // open the app
  await expect(page).toHaveTitle(/.+/);       // it has some title (page didn't 500)
  await expect(page.locator("#root")).toBeVisible(); // the React app mounted
  // take a screenshot so you can literally see what the browser saw
  await page.screenshot({ path: "e2e-screenshot.png", fullPage: true });
});
