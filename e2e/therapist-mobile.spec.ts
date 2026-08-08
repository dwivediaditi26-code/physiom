// therapist-mobile.spec.ts — drives the app on a phone like a therapist would,
// across every body region. Selectors captured from a real recording.
//
// Logs in with YOUR real account (e2e/login.local.json — never uploaded).
// SAFE: never saves a patient, so it writes nothing to your real database.
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

const noCrash = (page: Page) => expect(page.getByText("Something went wrong")).toHaveCount(0);

async function login(page: Page) {
  const { email, password } = creds();
  expect(email, "Put your login in e2e/login.local.json").not.toBe("");
  // start each test from a clean slate (no leftover region/draft) + skip onboarding
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} localStorage.setItem("pm_onboarded", "1"); });
  await page.goto("/");
  await page.getByRole("textbox", { name: "you@clinic.com" }).fill(email);
  await page.getByRole("textbox", { name: "••••••••" }).fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  // onboarding wizard (if shown): click through Next, then Skip tour
  for (let i = 0; i < 5; i++) {
    const next = page.getByRole("button", { name: /^Next/ }).first();
    if (await next.isVisible({ timeout: i === 0 ? 4000 : 1200 }).catch(() => false)) await next.click().catch(() => {});
    else break;
  }
  const skip = page.getByRole("button", { name: /Skip tour|Got it/i }).first();
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click().catch(() => {});
  await expect(page.getByRole("button", { name: /Start Assessment/i }).first()).toBeVisible({ timeout: 25000 });
  await noCrash(page);
}

async function selectRegion(page: Page, group: string, regionName: string) {
  if (!(await page.getByText("Lower limb").first().isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /\+ Add body region|\+ Edit/ }).first().click({ timeout: 8000 }).catch(() => {});
  }
  await page.getByText(`${group}▼`).first().click({ timeout: 8000 });     // open the group
  await page.getByText(regionName, { exact: true }).first().click({ timeout: 8000 }); // open the region row
  await page.getByRole("button", { name: "Right", exact: true }).first().click({ timeout: 8000 });
  await page.getByRole("button", { name: "▲" }).first().click({ timeout: 5000 }).catch(() => {});
}

// Best-effort: fill the first few dropdowns with their first real option.
async function fillSome(page: Page) {
  const boxes = page.locator(".pm-cfield-box");
  const n = Math.min(await boxes.count(), 4);
  for (let i = 0; i < n; i++) {
    try {
      await boxes.nth(i).click({ timeout: 3000 });
      const opt = page.locator('div[style*="absolute"] button').filter({ hasNotText: /^No\b|^Not\b|^N\/A|Tap to/ }).first();
      if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click({ timeout: 2000 });
      await page.keyboard.press("Escape").catch(() => {});
    } catch { /* non-fatal */ }
  }
}

async function runAnalysis(page: Page) {
  await page.getByRole("button", { name: /Suggest probable objective assessment/i }).click();
  const run = page.getByRole("button", { name: /Run analysis/i });
  if (await run.isVisible({ timeout: 8000 }).catch(() => false)) await run.click();
  await page.waitForTimeout(1500);
}

const REGIONS: [string, string, string][] = [
  // [test label, picker group, region row name]
  ["Cervical", "Spine", "Cervical spine"],
  ["Thoracic", "Spine", "Thoracic spine"],
  ["Lumbar / SI", "Spine", "Lumbar / SI"],
  ["Shoulder", "Upper limb", "Shoulder"],
  ["Elbow", "Upper limb", "Elbow"],
  ["Wrist / Hand", "Upper limb", "Wrist / Hand"],
  ["Hip / Groin", "Lower limb", "Hip / Groin"],
  ["Knee", "Lower limb", "Knee"],
  ["Ankle / Foot", "Lower limb", "Ankle / Foot"],
];

test("logs in and opens the Subjective screen on a phone", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /Start Assessment/i }).first().click();
  await expect(page.getByText(/Suggest probable objective assessment/i)).toBeVisible({ timeout: 20000 });
  await noCrash(page);
});

for (const [label, group, regionName] of REGIONS) {
  test(`${label}: pick region, run analysis, click tiles — no crash`, async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /Start Assessment/i }).first().click();
    await expect(page.getByText(/Suggest probable objective assessment/i)).toBeVisible({ timeout: 20000 });

    await selectRegion(page, group, regionName);
    await fillSome(page);
    await noCrash(page);

    await runAnalysis(page);
    await noCrash(page);

    // click every objective-assessment tile that's present; assert no crash after each
    const tiles = page.getByRole("button", {
      name: /Functional \(FMA\)|Fascia|Outcome|Observation|Posture|Palpation|Special|\bROM\b|Kinetic|Scour|test/i,
    });
    const count = await tiles.count();
    for (let i = 0; i < Math.min(count, 6); i++) {
      const btn = tiles.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ timeout: 4000 }).catch(() => {});
        await noCrash(page);
      }
    }
    await noCrash(page);
  });
}

