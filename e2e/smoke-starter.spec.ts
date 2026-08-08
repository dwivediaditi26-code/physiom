// smoke-starter.spec.ts — the simplest possible Playwright test.
// Zero setup: no Supabase, no secrets, no login. It just opens the app in a
// real browser and checks the page loaded and rendered something. Great first
// test to confirm your Playwright install works end to end.
import { test, expect } from "@playwright/test";

test("app loads and renders in a real browser", async ({ page }) => {
  // Capture real browser console output and uncaught JS errors -- #root
  // was showing up completely empty in CI with no clue why, and every
  // theory tried so far (Supabase client init, getSession() hang, jsdom
  // repro) came up clean. If something is actually throwing during
  // React's initial render, this is what will show it directly in the
  // CI log instead of needing another round of downloading artifacts.
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => pageErrors.push(err.stack || err.message));

  await page.goto("/");                       // open the app
  await expect(page).toHaveTitle(/.+/);       // it has some title (page didn't 500)

  console.log("=== BROWSER CONSOLE (so far) ===");
  console.log(consoleMessages.join("\n") || "(none)");
  console.log("=== BROWSER PAGE ERRORS (so far) ===");
  console.log(pageErrors.join("\n---\n") || "(none)");
  console.log("=== #root outerHTML at this point ===");
  console.log(await page.locator("#root").evaluate((el) => el.outerHTML).catch((e) => `(couldn't read: ${e.message})`));

  await expect(page.locator("#root")).toBeVisible(); // the React app mounted
  // take a screenshot so you can literally see what the browser saw
  await page.screenshot({ path: "e2e-screenshot.png", fullPage: true });
});
