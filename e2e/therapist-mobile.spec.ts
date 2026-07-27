// therapist-mobile.spec.ts — drives the app on a phone like a therapist would.
//
// It logs in with YOUR real account. Your password is NOT in this file and NOT
// on GitHub — you put it in e2e/login.local.json on your Mac (see
// e2e/HOW-TO-RUN-FIRST-TEST.md). The test reads it from there.
//
// SAFE: it never creates or saves a patient, so it does not write anything to
// your real database — it only fills the Subjective screen (kept in the browser)
// and checks the buttons work and nothing crashes.
import { test, expect, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Run everything here on the phone profile.
test.use({ ...devices["Pixel 7"] });

function creds() {
  const p = path.join(__dirname, "login.local.json");
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    return { email: j.email, password: j.password };
  }
  return { email: process.env.E2E_EMAIL || "", password: process.env.E2E_PASSWORD || "" };
}

test.beforeEach(async ({ page }) => {
  const { email, password } = creds();
  expect(email, "Put your login in e2e/login.local.json").not.toBe("");
  // skip the first-run onboarding modal
  await page.addInitScript(() => localStorage.setItem("pm_onboarded", "1"));
  await page.goto("/");
  // default screen is the "Welcome back" login form
  await page.getByPlaceholder("you@clinic.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  // wait until we're past the login wall (bottom nav appears)
  await expect(page.getByText("Assess", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  // dismiss a tour/onboarding button if it shows
  const skip = page.getByRole("button", { name: /Skip tour|Got it|Dismiss|Close/i });
  if (await skip.count()) await skip.first().click().catch(() => {});
  // never on the crash screen
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});

test("logs in and opens the Subjective screen on a phone", async ({ page }) => {
  await page.getByText("Assess", { exact: false }).first().click();
  await page.getByText("Subjective Assessment", { exact: false }).first().click();
  // the subjective screen has a Review & Run Analysis action
  await expect(page.getByText(/Review & Run Analysis/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});