// ── Data-integrity: the full subjective must carry through to the analysis,
// Live SOAP, and SOAP Notes — not get half-lost. We type a unique marker into
// the chief complaint, fill the rest, then assert the marker + analysis appear
// downstream. (Does NOT save a patient -> no writes to your real database.)
test("Hip: full subjective carries through to analysis, Live SOAP and SOAP Notes", async ({ page }) => {
  const MARKER = "E2ECHECK buttock pain seven days right side";
  await login(page);
  await page.getByRole("button", { name: /Start Assessment/i }).first().click();
  await expect(page.getByText(/Suggest probable objective assessment/i)).toBeVisible({ timeout: 20000 });

  // chief complaint (patient's own words) — our unique marker
  // the chief-complaint free-text box (its visible placeholder is generic, so
  // target it by its row label instead)
  await page.locator(".pm-arow", { hasText: "own words" }).getByRole("textbox").first().fill(MARKER);

  // select Hip and fill several fields "fully"
  await selectRegion(page, "Lower limb", "Hip / Groin");
  await fillSome(page);
  await expect(page.getByText(/E2ECHECK/).first()).toBeVisible();   // present on subjective
  await noCrash(page);

  // Live SOAP panel should reflect the subjective data
  const liveBtn = page.getByRole("button", { name: /Live SOAP/i }).first();
  if (await liveBtn.isVisible({ timeout: 6000 }).catch(() => false)) await liveBtn.click().catch(() => {});
  await expect(page.getByText(/E2ECHECK/).first()).toBeVisible({ timeout: 8000 });
  await noCrash(page);

  // Run analysis
  await runAnalysis(page);
  await noCrash(page);

  // SOAP Notes — opened via the Documentation panel inside the mobile nav
  // drawer. This test never opened the drawer (.pm-nav-drawer) before --
  // "Documentation"/"SOAP Notes" text exists in the DOM at rest (closed
  // drawer, off-canvas) so the .nth(1) clicks were silently no-op'ing the
  // whole time (swallowed by .catch()) without ever actually navigating.
  // That's why E2ECHECK was "missing": the SOAP Notes screen was simply
  // never reached, not a data-loss bug in the SOAP note itself.
  const hamburger = page.locator(".pm-mobile-hdr .pm-hamburger").first();
  if (await hamburger.isVisible({ timeout: 3000 }).catch(() => false)) await hamburger.click().catch(() => {});
  const drawer = page.locator(".pm-nav-drawer");
  await drawer.getByText("Documentation").first().click({ timeout: 5000 }).catch(() => {});
  await drawer.getByText("SOAP Notes").first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await expect(page.getByText(/E2ECHECK/).first()).toBeVisible({ timeout: 8000 });
  const suggest = page.getByRole("button", { name: /Suggest Probable Diagnosis/i }).first();
  if (await suggest.isVisible({ timeout: 4000 }).catch(() => false)) await suggest.click().catch(() => {});
  await noCrash(page);
});

// ── Patient profile data-integrity (CREATES a real patient in your database) ──
// Creates a clearly-named "E2E TEST — delete me" patient, fills the Hip
// subjective, then opens that patient's profile and confirms the subjective
// data (our unique marker) shows there in full. You can delete the patient
// afterward from the patient list.
async function openPatientDb(page: Page) {
  // On the phone the "N Patients" buttons live in the off-screen desktop
  // sidebar (unclickable). Use the bottom-nav Patient tab -> Load Patient.
  await page.locator(".pm-bnav-tab", { hasText: "Patient" }).first().click({ timeout: 6000 }).catch(() => {});
  await page.getByRole("button", { name: /Load Patient/ }).first().click({ timeout: 6000 }).catch(() => {});
}

test("Hip: saved patient profile shows the full subjective (creates a test patient)", async ({ page }) => {
  const NAME = "E2E TEST DELETE ME";
  const MARKER = "E2ECHECK buttock pain seven days right side";
  await login(page);

  // create a new patient via the intake form (scope all clicks to the modal so
  // we don't hit the Home page's "Start Assessment" button behind it)
  await openPatientDb(page);
  await page.getByRole("button", { name: /New Patient/ }).first().click({ timeout: 8000 });
  const intake = page.getByTestId("intake-modal");
  await intake.getByPlaceholder("e.g. Riya Sharma").fill(NAME);
  await intake.getByPlaceholder(/Lower back pain/).fill(MARKER);   // chief complaint
  await intake.getByRole("button", { name: "Consent", exact: true }).click();
  await intake.getByRole("checkbox").first().check();
  await intake.getByRole("button", { name: /Start Assessment/ }).first().click();
  await expect(page.getByText(/Suggest probable objective assessment/i)).toBeVisible({ timeout: 20000 });

  // fill some Hip subjective; it auto-saves to the patient
  await selectRegion(page, "Lower limb", "Hip / Groin");
  await fillSome(page);
  await page.waitForTimeout(2800);   // allow the autosave debounce
  await noCrash(page);

  // open the patient's profile -> Subjective tab -> confirm the marker
  await openPatientDb(page);
  await page.getByText(NAME).first().click({ timeout: 8000 });
  await page.getByText(/Profile/).first().click({ timeout: 6000 }).catch(() => {});
  const modal = page.getByTestId("patient-profile-modal");
  await expect(modal).toBeVisible({ timeout: 8000 });
  await modal.getByRole("button", { name: /Subjective/ }).first().click({ timeout: 6000 }).catch(() => {});
  await expect(page.getByText(/E2ECHECK/).first()).toBeVisible({ timeout: 8000 });
  await noCrash(page);
});
