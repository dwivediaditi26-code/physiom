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
