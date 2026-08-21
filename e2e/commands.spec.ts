// commands.spec.ts — the "command menu". Each test is tagged so you can run
// exactly the check you want by name, e.g.:
//
//   npm run test:e2e -- --grep @special        # test all special-test buttons
//   npm run test:e2e -- --grep @soap-fascia    # is fascia showing in the SOAP note?
//   npm run test:e2e -- --grep @pdf            # does the PDF show everything?
//   npm run test:e2e -- --grep @buttons        # click every button, catch crashes
//   npm run test:e2e -- --grep @modules        # every module opens & renders
//
// Region defaults to shoulder; override:  REGION=knee npm run test:e2e -- --grep @special
// See COMMANDS.md for the full menu.
//
// ⚠️ Run against a DISPOSABLE TEST Supabase project + e2e/login.local.json. Not prod.

import { test, expect } from "@playwright/test";
import {
  MODULES, REGIONS, login, startAssessment, selectRegion, runAnalysis,
  openModule, clickEveryButton, exerciseModuleInputs, fillFascia, openSoap, soapText,
  assertInSoap, exportReportText, noCrash,
} from "./appMap";

const REGION = process.env.REGION && REGIONS[process.env.REGION] ? REGIONS[process.env.REGION] : REGIONS.shoulder;

async function enterAssessment(page: any) {
  await login(page);
  await startAssessment(page);
  await selectRegion(page, REGION.group, REGION.name);
}

// ── @modules : every objective module opens and renders without crashing ──
for (const m of MODULES) {
  test(`${m.tag} @modules ${m.label} opens and renders`, async ({ page }) => {
    await enterAssessment(page);
    const opened = await openModule(page, m);
    if (!opened) {
      test.info().annotations.push({ type: "module-not-present", description: `${m.label} not offered for ${REGION.name}` });
      return;
    }
    await noCrash(page);
    // there should be at least one interactive control in the module
    const controls = await page.locator("select, input, button").count();
    expect(controls, `${m.label} rendered no controls`).toBeGreaterThan(0);
  });
}

// ── @buttons : click every button in each module, assert nothing crashes ──
for (const m of MODULES) {
  test(`${m.tag} @buttons ${m.label}: every button works (no crash)`, async ({ page }) => {
    await enterAssessment(page);
    if (!(await openModule(page, m))) { test.skip(true, `${m.label} not present for ${REGION.name}`); return; }
    const clicked = await clickEveryButton(page, { max: 50 });
    test.info().annotations.push({ type: "buttons-clicked", description: `${m.label}: ${clicked}` });
    await noCrash(page);
  });
}

// ── @special : all special tests render and accept Positive/Negative ──
test(`@special all special tests render and accept a result (${process.env.REGION || "shoulder"})`, async ({ page }) => {
  await enterAssessment(page);
  const spec = MODULES.find(x => x.key === "special")!;
  expect(await openModule(page, spec), "Special Tests module did not open").toBeTruthy();
  await noCrash(page);
  // The Special Tests module is lazy-loaded (large chunk) — wait for the first
  // test card to render before counting, instead of checking immediately.
  const cards = page.locator(".pm-test-card-hdr");
  await expect(cards.first()).toBeVisible({ timeout: 20000 });
  const cardCount = await cards.count();
  expect(cardCount, "no special-test cards found").toBeGreaterThan(0);
  test.info().annotations.push({ type: "special-test-cards", description: `${cardCount}` });
  await cards.first().click({ timeout: 3000 }).catch(() => {});
  await exerciseModuleInputs(page);
  await noCrash(page);
});

// ── @soap : the SOAP note renders all four sections ──
test("@soap SOAP note renders S / O / A / P", async ({ page }) => {
  await enterAssessment(page);
  await runAnalysis(page);
  const text = await soapText(page);
  await noCrash(page);
  expect(text).toMatch(/Subjective|^S[:\s]/im);
  expect(text).toMatch(/Objective|^O[:\s]/im);
  expect(text).toMatch(/Assessment|^A[:\s]/im);
  expect(text).toMatch(/Plan|^P[:\s]/im);
});

// ── @soap-fascia : fascia findings entered actually show up in the SOAP note ──
test("@soap-fascia fascia findings appear in the SOAP note", async ({ page }) => {
  await enterAssessment(page);
  await runAnalysis(page);
  const fascia = MODULES.find(x => x.key === "fascia")!;
  if (!(await openModule(page, fascia))) { test.skip(true, "Fascia module not present for this region"); return; }
  // FasciaNKT.jsx is custom click-chip cards, not <select>/<input> -- the
  // generic filler never touches it. Use the dedicated helper instead.
  if (!(await fillFascia(page))) { test.skip(true, "No fascia test cards found for this region"); return; }
  await noCrash(page);
  // The SOAP note must carry the ACTUAL recorded finding, not just the word
  // "fascia" from a sidebar label (which would false-pass). fillFascia()
  // deterministically opens the first test card in the default "screening"
  // region, which is always fa_skin_roll -- mapped to "Skin Rolling" by both
  // independent SOAP renderers (buildRealtimeSOAP's "Fascial Assessment:"
  // block, AND the separate SOAP Notes visual card, which uses its own
  // "FASCIA INTEGRATION" heading + the same per-field "Skin Rolling: <value>"
  // line -- these two renderers are independently maintained, see
  // allConditionsVisibility.test.jsx, so accept either screen's real output.
  await assertInSoap(page, /Fascial Assessment|Skin Rolling/i);
});

// ── @pdf : the exported report shows the patient's key content ──
test("@pdf exported report is generated and contains assessment content", async ({ page }) => {
  await enterAssessment(page);
  await runAnalysis(page);
  await exerciseModuleInputs(page);   // put some findings in
  const report = await exportReportText(page);
  if (!report) { test.skip(true, "No Export PDF button found on this screen"); return; }
  expect(report.length, "report was empty").toBeGreaterThan(50);
  // a real report should carry demographics/assessment structure
  expect(report).toMatch(/assessment|subjective|objective|physio|diagnosis|patient/i);
});

// ── @impression : a probable diagnosis / clinical impression surfaces ──
test("@impression probable diagnosis / clinical impression appears", async ({ page }) => {
  await enterAssessment(page);
  await exerciseModuleInputs(page);
  await runAnalysis(page);
  const suggest = page.getByRole("button", { name: /Suggest Probable Diagnosis|Probable Diagnosis|Clinical Impression/i }).first();
  if (await suggest.isVisible({ timeout: 4000 }).catch(() => false)) await suggest.click().catch(() => {});
  await page.waitForTimeout(1000);
  await noCrash(page);
  const body = await page.locator("body").innerText().catch(() => "");
  expect(body).toMatch(/diagnos|impression|likely|probable|differential/i);
});
