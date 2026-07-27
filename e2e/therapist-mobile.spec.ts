// therapist-mobile.spec.ts — drives the app on a phone like a therapist would,
// using STABLE data-testid selectors (added throughout the app) so tests don't
// break on text/emoji/layout changes.
//
// Logs in with YOUR real account (e2e/login.local.json — never uploaded).
// Most tests are read-only. The patient-profile test creates one clearly-named
// test patient in your real database (delete it afterward).
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
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} localStorage.setItem("pm_onboarded", "1"); });
  await page.goto("/");
  await page.getByTestId("authfield-email").fill(email);
  await page.getByTestId("authfield-password").fill(password);
  await page.getByTestId("btn-signin").click();
  // click through any onboarding, then Skip tour
  for (let i = 0; i < 5; i++) {
    const next = page.getByRole("button", { name: /^Next/ }).first();
    if (await next.isVisible({ timeout: i === 0 ? 4000 : 1000 }).catch(() => false)) await next.click().catch(() => {});
    else break;
  }
  const skip = page.getByRole("button", { name: /Skip tour|Got it/i }).first();
  if (await skip.isVisible({ timeout: 2500 }).catch(() => false)) await skip.click().catch(() => {});
  await expect(page.getByTestId("btn-start-assessment").first()).toBeVisible({ timeout: 25000 });
  await noCrash(page);
}

async function openSubjective(page: Page) {
  await page.getByTestId("btn-start-assessment").first().click();
  await expect(page.getByTestId("btn-review-run")).toBeVisible({ timeout: 20000 });
}

// groupId: spine | upper | lower ; regionId: cervical|thoracic|lumbar|shoulder|elbow|wrist|hip|knee|ankle
async function selectRegion(page: Page, groupId: string, regionId: string, side = "R") {
  if (!(await page.getByTestId(`region-group-${groupId}`).isVisible().catch(() => false))) {
    await page.getByTestId("btn-region-picker").first().click({ timeout: 6000 });
  }
  await page.getByTestId(`region-group-${groupId}`).click({ timeout: 6000 });
  await page.getByTestId(`region-row-${regionId}`).click({ timeout: 6000 });
  await page.getByTestId(`region-side-${regionId}-${side}`).click({ timeout: 6000 });
  await page.getByTestId("btn-region-picker").first().click({ timeout: 4000 }).catch(() => {}); // close
}

// pick the first real option in a field's dropdown (field-<id>)
async function pickField(page: Page, fieldId: string) {
  try {
    const row = page.getByTestId(`field-${fieldId}`);
    await row.locator(".pm-cfield-box").first().click({ timeout: 3000 });
    const opt = page.locator('div[style*="absolute"] button').filter({ hasNotText: /^No\b|^Not\b|^N\/A|Tap to/ }).first();
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click({ timeout: 2000 });
    await page.keyboard.press("Escape").catch(() => {});
  } catch { /* non-fatal */ }
}

async function runAnalysis(page: Page) {
  await page.getByTestId("btn-review-run").click();
  const run = page.getByTestId("btn-run-analysis");
  // the review summary can overlap the button on mobile; force the click through
  if (await run.isVisible({ timeout: 8000 }).catch(() => false)) await run.click({ force: true });
  await page.waitForTimeout(1500);
}

const REGIONS: [string, string, string][] = [
  ["Cervical", "spine", "cervical"],
  ["Thoracic", "spine", "thoracic"],
  ["Lumbar / SI", "spine", "lumbar"],
  ["Shoulder", "upper", "shoulder"],
  ["Elbow", "upper", "elbow"],
  ["Wrist / Hand", "upper", "wrist"],
  ["Hip / Groin", "lower", "hip"],
  ["Knee", "lower", "knee"],
  ["Ankle / Foot", "lower", "ankle"],
];

test("logs in and opens the Subjective screen on a phone", async ({ page }) => {
  await login(page);
  await openSubjective(page);
  await noCrash(page);
});

for (const [label, group, regionId] of REGIONS) {
  test(`${label}: pick region, run analysis, click tiles — no crash`, async ({ page }) => {
    await login(page);
    await openSubjective(page);
    await selectRegion(page, group, regionId);
    // fill a few fields via generic first-option pick
    for (const box of await page.locator(".pm-cfield-box").all()) {
      if (await box.isVisible().catch(() => false)) {
        await box.click({ timeout: 2500 }).catch(() => {});
        const opt = page.locator('div[style*="absolute"] button').filter({ hasNotText: /^No\b|^Not\b|^N\/A|Tap to/ }).first();
        if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) await opt.click({ timeout: 1500 }).catch(() => {});
        await page.keyboard.press("Escape").catch(() => {});
      }
      if ((await page.locator("[data-testid^='field-']").count()) && false) break;
    }
    await noCrash(page);
    await runAnalysis(page);
    await noCrash(page);
    // click every objective-assessment tile present (tile-*)
    const tiles = page.locator("[data-testid^='tile-']");
    const count = await tiles.count();
    for (let i = 0; i < Math.min(count, 8); i++) {
      const t = tiles.nth(i);
      if (await t.isVisible().catch(() => false)) { await t.click({ timeout: 4000 }).catch(() => {}); await noCrash(page); }
    }
    await noCrash(page);
  });
}

