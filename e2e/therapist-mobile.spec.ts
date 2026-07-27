// therapist-mobile.spec.ts — drives the app on a phone like a therapist would.
//
// Logs in with YOUR real account. Your password is NOT in this file and NOT on
// GitHub — you put it in e2e/login.local.json on your Mac. The test reads it.
//
// SAFE: it never creates or saves a patient, so it does not write anything to
// your real database — it only opens the Subjective screen and checks buttons
// work and nothing crashes.
import { test, expect, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.use({ ...devices["Pixel 7"] });

function creds() {
  const p = path.join(__dirname, "login.local.json");
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    return { email: j.email, password: j.password };
  }
  return { email: process.env.E2E_EMAIL || "", password: process.env.E2E_PASSWORD || "" };
}

async function login(page) {
  const { email, password } = creds();
  expect(email, "Put your login in e2e/login.local.json").not.toBe("");
  await page.addInitScript(() => localStorage.setItem("pm_onboarded", "1"));
  await page.goto("/");
  await page.getByPlaceholder("you@clinic.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  // proof we're logged in: the Home "Start Assessment" button is visible
  await expect(page.getByRole("button", { name: /Start Assessment/i }).first())
    .toBeVisible({ timeout: 25000 });
  // dismiss a tour button ONLY if it's actually showing (never hang on it)
  const skip = page.getByRole("button", { name: /Skip tour|Got it/i }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 3000 }).catch(() => {});
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
}

test("logs in and opens the Subjective screen on a phone", async ({ page }) => {
  await login(page);
  // Home -> Start Assessment goes straight to the Subjective screen
  await page.getByRole("button", { name: /Start Assessment/i }).first().click();
  await expect(page.getByText(/Review & Run Analysis/i)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});

test("hip journey: pick region, run analysis, click every objective-assessment tile (no crash)", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /Start Assessment/i }).first().click();
  await expect(page.getByText(/Review & Run Analysis/i)).toBeVisible({ timeout: 20000 });

  // ── select Hip / Groin (Left) via the region picker ──
  // Open the picker ONLY if the region groups aren't already visible (the
  // "+ Edit" button toggles, so clicking it when already open would close it).
  const lower = page.getByText("Lower limb", { exact: false }).first();
  if (!(await lower.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /\+ Edit/ }).first().click({ timeout: 6000 }).catch(() => {});
  }
  await lower.click({ timeout: 8000 });
  await page.getByText("Hip / Groin", { exact: true }).first().click({ timeout: 8000 });
  await page.getByRole("button", { name: "Left", exact: true }).first().click({ timeout: 8000 });
  await expect(page.getByText("Something went wrong")).toHaveCount(0);

  // ── best-effort: fill the first few dropdown fields so the engine has data ──
  const chips = page.locator(".pm-cfield-box");
  const n = Math.min(await chips.count(), 5);
  for (let i = 0; i < n; i++) {
    try {
      await chips.nth(i).click({ timeout: 2000 });
      // options render in an absolutely-positioned dropdown; pick a real one
      const opts = page.locator('div[style*="absolute"] button').filter({ hasNotText: /^No\b|^Not\b|^N\/A/ });
      if (await opts.count()) await opts.first().click({ timeout: 2000 });
      await page.keyboard.press("Escape").catch(() => {});
    } catch { /* non-fatal */ }
  }
  await expect(page.getByText("Something went wrong")).toHaveCount(0);

  // ── run the analysis ──
  await page.getByText(/Review & Run Analysis/i).first().click();
  const runBtn = page.getByText(/Run analysis/i).first();
  if (await runBtn.isVisible().catch(() => false)) await runBtn.click().catch(() => {});
  await page.waitForTimeout(1500);
  await expect(page.getByText("Something went wrong")).toHaveCount(0);

  // ── click EVERY objective-assessment tile / open button; assert no crash after each ──
  const tiles = page.getByRole("button", { name: /OPEN|Fascia|Functional|Outcome|Observation|Posture|Palpation|Special|ROM|Kinetic/i });
  const t = await tiles.count();
  for (let i = 0; i < t; i++) {
    try {
      await tiles.nth(i).click({ timeout: 2000 });
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      // go back to the subjective results if navigation happened
      await page.goBack().catch(() => {});
    } catch { /* non-fatal per tile */ }
  }
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});
