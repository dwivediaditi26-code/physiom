// therapist-mobile.spec.ts — drives the app on a phone like a therapist would.
// Selectors were captured from a real recording (npx playwright codegen).
//
// Logs in with YOUR real account. Your password is NOT in this file and NOT on
// GitHub — put it in e2e/login.local.json on your Mac. SAFE: never saves a
// patient, so it writes nothing to your real database.
import { test, expect, devices, Page } from "@playwright/test";
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

const noCrash = async (page: Page) =>
  expect(page.getByText("Something went wrong")).toHaveCount(0);

async function login(page: Page) {
  const { email, password } = creds();
  expect(email, "Put your login in e2e/login.local.json").not.toBe("");
  await page.addInitScript(() => localStorage.setItem("pm_onboarded", "1"));
  await page.goto("/");
  await page.getByRole("textbox", { name: "you@clinic.com" }).fill(email);
  await page.getByRole("textbox", { name: "••••••••" }).fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  const skip = page.getByRole("button", { name: /Skip tour|Got it/i }).first();
  if (await skip.isVisible({ timeout: 8000 }).catch(() => false)) await skip.click().catch(() => {});
  await expect(page.getByRole("button", { name: /Start Assessment/i }).first())
    .toBeVisible({ timeout: 25000 });
  await noCrash(page);
}

// Log in, open Subjective, select Hip (R), fill a few fields, run the analysis.
async function openHipAnalysis(page: Page) {
  await login(page);
  await page.getByRole("button", { name: /Start Assessment/i }).first().click();
  await expect(page.getByText(/Review & Run Analysis/i)).toBeVisible({ timeout: 20000 });

  // select Hip / Groin (Right) if not already selected
  if (!(await page.getByText("Hip/Groin (R)").first().isVisible().catch(() => false))) {
    if (!(await page.getByText("Lower limb").first().isVisible().catch(() => false))) {
      await page.getByRole("button", { name: /\+ Add body region|\+ Edit/ }).first()
        .click({ timeout: 8000 }).catch(() => {});
    }
    await page.getByText("Lower limb").first().click({ timeout: 8000 });
    await page.getByText("Hip / Groin").first().click({ timeout: 8000 });
    await page.getByRole("button", { name: "Right", exact: true }).first().click({ timeout: 8000 });
    await page.getByRole("button", { name: "▲" }).first().click({ timeout: 5000 }).catch(() => {});
  }

  // best-effort: fill a few fields so the engine produces differentials
  const pick = async (sectionId: string, option: string) => {
    try {
      await page.locator(`#subj-sec-${sectionId} .pm-cfield-box`).first().click({ timeout: 4000 });
      await page.getByRole("button", { name: option }).first().click({ timeout: 4000 });
    } catch { /* non-fatal */ }
  };
  await pick("hp_location", "Posterior hip — deep gluteal");
  await pick("hp_mechanism", "Insidious onset — gradual");
  await pick("hp_aggravating", "Sitting — low chairs");
  await noCrash(page);

  await page.getByRole("button", { name: /Review & Run Analysis/i }).click();
  const run = page.getByRole("button", { name: /Run analysis/i });
  if (await run.isVisible({ timeout: 8000 }).catch(() => false)) await run.click();
  await page.waitForTimeout(1500);
  await noCrash(page);
}

test("logs in and opens the Subjective screen on a phone", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /Start Assessment/i }).first().click();
  await expect(page.getByText(/Review & Run Analysis/i)).toBeVisible({ timeout: 20000 });
  await noCrash(page);
});

// The reported crash: clicking these objective-assessment tiles used to throw
// "Something went wrong". One test per tile so a navigation doesn't hide others.
for (const tile of [/Functional \(FMA\)/, /Fascia/, /Outcome/]) {
  test(`objective-assessment tile ${tile.source} opens without crashing`, async ({ page }) => {
    await openHipAnalysis(page);
    const btn = page.getByRole("button", { name: tile }).first();
    if (await btn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(800);
    }
    await noCrash(page);
  });
}