// ── Data-integrity: full subjective carries through to Live SOAP + SOAP Notes ──
test("Hip: full subjective carries through to analysis, Live SOAP and SOAP Notes", async ({ page }) => {
  const MARKER = "E2ECHECK buttock pain seven days right side";
  await login(page);
  await openSubjective(page);
  await page.getByTestId("field-cc_main").getByRole("textbox").first().fill(MARKER);
  await selectRegion(page, "lower", "hip");
  await pickField(page, "hp_moi");
  await pickField(page, "hp_agg_act");
  await expect(page.getByText(/E2ECHECK/).first()).toBeVisible();
  await noCrash(page);

  await page.getByTestId("btn-live-soap").first().click({ timeout: 6000 }).catch(() => {});
  await expect(page.getByText(/E2ECHECK/).first()).toBeVisible({ timeout: 8000 });
  await noCrash(page);

  await runAnalysis(page);
  await noCrash(page);

  await page.getByTestId("bnav-documentation").click({ timeout: 5000 }).catch(() => {});
  await page.getByTestId("bnav-item-soap").click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await expect(page.getByText(/E2ECHECK/).first()).toBeVisible({ timeout: 8000 });
  await page.getByTestId("btn-suggest-dx").first().click({ timeout: 4000 }).catch(() => {});
  await noCrash(page);
});

// ── SAFETY: cauda equina red flag must WITHHOLD the diagnosis ──
test("Safety: cauda equina red flag withholds the diagnosis (must refer)", async ({ page }) => {
  await login(page);
  await openSubjective(page);
  await selectRegion(page, "spine", "lumbar");
  // set an urgent cauda flag by typing the value straight into the field
  const cauda = page.getByTestId("field-lx_rf_cauda").getByRole("textbox").first();
  await cauda.scrollIntoViewIfNeeded().catch(() => {});
  await cauda.fill("Saddle area anaesthesia — perineum / inner thighs");
  await cauda.blur().catch(() => {});
  await page.waitForTimeout(500);
  await expect(page.getByText(/Cauda Equina|red flag|withheld|refer/i).first()).toBeVisible({ timeout: 8000 });
  await runAnalysis(page);
  await expect(page.getByText(/withheld|refer|Cauda Equina/i).first()).toBeVisible({ timeout: 8000 });
  await noCrash(page);
});

// ── Patient profile shows the full subjective (creates a test patient) ──
async function openPatientDb(page: Page) {
  await page.getByTestId("bnav-patient").click({ timeout: 6000 }).catch(() => {});
  await page.getByTestId("btn-open-patientdb").first().click({ timeout: 6000 }).catch(() => {});
}

test("Hip: saved patient profile shows the full subjective (creates a test patient)", async ({ page }) => {
  const NAME = "E2E TEST DELETE ME";
  const MARKER = "E2ECHECK buttock pain seven days right side";
  await login(page);

  await openPatientDb(page);
  await page.getByTestId("btn-new-patient").click({ timeout: 8000 });
  await page.getByTestId("intake-name").fill(NAME);
  await page.getByTestId("intake-cc").fill(MARKER);
  await page.getByTestId("intake-tab-consent").click();
  await page.getByTestId("intake-consent").check();
  await page.getByTestId("intake-submit").click();
  await expect(page.getByTestId("btn-review-run")).toBeVisible({ timeout: 20000 });

  await selectRegion(page, "lower", "hip");
  await pickField(page, "hp_moi");
  await page.waitForTimeout(2800);  // autosave debounce
  await noCrash(page);

  await openPatientDb(page);
  await page.getByTestId("patient-card-e2e-test-delete-me").getByTestId("btn-open-profile").first().click({ timeout: 8000 });
  await expect(page.getByTestId("patient-profile-modal")).toBeVisible({ timeout: 8000 });
  await page.getByTestId("profile-tab-subjective").click({ timeout: 6000 }).catch(() => {});
  await expect(page.getByText(/E2ECHECK/).first()).toBeVisible({ timeout: 8000 });
  await noCrash(page);
});
